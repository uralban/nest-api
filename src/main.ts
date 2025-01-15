import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

require('dotenv').config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  AppModule.setupSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
