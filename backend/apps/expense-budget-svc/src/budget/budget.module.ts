import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { BudgetController } from './budget.controller';
import { BudgetService } from './budget.service';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { QUEUE_BUDGET_ALERTS } from '@backend/events';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'BUDGET_ALERTS_CLIENT',
        transport: Transport.RMQ,
        options: {
          urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
          queue: QUEUE_BUDGET_ALERTS,
          queueOptions: {
            durable: true,
            arguments: {
              'x-dead-letter-exchange': '',
              'x-dead-letter-routing-key': `dlq.${QUEUE_BUDGET_ALERTS}`,
            },
          },
        },
      },
    ]),
  ],
  controllers: [BudgetController],
  providers: [PrismaService, BudgetService],
  exports: [PrismaService, BudgetService],
})
export class BudgetModule {}
