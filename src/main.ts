import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

require('dotenv').config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  AppModule.setupSwagger(app);

  app.enableCors({
    origin: process.env.CORS_ALLOWED_ORIGINS,
    methods: process.env.CORS_ALLOWED_METHODS,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  await app.listen(process.env.API_PORT ?? 3000);
}
bootstrap();
