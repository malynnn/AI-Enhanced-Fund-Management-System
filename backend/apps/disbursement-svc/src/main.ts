import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { QUEUE_DISBURSEMENTS, QUEUE_REPAYMENTS } from '@backend/events';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  const app = await NestFactory.create(AppModule);

  // Consumer: Disbursements queue
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
      queue: QUEUE_DISBURSEMENTS,
      queueOptions: {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': `dlq.${QUEUE_DISBURSEMENTS}`,
        },
      },
      noAck: false,
    },
  });

  // Consumer: Repayments queue
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
      queue: QUEUE_REPAYMENTS,
      queueOptions: {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': `dlq.${QUEUE_REPAYMENTS}`,
        },
      },
      noAck: false,
    },
  });

  const port = process.env.PORT || 3003;
  
  await app.startAllMicroservices();
  await app.listen(port);

  logger.log(`Disbursement Service ready`);
  logger.log(`🚀 disbursement-svc HTTP is running on port ${port}`);
  logger.log(`📡 Connected to DB: ${process.env.DATABASE_URL ? '[configured]' : '⚠️ DATABASE_URL not set!'}`);
}
bootstrap();
