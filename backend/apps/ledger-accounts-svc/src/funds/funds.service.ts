import { Injectable, NotFoundException } from '@nestjs/common';
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
}
