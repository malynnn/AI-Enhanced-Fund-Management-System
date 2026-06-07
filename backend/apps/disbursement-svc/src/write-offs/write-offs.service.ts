import { Injectable, Logger, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ClientProxy } from '@nestjs/microservices';

const LOAN_FUND_CODE = 'LOAN_BDOEA';
const LOAN_FUND_FALLBACK = 'LN';

@Injectable()
export class WriteOffsService {
  private readonly logger = new Logger(WriteOffsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('LAS_CLIENT') private readonly lasClient: ClientProxy,
  ) {}

  async findAll() {
    return this.prisma.loanWriteOff.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async createWriteOffRequest(data: {
    loanReference: string;
    memberId: string;
    memberName: string;
    amount: number;
    reason: string;
    requestedBy: string;
  }) {
    // Basic validation
    if (!data.loanReference || !data.amount || !data.reason) {
      throw new BadRequestException('Missing required fields for write-off request');
    }

    const existing = await this.prisma.loanWriteOff.findUnique({
      where: { loanReference: data.loanReference },
    });

    if (existing) {
      throw new BadRequestException(`A write-off request for loan ${data.loanReference} already exists`);
    }

    const request = await this.prisma.loanWriteOff.create({
      data: {
        loanReference: data.loanReference,
        memberId: data.memberId,
        memberName: data.memberName,
        amount: data.amount,
        reason: data.reason,
        requestedBy: data.requestedBy,
        status: 'PENDING',
      },
    });

    this.logger.log(`Created PENDING write-off request for loan ${data.loanReference}`);
    return request;
  }

  async approveOrRejectWriteOff(
    loanReference: string,
    decision: 'APPROVED' | 'REJECTED',
    authorizedBy: string,
  ) {
    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      throw new BadRequestException(`Invalid decision: ${decision}`);
    }

    const writeOff = await this.prisma.loanWriteOff.findUnique({
      where: { loanReference },
    });

    if (!writeOff) {
      throw new NotFoundException(`Write-off request for loan ${loanReference} not found`);
    }

    if (writeOff.status !== 'PENDING') {
      throw new BadRequestException(
        `Write-off request is already processed (current status: ${writeOff.status})`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (decision === 'APPROVED') {
        // Decrement LOAN_BDOEA fund + create FundTransaction
        let loanFund = await tx.fund.findUnique({ where: { code: LOAN_FUND_CODE } });
        if (!loanFund) loanFund = await tx.fund.findUnique({ where: { code: LOAN_FUND_FALLBACK } });
        if (!loanFund) throw new Error(`Loan fund not found for write-off`);

        await tx.fund.update({
          where: { id: loanFund.id },
          data: { balance: { decrement: writeOff.amount } },
        });

        await tx.fundTransaction.create({
          data: {
            fundId: loanFund.id,
            amount: -writeOff.amount,
            type: 'LOAN_WRITE_OFF',
            description: `Loan write-off for ${writeOff.memberName} (ref: ${writeOff.loanReference}) - ${writeOff.reason}`,
            referenceId: writeOff.loanReference,
          },
        });
      }

      await tx.loanWriteOff.update({
        where: { id: writeOff.id },
        data: {
          status: decision,
          authorizedBy,
        },
      });

      this.logger.log(`Write-off for loan ${loanReference} resolved as ${decision}`);
    });

    // Publish writeoff.approved event to RabbitMQ on approval
    if (decision === 'APPROVED') {
      try {
        this.lasClient.emit('writeoff.approved', {
          loanReference: writeOff.loanReference,
          memberId: writeOff.memberId,
          amount: writeOff.amount,
          authorizedBy,
          resolvedAt: new Date().toISOString(),
        });
        this.logger.log(`Emitted writeoff.approved for ${writeOff.loanReference}`);
      } catch (error) {
        this.logger.error(`Failed to emit writeoff.approved: ${error.message}`);
      }
    }

    return { success: true, loanReference, decision };
  }
}
