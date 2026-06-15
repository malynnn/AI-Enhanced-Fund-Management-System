import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class FundsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Map raw Fund+transactions to the required response shape */
  private shape(fund: any) {
    return {
      id: fund.id,
      name: fund.name,
      code: fund.code,
      currentBalance: fund.balance,
      history: fund.transactions ?? [],
    };
  }

  /** GET /funds — all Fund records with full transaction history, newest first */
  async findAll() {
    const funds = await this.prisma.fund.findMany({
      orderBy: { name: 'asc' },
      include: {
        transactions: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });
    return funds.map((f) => this.shape(f));
  }

  /** GET /funds/:id — single fund with full history or 404 */
  async findById(id: string) {
    const fund = await this.prisma.fund.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: { timestamp: 'desc' },
        },
      },
    });
    if (!fund) {
      throw new NotFoundException(`Fund with id "${id}" not found`);
    }
    return this.shape(fund);
  }

  /** POST /funds/transfer — execute fund transfer atomically */
  async transferFunds(sourceId: string, destId: string, amount: number, notes: string) {
    if (sourceId === destId) {
      throw new BadRequestException('Source and destination funds cannot be the same');
    }
    if (amount <= 0) {
      throw new BadRequestException('Transfer amount must be greater than zero');
    }

    return this.prisma.$transaction(async (tx) => {
      const source = await tx.fund.findUnique({ where: { id: sourceId } });
      const dest = await tx.fund.findUnique({ where: { id: destId } });

      if (!source) {
        throw new NotFoundException(`Source fund with id "${sourceId}" not found`);
      }
      if (!dest) {
        throw new NotFoundException(`Destination fund with id "${destId}" not found`);
      }

      if (Number(source.balance) < amount) {
        throw new BadRequestException(`Insufficient balance in ${source.name}`);
      }

      // Update balances
      await tx.fund.update({
        where: { id: sourceId },
        data: { balance: { decrement: amount } },
      });

      await tx.fund.update({
        where: { id: destId },
        data: { balance: { increment: amount } },
      });

      // Create ledger transactions
      const txRef = `TR-${Math.floor(100000 + Math.random() * 900000)}`;

      await tx.fundTransaction.create({
        data: {
          fundId: sourceId,
          amount,
          type: 'WITHDRAWAL',
          description: `Transfer to ${dest.name}: ${notes}`,
          referenceId: txRef,
        },
      });

      await tx.fundTransaction.create({
        data: {
          fundId: destId,
          amount,
          type: 'DEPOSIT',
          description: `Transfer from ${source.name}: ${notes}`,
          referenceId: txRef,
        },
      });

      return {
        success: true,
        message: `Successfully transferred ₱${amount.toLocaleString()} from ${source.name} to ${dest.name}`,
      };
    });
  }
}
