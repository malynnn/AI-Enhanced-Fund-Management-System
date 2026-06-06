import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';


async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT || 3001;
  await app.listen(port);

  logger.log(`🚀 ledger-accounts-svc is running on port ${port}`);
  logger.log(`📡 Connected to DB: ${process.env.DATABASE_URL ? '[configured]' : '⚠️ DATABASE_URL not set!'}`);
}
bootstrap();
