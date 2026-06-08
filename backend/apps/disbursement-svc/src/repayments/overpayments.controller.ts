import { Controller, Get, Put, Body, Logger } from '@nestjs/common';
import { RepaymentsService } from './repayments.service';
import { Public } from '@bdoea-fs/auth';

@Controller('loans/overpayments')
export class OverpaymentsController {
  private readonly logger = new Logger(OverpaymentsController.name);

  constructor(private readonly repaymentsService: RepaymentsService) {}

  @Get()
  @Public()
  findOverpayments() {
    return this.repaymentsService.findOverpayments();
  }

  @Put()
  @Roles('Treasurer')
  resolveOverpayment(
    @Body('repaymentId') repaymentId: string,
    @Body('decision') decision: 'ADVANCE_CREDIT' | 'REFUND',
    @Body('authorizedBy') authorizedBy: string,
  ) {
    return this.repaymentsService.resolveOverpayment(repaymentId, decision, authorizedBy);
  }
}
