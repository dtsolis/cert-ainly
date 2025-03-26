import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import * as hbs from 'hbs';
import { AppModule } from './app.module';
import { registerHandlebarsHelpers } from './utils/handlebars-helpers';
import { mkdir } from 'fs/promises';

async function bootstrap() {
  await mkdir('./data/uploads', { recursive: true });

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setViewEngine('hbs');
  app.setBaseViewsDir(join(__dirname, '..', '..', 'views'));
  hbs.registerPartials(join(__dirname, '..', '..', 'views', 'partials'));
  registerHandlebarsHelpers();

  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.useStaticAssets(join(__dirname, '..', '..', 'public'));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('cert-ainly API')
    .setDescription('API endpoints for managing certificates')
    .setVersion('1.0.0')
    .addTag('certificates', 'Certificate management operations')
    .addBasicAuth({ type: 'http', scheme: 'basic', description: 'Enter username and password' }, 'basic')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 9090;

  await app.listen(port);

  Logger.log(`Certificate monitor running with configuration on port: ${port}`, 'Bootstrap');
  Logger.log(`API Documentation: http://localhost:${port}/api`, 'Bootstrap');
  Logger.log(`Web UI: http://localhost:${port}`, 'Bootstrap');
}

void bootstrap();
