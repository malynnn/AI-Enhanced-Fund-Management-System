import * as dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env if present

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  
  // Enable CORS
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`🚀 fs-gateway HTTP reverse proxy is running on port ${port}`, 'Bootstrap');
}
bootstrap();
