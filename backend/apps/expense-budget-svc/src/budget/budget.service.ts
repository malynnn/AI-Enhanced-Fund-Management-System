import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class BudgetService {
  private readonly logger = new Logger(BudgetService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async enrich(category: any) {
    const result = await this.prisma.expenseVoucher.aggregate({
      _sum: { amount: true },
      where: {
        accountCode: category.accountCode,
        status: 'POSTED',
        date: {
          gte: new Date(`${category.fiscalYear}-01-01T00:00:00.000Z`),
          lte: new Date(`${category.fiscalYear}-12-31T23:59:59.999Z`),
        },
      },
    });
    const totalSpent = Number(result._sum.amount ?? 0);
    const approvedAmount = Number(category.approvedAmount);
    const remainingBudget = approvedAmount - totalSpent;
    const utilizationPercent =
      approvedAmount > 0
        ? parseFloat(((totalSpent / approvedAmount) * 100).toFixed(2))
        : 0;
    const isExceeded = totalSpent > approvedAmount;

    return {
      ...category,
      totalSpent,
      remainingBudget,
      utilizationPercent,
      isExceeded,
    };
  }

  async findAll() {
    const categories = await this.prisma.budgetCategory.findMany({
      orderBy: { fiscalYear: 'desc' },
    });
    return Promise.all(categories.map((c) => this.enrich(c)));
  }

  async findOne(id: string) {
    const category = await this.prisma.budgetCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException(`BudgetCategory ${id} not found`);
    return this.enrich(category);
  }

  async create(data: {
    accountCode: string;
    accountName: string;
    approvedAmount: number;
    fiscalYear: number;
  }) {
    // Validate accountCode exists
    const account = await this.prisma.chartOfAccount.findUnique({
      where: { code: data.accountCode },
    });
    if (!account) {
      throw new BadRequestException(`Account code ${data.accountCode} does not exist in ChartOfAccount`);
    }

    // Check uniqueness (409 if already exists)
    const existing = await this.prisma.budgetCategory.findUnique({
      where: {
        accountCode_fiscalYear: {
          accountCode: data.accountCode,
          fiscalYear: data.fiscalYear,
        },
      },
    });
    if (existing) {
      throw new ConflictException(`Budget category for account code ${data.accountCode} already exists`);
    }

    const category = await this.prisma.budgetCategory.create({ data });
    this.logger.log(`Created budget category for ${data.accountCode} (FY ${data.fiscalYear})`);
    return this.enrich(category);
  }

  async update(id: string, data: Partial<{ accountName: string; approvedAmount: number; fiscalYear: number }>) {
    const category = await this.prisma.budgetCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException(`BudgetCategory ${id} not found`);

    const updated = await this.prisma.budgetCategory.update({
      where: { id },
      data,
    });
    this.logger.log(`Updated budget category ${id}`);
    return this.enrich(updated);
  }

  async delete(id: string) {
    const category = await this.prisma.budgetCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException(`BudgetCategory ${id} not found`);

    // Guard: cannot delete if posted vouchers reference this accountCode
    const postedVouchers = await this.prisma.expenseVoucher.count({
      where: {
        accountCode: category.accountCode,
        status: 'POSTED',
      },
    });
    if (postedVouchers > 0) {
      throw new ConflictException(
        `Cannot delete: ${postedVouchers} POSTED voucher(s) are linked to account code ${category.accountCode}`,
      );
    }

    await this.prisma.budgetCategory.delete({ where: { id } });
    this.logger.log(`Deleted budget category ${id}`);
    return { success: true };
  }
}
