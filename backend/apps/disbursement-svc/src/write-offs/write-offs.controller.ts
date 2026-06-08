import { Controller, Get, Post, Put, Body, Param, Logger } from '@nestjs/common';
import { WriteOffsService } from './write-offs.service';
import { Public } from '@bdoea-fs/auth';

@Controller('loans/write-offs')
export class WriteOffsController {
  private readonly logger = new Logger(WriteOffsController.name);

  constructor(private readonly writeOffsService: WriteOffsService) {}

  @Get()
  @Public()
  findAll() {
    return this.writeOffsService.findAll();
  }

  @Post()
  @Roles('Treasurer')
  createRequest(
    @Body('loanReference') loanReference: string,
    @Body('memberId') memberId: string,
    @Body('memberName') memberName: string,
    @Body('amount') amount: number,
    @Body('reason') reason: string,
    @Body('requestedBy') requestedBy: string,
  ) {
    return this.writeOffsService.createWriteOffRequest({
      loanReference,
      memberId,
      memberName,
      amount,
      reason,
      requestedBy,
    });
  }

  @Put()
  @Roles('Treasurer')
  approveOrReject(
    @Body('loanReference') loanReference: string,
    @Body('decision') decision: 'APPROVED' | 'REJECTED',
    @Body('authorizedBy') authorizedBy: string,
  ) {
    return this.writeOffsService.approveOrRejectWriteOff(loanReference, decision, authorizedBy);
  }
}
