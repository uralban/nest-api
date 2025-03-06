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

const redisStore: Record<string, string> = {};

describe('AnalyticsController (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let companyRepository: Repository<Company>;
  let memberRepository: Repository<Member>;
  let roleRepository: Repository<Role>;
  let quizRepository: Repository<Quiz>;
  let quizAttemptRepository: Repository<QuizAttempt>;
  let authToken: string;
  let dataSource: DataSource;
  let currentUser: User;
  let createdCompanyIds: string[] = [];
  let createdUserIds: string[] = [];
  let createdQuizIds: string[] = [];
  let createdAttemptIds: string[] = [];
  let ownerRole: Role;
  let memberRole: Role;
  let adminRole: Role;

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
    memberRepository = dataSource.getRepository(Member);
    roleRepository = dataSource.getRepository(Role);
    quizRepository = dataSource.getRepository(Quiz);
    quizAttemptRepository = dataSource.getRepository(QuizAttempt);

    currentUser = await userRepository.save({
      emailLogin: 'test_analytics@mailinator.com',
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

    ownerRole = await roleRepository.findOne({ where: { roleName: 'owner' } });
    memberRole = await roleRepository.findOne({
      where: { roleName: 'member' },
    });
    adminRole = await roleRepository.findOne({ where: { roleName: 'admin' } });
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
    if (createdQuizIds.length > 0) {
      await quizRepository.delete({ id: In(createdQuizIds) });
    }
    if (createdAttemptIds.length > 0) {
      await quizAttemptRepository.delete({ id: In(createdAttemptIds) });
    }
  });

  describe('GET /analytics/user/quiz-scores', () => {
    it('should return user quiz scores', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'TestCompany',
      });
      createdCompanyIds.push(existCompany.id);
      const existQuiz: Quiz = await quizRepository.save({
        title: 'TestQuiz',
        company: existCompany,
        frequencyInDays: 1,
        questions: [],
      });
      createdQuizIds.push(existQuiz.id);
      const existAttempt: QuizAttempt = await quizAttemptRepository.save({
        user: currentUser,
        quiz: existQuiz,
        createdAt: new Date(),
        answersScore: 5,
        questionCount: 10,
      });
      createdAttemptIds.push(existAttempt.id);
      const response = await request(app.getHttpServer())
        .get('/analytics/user/quiz-scores')
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].quizzesScore).toHaveLength(1);
      expect(response.body[0].quizzesScore[0].score).toBeDefined();
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get(`/analytics/user/quiz-scores`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /analytics/user/company-score/:companyId', () => {
    it('should return user company score', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'TestCompany',
      });
      createdCompanyIds.push(existCompany.id);
      const existQuiz: Quiz = await quizRepository.save({
        title: 'TestQuiz',
        company: existCompany,
        frequencyInDays: 1,
        questions: [],
      });
      createdQuizIds.push(existQuiz.id);
      const existAttempt: QuizAttempt = await quizAttemptRepository.save({
        user: currentUser,
        quiz: existQuiz,
        createdAt: new Date(),
        answersScore: 5,
        questionCount: 10,
      });
      createdAttemptIds.push(existAttempt.id);
      const response = await request(app.getHttpServer())
        .get(`/analytics/user/company-score/${existCompany.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body.score).toBeDefined();
    });

    it('should return 401 without token', async () => {
      const companyId: string = 'some-id';
      await request(app.getHttpServer())
        .get(`/analytics/user/company-score/${companyId}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /analytics/user/quiz-with-time', () => {
    it('should return user quiz list with last attempt dates', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'TestCompany',
      });
      createdCompanyIds.push(existCompany.id);
      const existQuiz: Quiz = await quizRepository.save({
        title: 'TestQuiz',
        company: existCompany,
        frequencyInDays: 1,
        questions: [],
      });
      createdQuizIds.push(existQuiz.id);
      const existAttempt: QuizAttempt = await quizAttemptRepository.save({
        user: currentUser,
        quiz: existQuiz,
        createdAt: new Date(),
        answersScore: 5,
        questionCount: 10,
      });
      createdAttemptIds.push(existAttempt.id);
      const response = await request(app.getHttpServer())
        .get('/analytics/user/quiz-with-time')
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].attemptDate).toBeDefined();
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get(`/analytics/user/quiz-with-time`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /analytics/company/user-scores/:companyId', () => {
    it('should return company user scores for owner', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'TestCompany',
        owner: currentUser,
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: ownerRole,
      });
      const existQuiz: Quiz = await quizRepository.save({
        title: 'TestQuiz',
        company: existCompany,
        frequencyInDays: 1,
        questions: [],
      });
      createdQuizIds.push(existQuiz.id);
      const existAttempt: QuizAttempt = await quizAttemptRepository.save({
        user: currentUser,
        quiz: existQuiz,
        createdAt: new Date(),
        answersScore: 5,
        questionCount: 10,
      });
      createdAttemptIds.push(existAttempt.id);
      const response = await request(app.getHttpServer())
        .get(`/analytics/company/user-scores/${existCompany.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].quizzes).toHaveLength(1);
    });

    it('should return company user scores for admin', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'TestCompany',
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: adminRole,
      });
      const anotherUser: User = await userRepository.save({
        emailLogin: 'get-company-user-scores1@test.com',
        passHash: '',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      await memberRepository.save({
        company: existCompany,
        user: anotherUser,
        role: memberRole,
      });
      const existQuiz: Quiz = await quizRepository.save({
        title: 'TestQuiz',
        company: existCompany,
        frequencyInDays: 1,
        questions: [],
      });
      createdQuizIds.push(existQuiz.id);
      const existAttempt: QuizAttempt = await quizAttemptRepository.save({
        user: anotherUser,
        quiz: existQuiz,
        createdAt: new Date(),
        answersScore: 5,
        questionCount: 10,
      });
      createdAttemptIds.push(existAttempt.id);
      const response = await request(app.getHttpServer())
        .get(`/analytics/company/user-scores/${existCompany.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].quizzes).toHaveLength(1);
    });

    it('should not return company user scores for member', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'TestCompany',
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: memberRole,
      });
      const anotherUser: User = await userRepository.save({
        emailLogin: 'get-company-user-scores2@test.com',
        passHash: '',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      await memberRepository.save({
        company: existCompany,
        user: anotherUser,
        role: memberRole,
      });
      const existQuiz: Quiz = await quizRepository.save({
        title: 'TestQuiz',
        company: existCompany,
        frequencyInDays: 1,
        questions: [],
      });
      createdQuizIds.push(existQuiz.id);
      const existAttempt: QuizAttempt = await quizAttemptRepository.save({
        user: anotherUser,
        quiz: existQuiz,
        createdAt: new Date(),
        answersScore: 5,
        questionCount: 10,
      });
      createdAttemptIds.push(existAttempt.id);
      await request(app.getHttpServer())
        .get(`/analytics/company/user-scores/${existCompany.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should return 401 without token', async () => {
      const companyId: string = 'some-id';
      await request(app.getHttpServer())
        .get(`/analytics/company/user-scores/${companyId}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /analytics/company/quiz-scores/:companyId', () => {
    it('should return company quiz scores for owner', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'TestCompany',
        owner: currentUser,
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: ownerRole,
      });
      const anotherUser: User = await userRepository.save({
        emailLogin: 'get-company-quiz-scores1@test.com',
        passHash: '',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      await memberRepository.save({
        company: existCompany,
        user: anotherUser,
        role: memberRole,
      });
      const existQuiz: Quiz = await quizRepository.save({
        title: 'TestQuiz',
        company: existCompany,
        frequencyInDays: 1,
        questions: [],
      });
      createdQuizIds.push(existQuiz.id);
      const existAttempt: QuizAttempt = await quizAttemptRepository.save({
        user: anotherUser,
        quiz: existQuiz,
        createdAt: new Date(),
        answersScore: 5,
        questionCount: 10,
      });
      createdAttemptIds.push(existAttempt.id);
      const response = await request(app.getHttpServer())
        .get(`/analytics/company/quiz-scores/${existCompany.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].userName).toBe('Test User');
      expect(response.body[0].quizzesScore).toHaveLength(1);
    });

    it('should return company quiz scores for admin', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'TestCompany',
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: adminRole,
      });
      const anotherUser: User = await userRepository.save({
        emailLogin: 'get-company-quiz-scores2@test.com',
        passHash: '',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      await memberRepository.save({
        company: existCompany,
        user: anotherUser,
        role: memberRole,
      });
      const existQuiz: Quiz = await quizRepository.save({
        title: 'TestQuiz',
        company: existCompany,
        frequencyInDays: 1,
        questions: [],
      });
      createdQuizIds.push(existQuiz.id);
      const existAttempt: QuizAttempt = await quizAttemptRepository.save({
        user: anotherUser,
        quiz: existQuiz,
        createdAt: new Date(),
        answersScore: 5,
        questionCount: 10,
      });
      createdAttemptIds.push(existAttempt.id);
      const response = await request(app.getHttpServer())
        .get(`/analytics/company/quiz-scores/${existCompany.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].userName).toBe('Test User');
      expect(response.body[0].quizzesScore).toHaveLength(1);
    });

    it('should not return company quiz scores for member', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'TestCompany',
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: memberRole,
      });
      const anotherUser: User = await userRepository.save({
        emailLogin: 'get-company-quiz-scores3@test.com',
        passHash: '',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      await memberRepository.save({
        company: existCompany,
        user: anotherUser,
        role: memberRole,
      });
      const existQuiz: Quiz = await quizRepository.save({
        title: 'TestQuiz',
        company: existCompany,
        frequencyInDays: 1,
        questions: [],
      });
      createdQuizIds.push(existQuiz.id);
      const existAttempt: QuizAttempt = await quizAttemptRepository.save({
        user: anotherUser,
        quiz: existQuiz,
        createdAt: new Date(),
        answersScore: 5,
        questionCount: 10,
      });
      createdAttemptIds.push(existAttempt.id);
      await request(app.getHttpServer())
        .get(`/analytics/company/quiz-scores/${existCompany.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should return 401 without token', async () => {
      const companyId = 'some-id';
      await request(app.getHttpServer())
        .get(`/analytics/company/quiz-scores/${companyId}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /analytics/company/users-last-attempts/:companyId', () => {
    it('should return company users last attempts for owner', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'TestCompany',
        owner: currentUser,
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: ownerRole,
      });
      const anotherUser: User = await userRepository.save({
        emailLogin: 'get-company-users-last-attempts1@test.com',
        passHash: '',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      await memberRepository.save({
        company: existCompany,
        user: anotherUser,
        role: memberRole,
      });
      const existQuiz: Quiz = await quizRepository.save({
        title: 'TestQuiz',
        company: existCompany,
        frequencyInDays: 1,
        questions: [],
      });
      createdQuizIds.push(existQuiz.id);
      const existAttempt: QuizAttempt = await quizAttemptRepository.save({
        user: anotherUser,
        quiz: existQuiz,
        createdAt: new Date(),
        answersScore: 5,
        questionCount: 10,
      });
      createdAttemptIds.push(existAttempt.id);
      const response = await request(app.getHttpServer())
        .get(`/analytics/company/users-last-attempts/${existCompany.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].attemptDate).toBeDefined();
    });

    it('should return company users last attempts for admin', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'TestCompany',
        owner: currentUser,
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: adminRole,
      });
      const anotherUser: User = await userRepository.save({
        emailLogin: 'get-company-users-last-attempts2@test.com',
        passHash: '',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      await memberRepository.save({
        company: existCompany,
        user: anotherUser,
        role: memberRole,
      });
      const existQuiz: Quiz = await quizRepository.save({
        title: 'TestQuiz',
        company: existCompany,
        frequencyInDays: 1,
        questions: [],
      });
      createdQuizIds.push(existQuiz.id);
      const existAttempt: QuizAttempt = await quizAttemptRepository.save({
        user: anotherUser,
        quiz: existQuiz,
        createdAt: new Date(),
        answersScore: 5,
        questionCount: 10,
      });
      createdAttemptIds.push(existAttempt.id);
      const response = await request(app.getHttpServer())
        .get(`/analytics/company/users-last-attempts/${existCompany.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].attemptDate).toBeDefined();
    });

    it('should not return company users last attempts for member', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'TestCompany',
        owner: currentUser,
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: memberRole,
      });
      const anotherUser: User = await userRepository.save({
        emailLogin: 'get-company-users-last-attempts3@test.com',
        passHash: '',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      await memberRepository.save({
        company: existCompany,
        user: anotherUser,
        role: memberRole,
      });
      const existQuiz: Quiz = await quizRepository.save({
        title: 'TestQuiz',
        company: existCompany,
        frequencyInDays: 1,
        questions: [],
      });
      createdQuizIds.push(existQuiz.id);
      const existAttempt: QuizAttempt = await quizAttemptRepository.save({
        user: anotherUser,
        quiz: existQuiz,
        createdAt: new Date(),
        answersScore: 5,
        questionCount: 10,
      });
      createdAttemptIds.push(existAttempt.id);
      await request(app.getHttpServer())
        .get(`/analytics/company/users-last-attempts/${existCompany.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should return 401 without token', async () => {
      const companyId = 'some-id';
      await request(app.getHttpServer())
        .get(`/analytics/company/users-last-attempts/${companyId}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
