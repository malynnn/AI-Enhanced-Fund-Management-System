import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { WriteOffsController } from './write-offs.controller';
import { WriteOffsService } from './write-offs.service';
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
  controllers: [WriteOffsController],
  providers: [PrismaService, WriteOffsService],
  exports: [PrismaService, WriteOffsService],
})
export class WriteOffsModule {}
