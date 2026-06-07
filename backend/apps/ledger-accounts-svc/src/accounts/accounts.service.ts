import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  /** GET /accounts — all records ordered by code */
  async findAll() {
    return this.prisma.chartOfAccount.findMany({
      orderBy: { code: 'asc' },
    });
  }

  /** GET /accounts/:id — single record or 404 */
  async findById(id: string) {
    const account = await this.prisma.chartOfAccount.findUnique({
      where: { id },
    });
    if (!account) {
      throw new NotFoundException(`Account with id "${id}" not found`);
    }
    return account;
  }

  /** POST /accounts — create; 409 if code already exists */
  async create(dto: CreateAccountDto) {
    const existing = await this.prisma.chartOfAccount.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(
        `Account with code "${dto.code}" already exists`,
      );
    }
    return this.prisma.chartOfAccount.create({ data: dto });
  }

  /** PUT /accounts/:id — update name, type, fund, or status */
  async update(id: string, dto: UpdateAccountDto) {
    await this.findById(id); // throws 404 if not found
    return this.prisma.chartOfAccount.update({
      where: { id },
      data: dto,
    });
  }

  /** DELETE /accounts/:id — soft-delete by setting status to Inactive */
  async softDelete(id: string) {
    await this.findById(id); // throws 404 if not found
    return this.prisma.chartOfAccount.update({
      where: { id },
      data: { status: 'Inactive' },
    });
  }
}
