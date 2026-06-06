import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { FundsController } from './funds.controller';
import { FundsService } from './funds.service';

@Module({
  controllers: [FundsController],
  providers: [FundsService, PrismaService],
  exports: [FundsService],
})
export class FundsModule {}
