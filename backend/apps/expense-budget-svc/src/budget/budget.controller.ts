import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { BudgetService } from './budget.service';
import { Public, Roles } from '@bdoea-fs/auth';

@Controller('budget-categories')
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Get()
  @Public()
  findAll() {
    return this.budgetService.findAll();
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.budgetService.findOne(id);
  }

  @Post()
  @Public()
  create(@Body() data: { accountCode: string; accountName: string; approvedAmount: number; fiscalYear: number }) {
    return this.budgetService.create(data);
  }

  @Put(':id')
  @Public()
  update(
    @Param('id') id: string,
    @Body() data: Partial<{ accountName: string; approvedAmount: number; fiscalYear: number }>,
  ) {
    return this.budgetService.update(id, data);
  }

  @Delete(':id')
  @Public()
  delete(@Param('id') id: string) {
    return this.budgetService.delete(id);
  }
}
