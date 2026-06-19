import { Injectable, Logger, NotFoundException, ConflictException, Inject, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DuesPayrollConfirmedEvent, QUEUE_REPAYMENTS } from '@backend/events';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { DuesStatus, PaymentMethod, CollectionType } from '@prisma/client';

@Injectable()
export class DuesService {
  private readonly logger = new Logger(DuesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('LEDGER_CLIENT') private readonly ledgerClient: ClientProxy,
    @Inject('REPAYMENTS_CLIENT') private readonly repaymentsClient: ClientProxy,
  ) {}

  async processDuesEvent(data: DuesPayrollConfirmedEvent) {
    if (!data.transactionId || !data.memberId || !data.amount || !data.fundCredited) {
      throw new Error('Missing required fields: transactionId, memberId, amount, or fundCredited');
    }

    const existing = await this.prisma.duesRecord.findUnique({
      where: { transactionId: data.transactionId },
    });
    
    if (existing) {
      this.logger.log(`Duplicate transactionId ${data.transactionId} ignored.`);
      return; // Acknowledges but does not re-insert
    }

    const fund = await this.prisma.fund.findUnique({
      where: { code: data.fundCredited },
    });
    
    if (!fund) {
      throw new Error(`Fund with code ${data.fundCredited} does not exist`);
    }

    await this.prisma.duesRecord.create({
      data: {
        transactionId: data.transactionId,
        memberId: data.memberId,
        name: data.fullName || 'Unknown',
        month: data.monthCovered || 'Unknown',
        amountPaid: Number(data.amount),
        method: (data.paymentMethod || 'SALARY_DEDUCTION') as PaymentMethod,
        referenceNumber: data.referenceNumber,
        fundToCredit: fund.code,
        status: 'PENDING',
      },
    });
    
    this.logger.log(`Successfully saved DuesRecord for transaction ${data.transactionId}`);
  }

  async findAll(status?: string) {
    const whereClause = status ? { status: status as DuesStatus } : {};
    return this.prisma.duesRecord.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });
  }

  async confirmDues(id: string) {
    const record = await this.prisma.duesRecord.findUnique({ where: { id } });
    
    if (!record) {
      throw new NotFoundException(`Dues record ${id} not found`);
    }

    if (record.status === 'CONFIRMED') {
      throw new ConflictException('Dues record is already Confirmed');
    }

    const updated = await this.prisma.duesRecord.update({
      where: { id },
      data: { status: 'CONFIRMED' },
    });

    // Publish event to ledger-accounts-svc
    try {
      this.ledgerClient.emit('fund.dues.posted', {
        duesRecordId: updated.id,
        transactionId: updated.transactionId,
        amount: updated.amountPaid,
        fundCode: updated.fundToCredit,
        memberId: updated.memberId,
        memberName: updated.name,
      });
      this.logger.log(`Emitted fund.dues.posted for record ${id}`);
    } catch (error) {
      this.logger.error(`Failed to emit fund.dues.posted event for ${id}: ${error.message}`);
    }

    // Publish repayment event to disbursement-svc if it is a loan repayment
    if (updated.collectionType === 'LOAN_PAYMENT') {
      try {
        const activeLoan = await this.prisma.disbursementRequest.findFirst({
          where: {
            memberId: updated.memberId,
            status: 'COMPLETED',
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        if (activeLoan) {
          const repaymentEvent = {
            loanReference: activeLoan.loanReference,
            memberId: updated.memberId,
            memberName: updated.name,
            amount: Number(updated.amountPaid),
            principalAmount: Number(updated.amountPaid),
            serviceFeeAmount: 0,
            paymentMethod: updated.method,
            referenceNumber: updated.referenceNumber || undefined,
          };

          this.repaymentsClient.emit(QUEUE_REPAYMENTS, repaymentEvent);
          this.logger.log(`Emitted ${QUEUE_REPAYMENTS} event for loan ${activeLoan.loanReference} from collection confirmation`);
        } else {
          this.logger.warn(`No active completed loan found for member ${updated.memberId} when confirming collection.`);
        }
      } catch (error) {
        this.logger.error(`Failed to emit ${QUEUE_REPAYMENTS} event: ${error.message}`);
      }
    }

    return updated;
  }

  async createCollection(payload: any) {
    const {
      memberId,
      memberName,
      collectionType,
      amount,
      method,
      referenceNumber,
      reference_number,
      depositFund,
    } = payload;

    if (!memberId || !memberName || !collectionType || amount === undefined || !method) {
      throw new BadRequestException('Missing required fields: memberId, memberName, collectionType, amount, method');
    }

    const sanitizedMemberId = memberId.toUpperCase().trim();

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      throw new BadRequestException('Amount must be a positive number');
    }

    // Validate enum types
    if (!['DUES', 'LOAN_PAYMENT', 'CONTRIBUTION'].includes(collectionType)) {
      throw new BadRequestException(`Invalid collectionType: ${collectionType}`);
    }

    const fundCodeMap: Record<string, string> = {
      GENERAL_FUND: 'GF',
      UNION_FUND: 'UF',
      LOAN_FUND: 'LN',
      FOREIGN_FUND: 'FA',
      DEATH_ASSISTANCE_FUND: 'DA',
      EMERGENCY_FUND: 'GF',
    };

    const targetFundCode = fundCodeMap[depositFund] || 'GF';

    // Verify fund exists
    const fund = await this.prisma.fund.findUnique({
      where: { code: targetFundCode },
    });
    if (!fund) {
      throw new BadRequestException(`Target fund with code ${targetFundCode} does not exist`);
    }

    const refNo = referenceNumber || reference_number || null;
    const txId = `TXN-COL-${Math.floor(100000 + Math.random() * 900000)}`;
    const now = new Date();
    const currentMonth = `${now.toLocaleString('default', { month: 'short' })} ${now.getFullYear()}`;

    return this.prisma.$transaction(async (tx) => {
      if (collectionType === 'LOAN_PAYMENT') {
        // Find latest completed disbursement request (active loan) for this member
        const activeLoan = await tx.disbursementRequest.findFirst({
          where: {
            memberId: sanitizedMemberId,
            status: 'COMPLETED',
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        if (!activeLoan) {
          throw new BadRequestException(`No active completed loan found for member ${sanitizedMemberId}`);
        }

        // Subtract the amount from outstanding balance (amount field)
        const currentLoanBalance = Number(activeLoan.amount);
        const newLoanBalance = Math.max(0, currentLoanBalance - numericAmount);

        await tx.disbursementRequest.update({
          where: { id: activeLoan.id },
          data: { amount: newLoanBalance },
        });

        this.logger.log(`Subtracted ${numericAmount} from outstanding loan balance of member ${sanitizedMemberId} (ref: ${activeLoan.loanReference}). New balance: ${newLoanBalance}`);
      }

      // Create DuesRecord
      const record = await tx.duesRecord.create({
        data: {
          transactionId: txId,
          memberId: sanitizedMemberId,
          name: memberName,
          month: currentMonth,
          amountPaid: numericAmount,
          method: method as PaymentMethod,
          referenceNumber: refNo,
          fundToCredit: targetFundCode,
          status: 'PENDING',
          collectionType: collectionType as CollectionType,
        },
      });

      this.logger.log(`Created collection record ${record.id} with type ${collectionType}`);
      return record;
    });
  }
}
