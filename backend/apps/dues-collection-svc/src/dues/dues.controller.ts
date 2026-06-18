import { Controller, Logger, Get, Query, Patch, Param, Post, Body, BadRequestException } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { DuesService } from './dues.service';
import { QUEUE_DUES, DuesPayrollConfirmedEvent } from '@backend/events';
import { Public } from '@bdoea-fs/auth';

@Controller('dues')
export class DuesController {
  private readonly logger = new Logger(DuesController.name);

  constructor(private readonly duesService: DuesService) {}

  @Get()
  @Public()
  findAll(@Query('status') status?: string) {
    return this.duesService.findAll(status);
  }



  @Patch(':id/confirm')
  @Public()
  confirmDues(@Param('id') id: string) {
    return this.duesService.confirmDues(id);
  }

  @Post()
  @Public()
  createCollection(@Body() payload: any) {
    return this.duesService.createCollection(payload);
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
