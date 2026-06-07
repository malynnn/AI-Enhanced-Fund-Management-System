import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RepaymentPostedEvent } from '@backend/events';
import { ClientProxy } from '@nestjs/microservices';

const LOAN_FUND_CODE = 'LOAN_BDOEA';
const LOAN_FUND_FALLBACK = 'LN';
const GENERAL_FUND_CODE = 'GF';

@Injectable()
export class RepaymentsService {
  private readonly logger = new Logger(RepaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('LAS_CLIENT') private readonly lasClient: ClientProxy,
  ) {}

  async findAll() {
    return this.prisma.loanRepayment.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOverpayments() {
    return this.prisma.loanRepayment.findMany({
      where: { overpaymentAmount: { gt: 0 } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolveOverpayment(repaymentId: string, decision: 'ADVANCE_CREDIT' | 'REFUND', authorizedBy: string) {
    if (!['ADVANCE_CREDIT', 'REFUND'].includes(decision)) {
      throw new Error(`Invalid decision: ${decision}`);
    }

    const repayment = await this.prisma.loanRepayment.findUnique({ where: { id: repaymentId } });
    if (!repayment) {
      throw new Error(`Loan repayment ${repaymentId} not found`);
    }

    if (repayment.status !== 'OVERPAYMENT_PENDING') {
      throw new Error(`Repayment is not pending overpayment resolution (current status: ${repayment.status})`);
    }

    const overpaymentAmount = repayment.overpaymentAmount;

    await this.prisma.$transaction(async (tx) => {
      if (decision === 'ADVANCE_CREDIT') {
        // Increment LOAN_BDOEA fund + post DEPOSIT FundTransaction
        let loanFund = await tx.fund.findUnique({ where: { code: LOAN_FUND_CODE } });
        if (!loanFund) loanFund = await tx.fund.findUnique({ where: { code: LOAN_FUND_FALLBACK } });
        if (!loanFund) throw new Error(`Loan fund not found for advance credit`);

        await tx.fund.update({
          where: { id: loanFund.id },
          data: { balance: { increment: overpaymentAmount } },
        });

        await tx.fundTransaction.create({
          data: {
            fundId: loanFund.id,
            amount: overpaymentAmount,
            type: 'DEPOSIT', // using DEPOSIT for advance credit
            description: `Advance credit for overpayment from ${repayment.memberName} (ref: ${repayment.loanReference})`,
            referenceId: repayment.loanReference,
          },
        });
      } else if (decision === 'REFUND') {
        // Decrement GF fund + post WITHDRAWAL FundTransaction
        const generalFund = await tx.fund.findUnique({ where: { code: GENERAL_FUND_CODE } });
        if (!generalFund) throw new Error(`General fund not found for refund`);

        await tx.fund.update({
          where: { id: generalFund.id },
          data: { balance: { decrement: overpaymentAmount } },
        });

        await tx.fundTransaction.create({
          data: {
            fundId: generalFund.id,
            amount: -overpaymentAmount,
            type: 'WITHDRAWAL', // using WITHDRAWAL for refund
            description: `Refund for overpayment to ${repayment.memberName} (ref: ${repayment.loanReference})`,
            referenceId: repayment.loanReference,
          },
        });
      }

      // Update status to OVERPAYMENT_CREDITED or OVERPAYMENT_REFUNDED
      const newStatus = decision === 'ADVANCE_CREDIT' ? 'OVERPAYMENT_CREDITED' : 'OVERPAYMENT_REFUNDED';
      await tx.loanRepayment.update({
        where: { id: repaymentId },
        data: {
          status: newStatus,
          treasurerDecision: decision,
        },
      });
      this.logger.log(`Overpayment for ${repaymentId} resolved as ${decision} (${newStatus})`);
    });

    // Publish overpayment.resolved event to RabbitMQ
    try {
      this.lasClient.emit('overpayment.resolved', {
        repaymentId,
        decision,
        authorizedBy,
      });
      this.logger.log(`Emitted overpayment.resolved for ${repaymentId}`);
    } catch (error) {
      this.logger.error(`Failed to emit overpayment.resolved: ${error.message}`);
    }

    return { success: true, repaymentId, decision };
  }

  async processRepayment(data: RepaymentPostedEvent): Promise<void> {
    const {
      loanReference,
      memberId,
      memberName,
      amount,
      principalAmount,
      serviceFeeAmount,
      paymentMethod,
      referenceNumber,
    } = data;

    // --- Validate required fields ---
    if (!loanReference || !memberId || !memberName || !amount || !paymentMethod) {
      throw new Error(
        `Missing required fields: loanReference=${loanReference}, memberId=${memberId}, memberName=${memberName}, amount=${amount}, paymentMethod=${paymentMethod}`,
      );
    }

    const totalAmount = Number(amount);
    const principal = Number(principalAmount ?? 0);
    const serviceFee = Number(serviceFeeAmount ?? 0);

    if (isNaN(totalAmount) || totalAmount <= 0) {
      throw new Error(`Invalid amount: ${amount}`);
    }

    // --- Overpayment detection ---
    const overpaymentAmount = Math.max(0, totalAmount - (principal + serviceFee));
    const status = overpaymentAmount > 0 ? 'OVERPAYMENT_PENDING' : 'PROCESSED';

    // --- Atomic transaction ---
    await this.prisma.$transaction(async (tx) => {
      // 1. Find Loan Fund (LOAN_BDOEA → fallback to LN)
      let loanFund = await tx.fund.findUnique({ where: { code: LOAN_FUND_CODE } });
      if (!loanFund) {
        this.logger.warn(`Fund ${LOAN_FUND_CODE} not found, falling back to ${LOAN_FUND_FALLBACK}`);
        loanFund = await tx.fund.findUnique({ where: { code: LOAN_FUND_FALLBACK } });
      }
      if (!loanFund) {
        throw new Error(`Neither fund "${LOAN_FUND_CODE}" nor fallback "${LOAN_FUND_FALLBACK}" found`);
      }

      // 2. Find General Fund (GF) for service fee
      const generalFund = await tx.fund.findUnique({ where: { code: GENERAL_FUND_CODE } });
      if (!generalFund) {
        throw new Error(`General Fund "${GENERAL_FUND_CODE}" not found`);
      }

      // 3. Increment Loan Fund balance with principal portion
      const creditToPrincipal = principal > 0 ? principal : totalAmount - serviceFee;
      await tx.fund.update({
        where: { id: loanFund.id },
        data: { balance: { increment: creditToPrincipal } },
      });

      // 4. Increment General Fund balance with service fee portion
      if (serviceFee > 0) {
        await tx.fund.update({
          where: { id: generalFund.id },
          data: { balance: { increment: serviceFee } },
        });
      }

      // 5. Create FundTransaction for principal (loan fund)
      await tx.fundTransaction.create({
        data: {
          fundId: loanFund.id,
          amount: creditToPrincipal,
          type: 'LOAN_REPAYMENT',
          description: `Principal repayment from ${memberName} (ref: ${loanReference})`,
          referenceId: loanReference,
        },
      });

      // 6. Create FundTransaction for service fee (general fund)
      if (serviceFee > 0) {
        await tx.fundTransaction.create({
          data: {
            fundId: generalFund.id,
            amount: serviceFee,
            type: 'SERVICE_FEE',
            description: `Service fee from ${memberName} (ref: ${loanReference})`,
            referenceId: loanReference,
          },
        });
      }

      // 7. Create LoanRepayment record
      await tx.loanRepayment.create({
        data: {
          loanReference,
          memberId,
          memberName,
          amount: totalAmount,
          principalAmount: creditToPrincipal,
          serviceFeeAmount: serviceFee,
          overpaymentAmount,
          paymentMethod,
          referenceNumber: referenceNumber || null,
          status,
        },
      });

      this.logger.log(
        `LoanRepayment created [status: ${status}] for loan ${loanReference}. ` +
        `Principal: ${creditToPrincipal}, ServiceFee: ${serviceFee}, Overpayment: ${overpaymentAmount}`,
      );
    });

    // 8. Publish repayment.posted event to notify LAS (outside transaction)
    try {
      this.lasClient.emit('repayment.posted', {
        loanReference,
        memberId,
        totalAmount,
        principal,
        serviceFee,
        overpaymentAmount,
        status,
      });
      this.logger.log(`Emitted repayment.posted for loan ${loanReference}`);
    } catch (error) {
      this.logger.error(`Failed to emit repayment.posted: ${error.message}`);
    }
  }
}
