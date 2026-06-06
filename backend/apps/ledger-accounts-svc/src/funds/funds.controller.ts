import { Controller, Get, Param } from '@nestjs/common';
import { FundsService } from './funds.service';

@Controller('funds')
export class FundsController {
  constructor(private readonly fundsService: FundsService) {}

  @Get()
  findAll() {
    return this.fundsService.findAll();
  }

  @Get('code/:code')
  findByCode(@Param('code') code: string) {
    return this.fundsService.findByCode(code);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fundsService.findById(id);
  }
}
