import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DuesController } from './dues.controller';
import { DuesService } from './dues.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { QUEUE_LEDGER } from '@backend/events';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'LEDGER_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
          queue: QUEUE_LEDGER,
          queueOptions: {
            durable: true,
            arguments: {
              'x-dead-letter-exchange': '',
              'x-dead-letter-routing-key': `dlq.${QUEUE_LEDGER}`,
            },
          },
        },
      },
    ]),
  ],
  controllers: [DuesController],
  providers: [PrismaService, DuesService],
  exports: [PrismaService, DuesService],
})
export class DuesModule {}
