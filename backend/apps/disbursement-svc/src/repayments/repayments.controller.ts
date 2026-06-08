import { Controller, Logger, Get, Post, Body, BadRequestException } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { RepaymentsService } from './repayments.service';
import { QUEUE_REPAYMENTS, RepaymentPostedEvent } from '@backend/events';
import { Public } from '@bdoea-fs/auth';

@Controller('repayments')
export class RepaymentsController {
  private readonly logger = new Logger(RepaymentsController.name);

  constructor(private readonly repaymentsService: RepaymentsService) {}

  // ─── HTTP Endpoints ───────────────────────────────────────────────────────

  @Get()
  @Public()
  findAll() {
    return this.repaymentsService.findAll();
  }

  @Public()
  @Post('webhook')
  async simulateWebhook(@Body() data: any) {
    this.logger.log(`Received HTTP webhook simulation for repayment: ${data?.loanReference}`);
    try {
      await this.repaymentsService.processRepayment(data);
      return { success: true, message: 'Webhook processed successfully' };
    } catch (err) {
      this.logger.error(`Webhook error: ${err.message}`);
      throw new BadRequestException(err.message);
    }
  }

  // ─── RabbitMQ Consumer ───────────────────────────────────────────────────

  @MessagePattern(QUEUE_REPAYMENTS)
  async handleRepaymentPosted(
    @Payload() data: RepaymentPostedEvent,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      this.logger.log(
        `Received repayment event for loan: ${data?.loanReference || 'unknown'}`,
      );
      await this.repaymentsService.processRepayment(data);
      channel.ack(originalMsg);
      this.logger.log(`Successfully processed repayment for loan ${data.loanReference}`);
    } catch (error) {
      this.logger.error(
        `Failed to process repayment event [ref: ${data?.loanReference}]: ${error.message}`,
        error.stack,
      );
      channel.nack(originalMsg, false, false);
    }
  }
}
