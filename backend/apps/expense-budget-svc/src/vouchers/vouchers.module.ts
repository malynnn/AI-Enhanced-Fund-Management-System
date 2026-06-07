import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { VouchersController } from './vouchers.controller';
import { VouchersService } from './vouchers.service';
import { ReceiptService } from './receipt.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { QUEUE_AUDIT, QUEUE_BUDGET_ALERTS } from '@backend/events';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Module({
  imports: [
    MulterModule.register({ storage: memoryStorage() }),
    ClientsModule.register([
      {
        name: 'AUDIT_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
          queue: QUEUE_AUDIT,
          queueOptions: { durable: true, arguments: { 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': `dlq.${QUEUE_AUDIT}` } },
        },
      },
      {
        name: 'BUDGET_ALERTS_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
          queue: QUEUE_BUDGET_ALERTS,
          queueOptions: { durable: true, arguments: { 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': `dlq.${QUEUE_BUDGET_ALERTS}` } },
        },
      },
    ]),
  ],
  controllers: [VouchersController],
  providers: [PrismaService, VouchersService, ReceiptService],
  exports: [PrismaService, VouchersService],
})
export class VouchersModule {}
