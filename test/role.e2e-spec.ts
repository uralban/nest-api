import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { User } from '../src/user/entities/user.entity';
import { Member } from '../src/members/entities/member.entity';
import { QuizAttempt } from '../src/quiz-attempt/entities/quiz-attempt.entity';
import { Notification } from '../src/notification/entities/notification.entity';
import { Company } from '../src/company/entities/company.entity';
import { Auth } from '../src/auth/entities/auth.entity';
import { Role } from '../src/role/entities/role.entity';
import { Request } from '../src/request/entities/request.entity';
import { Invitation } from '../src/invitation/entities/invitation.entity';
import { Quiz } from '../src/quiz/entities/quiz.entity';
import { Answer } from '../src/quiz/entities/answer.entity';
import { Question } from '../src/quiz/entities/question.entity';
import { RedisService } from '../src/redis/redis.service';
import * as cookieParser from 'cookie-parser';

const redisStore: Record<string, string> = {};

describe('RoleController (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST_TEST || 'localhost',
      port: +process.env.DB_PORT_TEST,
      username: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME_TEST,
      entities: [
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
        Notification,
      ],
      synchronize: false,
      migrations: ['dist/database/migrations/*.js'],
      migrationsRun: true,
      logging: false,
    });
    await dataSource.initialize();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getDataSourceToken())
      .useValue(dataSource)
      .overrideProvider(RedisService)
      .useValue({
        set: async (key: string, value: string, ttl?: number) => {
          redisStore[key] = value;
          return 'OK';
        },
        get: async (key: string) => {
          return redisStore[key] || null;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();
    await app.listen(0);
  }, 5000);

  afterAll(async () => {
    await app.close();
  });

  describe('GET /role', () => {
    it('should return role list', async () => {
      const response = await request(app.getHttpServer())
        .get(`/role`)
        .expect(HttpStatus.OK);
      expect(response.body).toHaveLength(3);
    });
  });
});
