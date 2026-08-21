import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';
import helmet from 'helmet';
import * as compression from 'compression';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Security & Performance Middlewares
  app.use(helmet());
  app.use(compression());

  // Enable CORS
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:8080', '*'];
  app.enableCors({
    origin: allowedOrigins.includes('*') ? true : allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global Prefix: /api
  const globalPrefix = process.env.API_PREFIX || 'api';
  app.setGlobalPrefix(globalPrefix);

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      forbidUnknownValues: false,
    }),
  );

  // Global Interceptors & Exception Filters
  app.useGlobalInterceptors(new TransformResponseInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter(), new PrismaExceptionFilter());

  // Swagger Documentation Setup at /api/docs
  const config = new DocumentBuilder()
    .setTitle('Fleet - Rent-a-Car Fleet Management & B2B Partner Network API')
    .setDescription(
      `REST API for Fleet: Mobile-first Multi-tenant Rent-a-Car Fleet Management, B2B Partner Rentals, and Version 2 Public Marketplace Foundation.\n\n` +
      `### Namespaces:\n` +
      `- **/api/auth/**: Authentication, Organization Registration, and Token Refresh\n` +
      `- **/api/internal/**: Private Rent-a-Car Operations (Vehicles, Customers, Bookings, Maintenance, Finance, Dashboard, Reports)\n` +
      `- **/api/partner/**: B2B Trusted Partner Network (Directory, Sourcing Requests, Offers, Rentals, Handovers, Settlements)\n` +
      `- **/api/public/**: Version 2 Public Discovery (Only Published Organizations & Vehicles, Zero Private Leakage)\n` +
      `- **/api/customer/**: Version 2 Authenticated End-Customer Marketplace Stubs\n`,
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your JWT access token',
        in: 'header',
      },
      'bearer',
    )
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-organization-id',
        in: 'header',
        description: 'Tenant Organization UUID context for multi-organization users',
      },
      'x-organization-id',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${globalPrefix}/docs`, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Fleet API Documentation',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`🚗 Fleet Backend running on: http://localhost:${port}/${globalPrefix}`);
  logger.log(`📚 Swagger Documentation: http://localhost:${port}/${globalPrefix}/docs`);
}

bootstrap();
