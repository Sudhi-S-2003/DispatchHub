import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { Logger } from '@nestjs/common';
import { APP_CONSTANTS } from './common/constants/index.js';

async function bootstrap() {
  const logger = new Logger('DispatchHub-Bootstrap');
  const app = await NestFactory.create(AppModule);

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
