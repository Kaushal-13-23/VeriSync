import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import express from 'express';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // OWASP API Top 10: Security Headers (NFR-SEC-012)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
        },
      },
      frameguard: { action: 'deny' },
      hsts: { maxAge: 31536000, includeSubDomains: true },
      noSniff: true,
      xssFilter: true,
    }),
  );

  // Request size limits against payload flooding DoS attacks (SRS 8.3.2)
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ limit: '1mb', extended: true }));

  app.setGlobalPrefix('api/v1');

  // Strict CORS origin configuration (NFR-SEC-012)
  const allowedOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
    : ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser requests (e.g. Electron apps, internal services, unit tests)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin '${origin}' not allowed by CORS policy`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'Idempotency-Key',
      'X-Correlation-Id',
      'X-Device-Id',
      'X-Client-Version',
    ],
  });

  // Strict input validation preventing parameter injection (Rule 6, NFR-SEC-007)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter ensuring zero internal stack or secret leaks (NFR-REL-005, SRS 8.3.3)
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.API_PORT || 4000;
  await app.listen(port);
  console.log(`VeriSync API server running on: http://localhost:${port}/api/v1`);
}

void bootstrap();
