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
import { Company } from './company/entities/company.entity';
import { InvitationModule } from './invitation/invitation.module';
import { RequestModule } from './request/request.module';
import { Request } from './request/entities/request.entity';
import { MemberModule } from './members/member.module';
import { Member } from './members/entities/member.entity';
import { Invitation } from './invitation/entities/invitation.entity';
import { QuizModule } from './quiz/quiz.module';
import { QuizAttemptModule } from './quiz-attempt/quiz-attempt.module';
import { Quiz } from './quiz/entities/quiz.entity';
import { QuizAttempt } from './quiz-attempt/entities/quiz-attempt.entity';
import { Answer } from './quiz/entities/answer.entity';
import { Question } from './quiz/entities/question.entity';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot(dataSourceOptions),
    TypeOrmModule.forFeature([
      Auth,
      User,
      Role,
      Company,
      Request,
      Invitation,
      Member,
      Quiz,
      QuizAttempt,
      Answer,
      Question,
    ]),
    UserModule,
    RoleModule,
    AuthModule,
    RedisModule,
    CompanyModule,
    InvitationModule,
    RequestModule,
    MemberModule,
    QuizModule,
    QuizAttemptModule,
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
