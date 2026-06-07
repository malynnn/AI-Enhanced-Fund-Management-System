import { Controller, Logger, Get, Post, Param, Body } from '@nestjs/common';
import { Ctx, MessagePattern, Payload, RmqContext } from '@nestjs/microservices';
import { DisbursementsService } from './disbursements.service';
import { QUEUE_DISBURSEMENTS, LoanApprovedEvent } from '@backend/events';
import { Roles } from '@bdoea-fs/auth';

@Controller('disbursements')
export class DisbursementsController {
  private readonly logger = new Logger(DisbursementsController.name);

  constructor(private readonly disbursementsService: DisbursementsService) {}

  // ─── HTTP Endpoints ───────────────────────────────────────────────────────

  @Get()
  @Roles('Treasurer', 'Admin')
  findAll() {
    return this.disbursementsService.findAll();
  }

  @Post(':id/confirm')
  @Roles('Treasurer', 'Admin')
  confirm(@Param('id') id: string, @Body('authorizedBy') authorizedBy: string) {
    return this.disbursementsService.confirmDisbursement(id, authorizedBy);
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
