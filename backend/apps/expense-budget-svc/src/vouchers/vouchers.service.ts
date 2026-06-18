import { Injectable, Logger, BadRequestException, ConflictException, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class VouchersService {
  private readonly logger = new Logger(VouchersService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('AUDIT_CLIENT') private readonly auditClient: ClientProxy,
    @Inject('BUDGET_ALERTS_CLIENT') private readonly budgetClient: ClientProxy,
  ) {}

  private async emitAudit(action: string, entityId: string, details: any, user: string) {
    try {
      this.auditClient.emit('audit.log', {
        action,
        entityType: 'ExpenseVoucher',
        entityId,
        details,
        user,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      this.logger.error(`Failed to emit audit event: ${err.message}`);
    }
  }

  async findAll(status?: string) {
    const { VoucherStatus } = require('@prisma/client');
    const where = status && Object.values(VoucherStatus).includes(status)
      ? { status: status as any }
      : {};
    return this.prisma.expenseVoucher.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: {
    voucherNumber: string;
    date: string | Date;
    payee: string;
    purpose: string;
    amount: number;
    accountCode: string;
    notes?: string;
  }, user: string) {
    if (!data.voucherNumber || !data.date || !data.payee || !data.purpose || !data.amount || !data.accountCode) {
      throw new BadRequestException('Missing required fields for voucher');
    }


    const existing = await this.prisma.expenseVoucher.findUnique({
      where: { voucherNumber: data.voucherNumber },
    });
    if (existing) {
      throw new ConflictException(`Voucher number ${data.voucherNumber} already exists`);
    }

    const voucher = await this.prisma.expenseVoucher.create({
      data: {
        ...data,
        date: new Date(data.date),
        status: ((data as any).status || 'PENDING') as any,
      },
    });

    this.logger.log(`Created voucher ${voucher.voucherNumber}`);
    this.emitAudit('CREATE_VOUCHER', voucher.id, data, user);
    return voucher;
  }

  async update(id: string, data: any, user: string) {
    const voucher = await this.prisma.expenseVoucher.findUnique({ where: { id } });
    if (!voucher) {
      throw new NotFoundException(`Voucher ${id} not found`);
    }

    if (voucher.status !== 'PENDING') {
      throw new ConflictException(`Only PENDING vouchers can be edited (current status: ${voucher.status})`);
    }


    if (data.voucherNumber && data.voucherNumber !== voucher.voucherNumber) {
      const existing = await this.prisma.expenseVoucher.findUnique({
        where: { voucherNumber: data.voucherNumber },
      });
      if (existing) {
        throw new ConflictException(`Voucher number ${data.voucherNumber} already exists`);
      }
    }

    const updatedData = { ...data };
    if (updatedData.date) {
      updatedData.date = new Date(updatedData.date);
    }

    const updated = await this.prisma.expenseVoucher.update({
      where: { id },
      data: updatedData,
    });

    this.logger.log(`Updated voucher ${voucher.voucherNumber}`);
    this.emitAudit('UPDATE_VOUCHER', id, data, user);
    return updated;
  }

  async delete(id: string, user: string) {
    const voucher = await this.prisma.expenseVoucher.findUnique({ where: { id } });
    if (!voucher) {
      throw new NotFoundException(`Voucher ${id} not found`);
    }

    if (voucher.status !== 'PENDING') {
      throw new ConflictException(`Only PENDING vouchers can be deleted (current status: ${voucher.status})`);
    }

    await this.prisma.expenseVoucher.delete({ where: { id } });
    this.logger.log(`Deleted voucher ${voucher.voucherNumber}`);
    this.emitAudit('DELETE_VOUCHER', id, { voucherNumber: voucher.voucherNumber }, user);
    return { success: true };
  }

  async approveOrReject(id: string, decision: 'APPROVED' | 'REJECTED', authorizedBy: string) {
    if (!['APPROVED', 'REJECTED'].includes(decision)) {
      throw new BadRequestException(`Invalid decision: ${decision}`);
    }

    const voucher = await this.prisma.expenseVoucher.findUnique({ where: { id } });
    if (!voucher) {
      throw new NotFoundException(`Voucher ${id} not found`);
    }

    if (voucher.status !== 'PENDING') {
      throw new ConflictException(`Only PENDING vouchers can be approved/rejected (current status: ${voucher.status})`);
    }

    const updated = await this.prisma.expenseVoucher.update({
      where: { id },
      data: {
        status: decision,
        approvedBy: authorizedBy,
      },
    });

    this.logger.log(`Voucher ${voucher.voucherNumber} resolved as ${decision}`);
    this.emitAudit('RESOLVE_VOUCHER', id, { decision, authorizedBy }, authorizedBy);
    return updated;
  }

  async post(id: string, user: string) {
    const voucher = await this.prisma.expenseVoucher.findUnique({ where: { id } });
    if (!voucher) throw new NotFoundException(`Voucher ${id} not found`);

    if (voucher.status !== 'APPROVED') {
      const { ForbiddenException } = require('@nestjs/common');
      throw new ForbiddenException(`Only APPROVED vouchers can be posted (current status: ${voucher.status})`);
    }

    // Budget Ceiling Check
    const fiscalYear = new Date(voucher.date).getFullYear();
    const budgetCategory = await this.prisma.budgetCategory.findUnique({
      where: {
        accountCode_fiscalYear: {
          accountCode: voucher.accountCode,
          fiscalYear,
        },
      },
    });

    let budgetWarning = false;
    let budgetWarningMessage = '';
    let utilization = 0;

    if (budgetCategory) {
      const result = await this.prisma.expenseVoucher.aggregate({
        _sum: { amount: true },
        where: {
          accountCode: voucher.accountCode,
          status: 'POSTED',
        },
      });
      const currentSpent = Number(result._sum.amount ?? 0);
      const projectedTotal = currentSpent + Number(voucher.amount);

      if (projectedTotal > Number(budgetCategory.approvedAmount)) {
        budgetWarning = true;
        budgetWarningMessage = `Warning: Posting this voucher exceeds the budget ceiling for ${voucher.accountCode}`;
      }
      
      utilization = projectedTotal / Number(budgetCategory.approvedAmount);
    }

    // Process Transaction
    const updated = await this.prisma.$transaction(async (tx) => {
      // Mark POSTED
      const updatedVoucher = await tx.expenseVoucher.update({
        where: { id },
        data: {
          status: 'POSTED',
          postedAt: new Date(),
        },
      });

      // Decrement GF Balance and create FundTransaction
      const gf = await tx.fund.findUnique({ where: { code: 'GEN' } });
      if (!gf) {
        throw new NotFoundException('General Fund (code: GEN) not found');
      }

      await tx.fund.update({
        where: { id: gf.id },
        data: { balance: { decrement: voucher.amount } },
      });

      await tx.fundTransaction.create({
        data: {
          fundId: gf.id,
          amount: voucher.amount,
          type: 'WITHDRAWAL',
          description: `Disbursement for ${voucher.purpose}`,
          referenceId: voucher.id,
        },
      });

      return updatedVoucher;
    });

    // Fire-and-forget budget utilization alert — publishing failure must NOT affect the response
    if (budgetCategory && utilization >= 0.8) {
      setImmediate(() => {
        try {
          const utilizationPercent = parseFloat((utilization * 100).toFixed(2));
          const payload: {
            accountCode: string;
            accountName: string;
            approvedAmount: number;
            totalSpent: number;
            utilizationPercent: number;
            triggeredAt: string;
            voucherId: string;
            warningMessage?: string;
          } = {
            accountCode: voucher.accountCode,
            accountName: budgetCategory.accountName,
            approvedAmount: Number(budgetCategory.approvedAmount),
            totalSpent: Number(budgetCategory.approvedAmount) * utilization,
            utilizationPercent,
            triggeredAt: new Date().toISOString(),
            voucherId: voucher.id,
          };
          if (budgetWarning) {
            payload.warningMessage = budgetWarningMessage;
          }
          this.budgetClient.emit('budget.utilization.alert', payload);
          this.logger.log(
            `Budget alert published for ${voucher.accountCode}: ${utilizationPercent}% utilized`,
          );
        } catch (err) {
          this.logger.error(
            `[FIRE-AND-FORGET] Failed to publish budget.utilization.alert: ${err?.message}`,
          );
        }
      });
    }

    this.logger.log(`Voucher ${voucher.voucherNumber} posted`);
    this.emitAudit('POST_VOUCHER', id, { amount: voucher.amount }, user);

    return { ...updated, budgetWarning, budgetWarningMessage };
  }
}
