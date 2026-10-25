import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  });

  const port = process.env.API_PORT || 4000;
  await app.listen(port);
  console.log(`VeriSync API server running on: http://localhost:${port}/api/v1`);
}

void bootstrap();
