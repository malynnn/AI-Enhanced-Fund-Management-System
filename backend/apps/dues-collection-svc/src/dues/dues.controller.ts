import { Controller, Logger, Get, Query, Patch, Param, Post, Body, BadRequestException } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { DuesService } from './dues.service';
import { QUEUE_DUES, DuesPayrollConfirmedEvent } from '@backend/events';
import { Roles, Public } from '@bdoea-fs/auth';

@Controller('dues')
export class DuesController {
  private readonly logger = new Logger(DuesController.name);

  constructor(private readonly duesService: DuesService) {}

  @Get()
  @Roles('Treasurer', 'Admin')
  findAll(@Query('status') status?: string) {
    return this.duesService.findAll(status);
  }

  @Public()
  @Post('webhook')
  async simulateWebhook(@Body() data: any) {
    this.logger.log(`Received HTTP webhook simulation for ${data?.transactionId}`);
    try {
      await this.duesService.processDuesEvent(data);
      return { status: 'success', message: 'Webhook processed successfully' };
    } catch (err) {
      this.logger.error(`Webhook error: ${err.message}`);
      throw new BadRequestException(err.message);
    }
  }

  @Patch(':id/confirm')
  @Roles('Treasurer', 'Admin')
  confirmDues(@Param('id') id: string) {
    return this.duesService.confirmDues(id);
  }

  @MessagePattern(QUEUE_DUES)
  @MessagePattern('ms.dues.payroll_confirmed')
  async handleDuesEvent(@Payload() data: DuesPayrollConfirmedEvent, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      this.logger.log(`Received dues event for transaction ${data?.transactionId || 'unknown'}`);
      await this.duesService.processDuesEvent(data);
      channel.ack(originalMsg);
    } catch (error) {
      this.logger.error(`Error processing dues event: ${error.message}`);
      // Requeue = false -> routes to DLQ
      channel.nack(originalMsg, false, false);
    }
  }
}
