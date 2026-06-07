import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { QUEUE_DUES } from '@backend/events';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  const app = await NestFactory.create(AppModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672'],
      queue: QUEUE_DUES,
      queueOptions: {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': `dlq.${QUEUE_DUES}`,
        },
      },
      noAck: false,
      // If RabbitMQ is unavailable, it will automatically log and retry
      // wait for connection before starting the microservice.
    },
  });

  const port = process.env.PORT || 3002;
  
  await app.startAllMicroservices();
  await app.listen(port);

  logger.log(`Dues Collection Service ready`);
  logger.log(`🚀 dues-collection-svc HTTP is running on port ${port}`);
  logger.log(`📡 Connected to DB: ${process.env.DATABASE_URL ? '[configured]' : '⚠️ DATABASE_URL not set!'}`);
}
bootstrap();
