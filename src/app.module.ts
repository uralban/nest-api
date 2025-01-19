import {INestApplication, Module} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {TypeOrmModule} from "@nestjs/typeorm";

require('dotenv').config();

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST,
      port: +process.env.DB_PORT,
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      entities: [],
      synchronize: process.env.NODE_ENV === 'development',
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})

export class AppModule {
  static setupSwagger(app: INestApplication): void {
    const config = new DocumentBuilder()
      .setTitle('Internship backend project')
      .setDescription(
        `
    This API serves as the backend for the my internship application. 
    At the moment it provides only one endpoint for check health data.
    
    Description will be updated in the future.
                        `,
      )
      .setVersion(process.env.API_VERSION)
      .addTag('API')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
  }
}
