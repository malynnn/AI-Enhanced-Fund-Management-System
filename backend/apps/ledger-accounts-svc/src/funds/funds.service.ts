import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class FundsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.fund.findMany({
      orderBy: { name: 'asc' },
      include: { transactions: { orderBy: { timestamp: 'desc' }, take: 10 } },
    });
  }

  async findById(id: string) {
    return this.prisma.fund.findUnique({
      where: { id },
      include: { transactions: { orderBy: { timestamp: 'desc' } } },
    });
  }

  async findByCode(code: string) {
    return this.prisma.fund.findUnique({
      where: { code },
      include: { transactions: { orderBy: { timestamp: 'desc' } } },
    });
  }
}
