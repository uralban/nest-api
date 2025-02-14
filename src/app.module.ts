import { Global, INestApplication, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './config/app-data-source';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from './user/user.module';
import { RoleModule } from './role/role.module';
import { AuthModule } from './auth/auth.module';
import { AuthService } from './auth/auth.service';
import { Auth } from './auth/entities/auth.entity';
import { User } from './user/entities/user.entity';
import { Role } from './role/entities/role.entity';
import { RedisModule } from './redis/redis.module';
import { UserService } from './user/user.service';
import { CompanyModule } from './company/company.module';
import { VisibilityModule } from './visibility/visibility.module';
import { Visibility } from './visibility/entity/visibility.entity';
import { Company } from './company/entities/company.entity';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    TypeOrmModule.forFeature([Auth, User, Role, Visibility, Company]),
    UserModule,
    RoleModule,
    AuthModule,
    RedisModule,
    CompanyModule,
    VisibilityModule,
  ],
  controllers: [AppController],
  providers: [AppService, AuthService, UserService],
  exports: [TypeOrmModule],
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
    SwaggerModule.setup('api-document', app, document);
  }
}
