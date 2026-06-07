import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

const VALID_TYPES = ['REPLENISHMENT', 'DISBURSEMENT'];

@Injectable()
export class PettyCashService {
  private readonly logger = new Logger(PettyCashService.name);

  constructor(private readonly prisma: PrismaService) {}

  private async getCurrentBalance(): Promise<number> {
    const last = await this.prisma.pettyCashTransaction.findFirst({
      orderBy: { transactedAt: 'desc' },
      select: { runningBalance: true },
    });
    return last?.runningBalance ?? 0;
  }

  private async getSummary() {
    const [replenishments, disbursements] = await Promise.all([
      this.prisma.pettyCashTransaction.aggregate({
        _sum: { amount: true },
        where: { type: 'REPLENISHMENT' },
      }),
      this.prisma.pettyCashTransaction.aggregate({
        _sum: { amount: true },
        where: { type: 'DISBURSEMENT' },
      }),
    ]);
    const totalReplenishments = replenishments._sum.amount || 0;
    const totalDisbursements = disbursements._sum.amount || 0;
    const currentBalance = totalReplenishments - totalDisbursements;
    return { currentBalance, totalReplenishments, totalDisbursements };
  }

  async findAll() {
    const [transactions, summary] = await Promise.all([
      this.prisma.pettyCashTransaction.findMany({
        orderBy: { transactedAt: 'desc' },
        include: {
          voucher: {
            select: {
              id: true,
              voucherNumber: true,
              payee: true,
              purpose: true,
              amount: true,
              status: true,
            },
          },
        },
      }),
      this.getSummary(),
    ]);
    return { ...summary, transactions };
  }

  async findOne(id: string) {
    const tx = await this.prisma.pettyCashTransaction.findUnique({
      where: { id },
      include: { voucher: true },
    });
    if (!tx) throw new NotFoundException(`PettyCashTransaction ${id} not found`);
    return tx;
  }

  async create(data: {
    type: string;
    amount: number;
    description: string;
    referenceVoucherId?: string;
  }) {
    // Validate type
    if (!VALID_TYPES.includes(data.type)) {
      throw new BadRequestException(`Invalid type: ${data.type}. Must be REPLENISHMENT or DISBURSEMENT`);
    }

    // Validate amount > 0
    if (!data.amount || data.amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    // Validate description
    if (!data.description || data.description.trim() === '') {
      throw new BadRequestException('Description is required');
    }

    // Validate referenceVoucherId if provided
    if (data.referenceVoucherId) {
      const voucher = await this.prisma.expenseVoucher.findUnique({
        where: { id: data.referenceVoucherId },
      });
      if (!voucher) {
        throw new NotFoundException(`Referenced voucher ${data.referenceVoucherId} not found`);
      }
      if (!['APPROVED', 'POSTED'].includes(voucher.status)) {
        throw new BadRequestException(
          `Referenced voucher must be APPROVED or POSTED (current status: ${voucher.status})`,
        );
      }
    }

    // Get current balance
    const currentBalance = await this.getCurrentBalance();

    // 422 if DISBURSEMENT would make balance negative
    if (data.type === 'DISBURSEMENT' && currentBalance - data.amount < 0) {
      throw new UnprocessableEntityException(
        `Disbursement of ${data.amount} would exceed current balance of ${currentBalance}`,
      );
    }

    // Calculate new running balance
    const runningBalance =
      data.type === 'REPLENISHMENT'
        ? currentBalance + data.amount
        : currentBalance - data.amount;

    const tx = await this.prisma.pettyCashTransaction.create({
      data: {
        type: data.type,
        amount: data.amount,
        description: data.description,
        runningBalance,
        referenceVoucherId: data.referenceVoucherId || null,
      },
      include: { voucher: true },
    });

    this.logger.log(`PettyCash ${data.type} of ${data.amount} recorded. New balance: ${runningBalance}`);
    return tx;
  }
}
