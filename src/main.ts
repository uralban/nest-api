import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GeneralResponseInterceptor } from './global/interceptors/general-response/general-response.interceptor';
import { ErrorHandlerFilter } from './global/filters/error-handler-filter/error-handler.filter';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalInterceptors(new GeneralResponseInterceptor());
  app.useGlobalFilters(new ErrorHandlerFilter());

  AppModule.setupSwagger(app);

  app.enableCors({
    origin: process.env.CORS_ALLOWED_ORIGINS,
    methods: process.env.CORS_ALLOWED_METHODS,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true,
  });

  app.use(cookieParser());

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
