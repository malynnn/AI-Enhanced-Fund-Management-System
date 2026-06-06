import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.chartOfAccount.findMany({
      orderBy: { code: 'asc' },
    });
  }

  async findByCode(code: string) {
    return this.prisma.chartOfAccount.findUnique({ where: { code } });
  }
}
