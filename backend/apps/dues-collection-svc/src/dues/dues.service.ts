import { Injectable, Logger, NotFoundException, ConflictException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DuesPayrollConfirmedEvent } from '@backend/events';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class DuesService {
  private readonly logger = new Logger(DuesService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('LEDGER_CLIENT') private readonly ledgerClient: ClientProxy,
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
        method: data.paymentMethod || 'PAYROLL',
        referenceNumber: data.referenceNumber,
        fundToCredit: fund.code,
        status: 'Pending',
      },
    });
    
    this.logger.log(`Successfully saved DuesRecord for transaction ${data.transactionId}`);
  }

  async findAll(status?: string) {
    const whereClause = status ? { status } : {};
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

    if (record.status === 'Confirmed') {
      throw new ConflictException('Dues record is already Confirmed');
    }

    const updated = await this.prisma.duesRecord.update({
      where: { id },
      data: { status: 'Confirmed' },
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

    return updated;
  }
}
