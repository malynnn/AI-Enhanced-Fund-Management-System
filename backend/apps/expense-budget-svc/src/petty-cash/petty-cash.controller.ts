import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { PettyCashService } from './petty-cash.service';
import { Roles } from '@bdoea-fs/auth';

@Controller('petty-cash')
export class PettyCashController {
  constructor(private readonly pettyCashService: PettyCashService) {}

  @Get()
  @Roles('Treasurer', 'Admin')
  findAll() {
    return this.pettyCashService.findAll();
  }

  @Get(':id')
  @Roles('Treasurer', 'Admin')
  findOne(@Param('id') id: string) {
    return this.pettyCashService.findOne(id);
  }

  @Post()
  @Roles('Treasurer')
  create(
    @Body()
    data: {
      type: string;
      amount: number;
      description: string;
      referenceVoucherId?: string;
    },
  ) {
    return this.pettyCashService.create(data);
  }
}
