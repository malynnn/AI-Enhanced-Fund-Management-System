import { Controller, Logger, Get, Post, Param, Body, BadRequestException } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { DisbursementsService } from './disbursements.service';
import { QUEUE_DISBURSEMENTS, LoanApprovedEvent } from '@backend/events';
import { Public } from '@bdoea-fs/auth';

@Controller('disbursements')
export class DisbursementsController {
  private readonly logger = new Logger(DisbursementsController.name);

  constructor(private readonly disbursementsService: DisbursementsService) {}

  // ─── HTTP Endpoints ───────────────────────────────────────────────────────

  @Get()
  @Public()
  findAll() {
    return this.disbursementsService.findAll();
  }

  @Post(':id/confirm')
  @Public()
  confirm(@Param('id') id: string, @Body('authorizedBy') authorizedBy: string) {
    return this.disbursementsService.confirmDisbursement(id, authorizedBy);
  }

  @Post(':id/reject')
  @Public()
  reject(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Body('authorizedBy') authorizedBy: string,
  ) {
    return this.disbursementsService.rejectDisbursement(id, reason, authorizedBy);
  }



  // ─── RabbitMQ Consumer ───────────────────────────────────────────────────

  @MessagePattern(QUEUE_DISBURSEMENTS)
  async handleLoanApproved(
    @Payload() data: LoanApprovedEvent,
    @Ctx() context: RmqContext,
  ) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      this.logger.log(
        `Received loan approved event for reference: ${data?.loanReference || 'unknown'}`,
      );
      await this.disbursementsService.processLoanApproved(data);
      channel.ack(originalMsg);
      this.logger.log(`Successfully processed disbursement for loan ${data.loanReference}`);
    } catch (error) {
      this.logger.error(
        `Failed to process loan approved event [ref: ${data?.loanReference}]: ${error.message}`,
        error.stack,
      );
      channel.nack(originalMsg, false, false);
    }
  }
}
