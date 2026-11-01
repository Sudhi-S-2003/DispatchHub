import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { Logger, ValidationPipe } from '@nestjs/common';
import { APP_CONSTANTS } from './common/constants/index.js';
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';

async function bootstrap() {
  const logger = new Logger('DispatchHub-Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Global standard exception filter and transform interceptor
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Enable CORS for Next.js frontend
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  const port = process.env.PORT || APP_CONSTANTS.DEFAULT_PORT;
  await app.listen(port);
  logger.log(`🚀 DispatchHub ${APP_CONSTANTS.VERSION} running on: http://localhost:${port}`);
  logger.log(`📡 Endpoints available at: http://localhost:${port}/api/v1/...`);
}

bootstrap();
