import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { FundsService } from './funds.service';
import { Public } from '@bdoea-fs/auth';

@Controller('funds')
export class FundsController {
  constructor(private readonly fundsService: FundsService) {}

  /** GET /funds — returns all funds with nested transaction history */
  @Get()
  @Public()
  findAll() {
    return this.fundsService.findAll();
  }

  /** POST /funds/transfer — transfers funds inside database transaction */
  @Post('transfer')
  @Public()
  transferFunds(
    @Body('sourceId') sourceId: string,
    @Body('destId') destId: string,
    @Body('amount') amount: number,
    @Body('notes') notes: string,
  ) {
    return this.fundsService.transferFunds(sourceId, destId, amount, notes);
  }

  /** GET /funds/:id — returns a single fund with full history, or 404 */
  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.fundsService.findById(id);
  }
}
