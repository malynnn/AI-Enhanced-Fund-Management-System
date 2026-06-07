import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ClientsModule, Transport } from '@nestjs/microservices';
import {
  QUEUE_DUES,
  QUEUE_DISBURSEMENTS,
  QUEUE_REPAYMENTS,
  QUEUE_BUDGET_ALERTS,
  QUEUE_AUDIT,
} from '@backend/events';
import { JwtAuthGuard } from '@bdoea-fs/auth';
import { PrismaService } from './prisma.service';
import { AccountsModule } from './accounts/accounts.module';
import { FundsModule } from './funds/funds.module';

const rabbitMqClients = ClientsModule.register([
  { name: 'DUES_CLIENT', transport: Transport.RMQ, options: { urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'], queue: QUEUE_DUES, queueOptions: { durable: true, arguments: { 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': `dlq.${QUEUE_DUES}` } } } },
  { name: 'DISBURSEMENTS_CLIENT', transport: Transport.RMQ, options: { urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'], queue: QUEUE_DISBURSEMENTS, queueOptions: { durable: true, arguments: { 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': `dlq.${QUEUE_DISBURSEMENTS}` } } } },
  { name: 'REPAYMENTS_CLIENT', transport: Transport.RMQ, options: { urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'], queue: QUEUE_REPAYMENTS, queueOptions: { durable: true, arguments: { 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': `dlq.${QUEUE_REPAYMENTS}` } } } },
  { name: 'BUDGET_ALERTS_CLIENT', transport: Transport.RMQ, options: { urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'], queue: QUEUE_BUDGET_ALERTS, queueOptions: { durable: true, arguments: { 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': `dlq.${QUEUE_BUDGET_ALERTS}` } } } },
  { name: 'AUDIT_CLIENT', transport: Transport.RMQ, options: { urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'], queue: QUEUE_AUDIT, queueOptions: { durable: true, arguments: { 'x-dead-letter-exchange': '', 'x-dead-letter-routing-key': `dlq.${QUEUE_AUDIT}` } } } },
]);

@Module({
  imports: [rabbitMqClients, AccountsModule, FundsModule],
  providers: [
    PrismaService,
    // Global JWT guard via factory — Reflector is instantiated manually
    // so NestJS DI does not need to resolve it from any module scope.
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
