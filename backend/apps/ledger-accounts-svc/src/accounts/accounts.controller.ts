import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { Roles, Public } from '@bdoea-fs/auth';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  /** GET /accounts — public, returns all accounts ordered by code */
  @Get()
  @Public()
  findAll() {
    return this.accountsService.findAll();
  }

  /** GET /accounts/:id — public, returns single account or 404 */
  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.accountsService.findById(id);
  }

  /** POST /accounts — Admin only; 409 if code already exists */
  @Post()
  @Roles('Superadmin', 'Officer/Admin', 'Admin')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateAccountDto) {
    try {
      return await this.accountsService.create(dto);
    } catch (err) {
      return {
        error: 'Error occurred in create',
        message: err.message,
        stack: err.stack
      };
    }
  }

  /** PUT /accounts/:id — Admin only; updates name, type, fund, or status */
  @Put(':id')
  @Roles('Superadmin', 'Officer/Admin', 'Admin')
  update(@Param('id') id: string, @Body() dto: UpdateAccountDto) {
    return this.accountsService.update(id, dto);
  }

  /** DELETE /accounts/:id — Admin only; soft-deletes (status → Archived) */
  @Delete(':id')
  @Roles('Superadmin', 'Officer/Admin', 'Admin')
  softDelete(@Param('id') id: string) {
    return this.accountsService.softDelete(id);
  }
}
