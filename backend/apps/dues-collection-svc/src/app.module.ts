import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { DuesModule } from './dues/dues.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { QUEUE_LEDGER } from '@backend/events';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from '@bdoea-fs/auth';

const rabbitMqClients = ClientsModule.register([
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
]);

@Module({
  imports: [DuesModule, rabbitMqClients],
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
