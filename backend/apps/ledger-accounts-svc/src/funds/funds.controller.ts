import { Controller, Get, Param } from '@nestjs/common';
import { FundsService } from './funds.service';
import { Roles } from '@bdoea-fs/auth';

@Controller('funds')
export class FundsController {
  constructor(private readonly fundsService: FundsService) {}

  /**
   * GET /funds
   * Returns all funds with nested transaction history (newest first).
   * Treasurer and Admin roles only — no public access.
   */
  @Get()
  @Roles('Treasurer', 'Admin')
  findAll() {
    return this.fundsService.findAll();
  }

  /**
   * GET /funds/:id
   * Returns a single fund with full history, or 404.
   * Treasurer and Admin roles only.
   * NOTE: No POST /funds — balances are updated only via internal RMQ events.
   */
  @Get(':id')
  @Roles('Treasurer', 'Admin')
  findOne(@Param('id') id: string) {
    return this.fundsService.findById(id);
  }
}
