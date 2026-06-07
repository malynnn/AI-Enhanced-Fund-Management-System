import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { DisbursementsModule } from './disbursements/disbursements.module';
import { RepaymentsModule } from './repayments/repayments.module';
import { WriteOffsModule } from './write-offs/write-offs.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from '@bdoea-fs/auth';

@Module({
  imports: [
    DisbursementsModule,
    RepaymentsModule,
    WriteOffsModule,
  ],
  providers: [
    PrismaService,
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
