import { INestApplication, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

@Module({
  imports: [],
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
