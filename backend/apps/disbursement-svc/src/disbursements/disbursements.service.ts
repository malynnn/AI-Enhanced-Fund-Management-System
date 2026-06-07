import { Injectable, Logger, BadRequestException, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { LoanApprovedEvent, DisbursementConfirmedEvent } from '@backend/events';
import { ClientProxy } from '@nestjs/microservices';

const LOAN_FUND_CODE = 'LOAN_BDOEA';
const LOAN_FUND_FALLBACK = 'LN';

@Injectable()
export class DisbursementsService {
  private readonly logger = new Logger(DisbursementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('LAS_CLIENT') private readonly lasClient: ClientProxy,
  ) {}

  async findAll() {
    return this.prisma.disbursementRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async confirmDisbursement(id: string, authorizedBy: string) {
    const record = await this.prisma.disbursementRequest.findUnique({ where: { id } });

    if (!record) {
      throw new NotFoundException(`Disbursement request ${id} not found`);
    }

    if (record.status === 'COMPLETED') {
      throw new BadRequestException('Disbursement is already COMPLETED');
    }

    const updated = await this.prisma.disbursementRequest.update({
      where: { id },
      data: { status: 'COMPLETED', authorizedBy },
    });

    // Publish disbursement.confirmed event to LAS via RabbitMQ
    try {
      const event: DisbursementConfirmedEvent = {
        loanReference: updated.loanReference,
        disbursementId: updated.id,
        status: 'COMPLETED',
        authorizedBy,
        reconciledAt: new Date().toISOString(),
      };
      this.lasClient.emit('disbursement.confirmed', event);
      this.logger.log(`Emitted disbursement.confirmed for ${id} (ref: ${updated.loanReference})`);
    } catch (error) {
      this.logger.error(`Failed to emit disbursement.confirmed: ${error.message}`);
    }

    return { ...updated, callbackQueued: true };
  }

  async processLoanApproved(data: LoanApprovedEvent): Promise<void> {
    const { loanReference, memberId, memberName, amount, paymentMethod, bankAccount, paymentDetails } = data;

    // --- Validate required fields ---
    if (!loanReference || !memberId || !memberName || !amount || !paymentMethod || !bankAccount) {
      throw new Error(
        `Missing required fields: loanReference=${loanReference}, memberId=${memberId}, memberName=${memberName}, amount=${amount}, paymentMethod=${paymentMethod}, bankAccount=${bankAccount}`,
      );
    }

    const disbursementAmount = Number(amount);
    if (isNaN(disbursementAmount) || disbursementAmount <= 0) {
      throw new Error(`Invalid amount: ${amount}`);
    }

    // --- Atomic transaction ---
    await this.prisma.$transaction(async (tx) => {
      // 1. Find LOAN_BDOEA fund, fall back to LN
      let fund = await tx.fund.findUnique({ where: { code: LOAN_FUND_CODE } });
      if (!fund) {
        this.logger.warn(`Fund ${LOAN_FUND_CODE} not found, falling back to ${LOAN_FUND_FALLBACK}`);
        fund = await tx.fund.findUnique({ where: { code: LOAN_FUND_FALLBACK } });
      }
      if (!fund) {
        throw new Error(`Neither fund code "${LOAN_FUND_CODE}" nor fallback "${LOAN_FUND_FALLBACK}" found`);
      }

      // 2. Decrement balance
      const updatedFund = await tx.fund.update({
        where: { id: fund.id },
        data: { balance: { decrement: disbursementAmount } },
      });

      this.logger.log(
        `Fund ${updatedFund.code} balance decremented by ${disbursementAmount} → new balance: ${updatedFund.balance}`,
      );

      // 3. Create FundTransaction record
      await tx.fundTransaction.create({
        data: {
          fundId: fund.id,
          amount: -disbursementAmount,
          type: 'LOAN_DISBURSEMENT',
          description: `Loan disbursement for ${memberName} (ref: ${loanReference})`,
          referenceId: loanReference,
        },
      });

      // 4. Create DisbursementRequest as PENDING
      await tx.disbursementRequest.create({
        data: {
          loanReference,
          memberId,
          memberName,
          amount: disbursementAmount,
          paymentMethod,
          bankAccount,
          paymentDetails: paymentDetails || null,
          status: 'PENDING',
          fundId: fund.id,
        },
      });

      this.logger.log(`DisbursementRequest created as PENDING for loan ${loanReference}`);
    });
  }
}
