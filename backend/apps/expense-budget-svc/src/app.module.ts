import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from '@bdoea-fs/auth';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VouchersModule } from './vouchers/vouchers.module';
import { BudgetModule } from './budget/budget.module';
import { PettyCashModule } from './petty-cash/petty-cash.module';

@Module({
  imports: [VouchersModule, BudgetModule, PettyCashModule],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useFactory: () => {
        const { Reflector } = require('@nestjs/core');
        return new JwtAuthGuard(new Reflector());
      },
    },
  ],
})
export class AppModule {}

