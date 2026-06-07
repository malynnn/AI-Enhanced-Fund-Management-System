import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PettyCashController } from './petty-cash.controller';
import { PettyCashService } from './petty-cash.service';

@Module({
  controllers: [PettyCashController],
  providers: [PrismaService, PettyCashService],
  exports: [PrismaService, PettyCashService],
})
export class PettyCashModule {}
