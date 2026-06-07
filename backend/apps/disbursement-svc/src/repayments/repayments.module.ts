import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RepaymentsController } from './repayments.controller';
import { OverpaymentsController } from './overpayments.controller';
import { RepaymentsService } from './repayments.service';
import { ClientsModule, Transport } from '@nestjs/microservices';

const LAS_QUEUE = 'queue.ledger';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'LAS_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
          queue: LAS_QUEUE,
          queueOptions: {
            durable: true,
            arguments: {
              'x-dead-letter-exchange': '',
              'x-dead-letter-routing-key': `dlq.${LAS_QUEUE}`,
            },
          },
        },
      },
    ]),
  ],
  controllers: [RepaymentsController, OverpaymentsController],
  providers: [PrismaService, RepaymentsService],
  exports: [PrismaService, RepaymentsService],
})
export class RepaymentsModule {}
