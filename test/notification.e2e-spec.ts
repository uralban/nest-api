import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { User } from '../src/user/entities/user.entity';
import { LoginDto } from '../src/auth/dto/login.dto';
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
import { NotificationStatus } from '../src/global/enums/notification-status.enum';

const redisStore: Record<string, string> = {};

describe('NotificationsController (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let companyRepository: Repository<Company>;
  let notificationRepository: Repository<Notification>;
  let authToken: string;
  let dataSource: DataSource;
  let currentUser: User;
  let createdCompanyIds: string[] = [];
  let createdUserIds: string[] = [];
  let createdNotificationsIds: string[] = [];

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

    userRepository = dataSource.getRepository(User);
    companyRepository = dataSource.getRepository(Company);
    notificationRepository = dataSource.getRepository(Notification);

    currentUser = await userRepository.save({
      emailLogin: 'test_notifications@mailinator.com',
      passHash: '$2b$10$thRF15WycBQ3uocoebpsk.YhUnJjz8QNk2A5KZKK6E4YGTHiS9Cc2',
      firstName: 'Test',
      lastName: 'User',
      avatarUrl: '',
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: currentUser.emailLogin,
        password: 'password123',
      } as LoginDto)
      .expect(HttpStatus.CREATED);

    const cookies = loginResponse.get('Set-Cookie');
    authToken = cookies
      .find((cookie: string) => cookie.startsWith('access_token='))
      ?.split(';')[0]
      .replace('access_token=', '');
  }, 5000);

  afterAll(async () => {
    const authUser: User = await userRepository.findOne({
      where: { emailLogin: currentUser.emailLogin },
    });
    if (authUser) await userRepository.remove(authUser);
    await app.close();
  });

  afterEach(async () => {
    if (createdCompanyIds.length > 0) {
      await companyRepository.delete({ id: In(createdCompanyIds) });
    }
    if (createdUserIds.length > 0) {
      await userRepository.delete({ id: In(createdUserIds) });
    }
    if (createdNotificationsIds.length > 0) {
      await userRepository.delete({ id: In(createdNotificationsIds) });
    }
  });

  describe('GET /notifications', () => {
    it('should return notifications list for any authenticated user', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
        owner: currentUser,
      });
      createdCompanyIds.push(existCompany.id);
      const notifList: Notification[] = await notificationRepository.save([
        {
          text: 'text-1',
          status: NotificationStatus.UNREAD,
          company: existCompany,
          user: currentUser,
        },
        {
          text: 'text-2',
          status: NotificationStatus.READ,
          company: existCompany,
          user: currentUser,
        },
      ]);
      notifList.forEach((notification: Notification) =>
        createdNotificationsIds.push(notification.id),
      );
      const response = await request(app.getHttpServer())
        .get(`/notifications`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body).toHaveLength(2);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get(`/notifications`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('PATCH /notifications/read/:notificationId', () => {
    it("should update notification status to 'read' for any authenticated user", async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
        owner: currentUser,
      });
      createdCompanyIds.push(existCompany.id);
      const existNotification: Notification = await notificationRepository.save(
        {
          text: 'text-1',
          status: NotificationStatus.UNREAD,
          company: existCompany,
          user: currentUser,
        },
      );
      createdNotificationsIds.push(existNotification.id);
      const response = await request(app.getHttpServer())
        .patch(`/notifications/read/${existNotification.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body.message).toBe('Completed successfully.');
      const updatedNotification: Notification =
        await notificationRepository.findOne({
          where: { id: existNotification.id },
        });
      expect(updatedNotification.status).toBe(NotificationStatus.READ);
    });

    it('should return 401 without token', async () => {
      const existNotificationId: string = 'some-notification-id';
      await request(app.getHttpServer())
        .patch(`/notifications/read/${existNotificationId}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
