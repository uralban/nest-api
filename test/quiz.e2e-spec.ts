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
import { UpdateMemberRoleDto } from '../src/members/dto/update-member.dto';
import { QuizDto } from '../src/quiz/dto/quiz.dto';
import { Visibility } from '../src/global/enums/visibility.enum';
import { PaginationOptionsDto } from '../src/global/dto/pagination-options.dto';

const redisStore: Record<string, string> = {};

describe('QuizController (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let companyRepository: Repository<Company>;
  let quizRepository: Repository<Quiz>;
  let questionRepository: Repository<Question>;
  let answerRepository: Repository<Answer>;
  let roleRepository: Repository<Role>;
  let memberRepository: Repository<Member>;
  let authToken: string;
  let dataSource: DataSource;
  let currentUser: User;
  let createdCompanyIds: string[] = [];
  let createdUserIds: string[] = [];
  let createdQuizIds: string[] = [];
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
    quizRepository = dataSource.getRepository(Quiz);
    questionRepository = dataSource.getRepository(Question);
    answerRepository = dataSource.getRepository(Answer);
    roleRepository = dataSource.getRepository(Role);
    memberRepository = dataSource.getRepository(Member);

    currentUser = await userRepository.save({
      emailLogin: 'test_quiz@mailinator.com',
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
  });

  describe('POST /quizzes/:companyId', () => {
    const createQuizDto: QuizDto = {
      title: 'Quiz',
      frequencyInDays: 1,
      questions: [
        {
          content: 'question1',
          answerOptions: [
            { content: 'answer11', isCorrect: true },
            { content: 'answer12', isCorrect: false },
          ],
        },
        {
          content: 'question2',
          answerOptions: [
            { content: 'answer21', isCorrect: true },
            { content: 'answer22', isCorrect: false },
          ],
        },
      ],
    };

    it('should create quiz if user is owner', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
        owner: currentUser,
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: ownerRole,
      });
      const response = await request(app.getHttpServer())
        .post(`/quizzes/${existCompany.id}`)
        .send({ ...createQuizDto, title: 'post-quiz-1' })
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.CREATED);
      expect(response.body.message).toBe('The quiz has been created.');
      const newQuiz: Quiz = await quizRepository.findOne({
        where: { title: 'post-quiz-1' },
        relations: {
          questions: {
            answerOptions: true,
          },
        },
      });
      createdQuizIds.push(newQuiz.id);
      expect(newQuiz).toBeDefined();
      expect(newQuiz.questions).toHaveLength(2);
      expect(newQuiz.questions[0].answerOptions).toHaveLength(2);
      expect(newQuiz.questions[1].answerOptions).toHaveLength(2);
    });

    it('should create quiz if user is admin', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: adminRole,
      });
      const response = await request(app.getHttpServer())
        .post(`/quizzes/${existCompany.id}`)
        .send({ ...createQuizDto, title: 'post-quiz-2' })
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.CREATED);
      expect(response.body.message).toBe('The quiz has been created.');
      const newQuiz: Quiz = await quizRepository.findOne({
        where: { title: 'post-quiz-2' },
        relations: {
          questions: {
            answerOptions: true,
          },
        },
      });
      createdQuizIds.push(newQuiz.id);
      expect(newQuiz).toBeDefined();
      expect(newQuiz.questions).toHaveLength(2);
      expect(newQuiz.questions[0].answerOptions).toHaveLength(2);
      expect(newQuiz.questions[1].answerOptions).toHaveLength(2);
    });

    it('should not create quiz if user is member', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: memberRole,
      });
      await request(app.getHttpServer())
        .post(`/quizzes/${existCompany.id}`)
        .send({ ...createQuizDto, title: 'post-quiz-3' })
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.FORBIDDEN);
      const newQuiz: Quiz = await quizRepository.findOne({
        where: { title: 'post-quiz-3' },
        relations: {
          questions: {
            answerOptions: true,
          },
        },
      });
      expect(newQuiz).toBeNull();
    });

    it('should return 401 without token', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: adminRole,
      });
      const response = await request(app.getHttpServer())
        .post(`/quizzes/${existCompany.id}`)
        .send({ ...createQuizDto, title: 'post-quiz-4' })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /quizzes/company/:companyId', () => {
    it('should get all quiz with pagination if user is owner', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
        owner: currentUser,
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: ownerRole,
      });
      const existQuizzes: Quiz[] = await quizRepository.save([
        {
          title: 'quiz-get-for-company',
          frequencyInDays: 1,
          questions: [],
          company: existCompany,
        },
        {
          title: 'quiz-get-for-company',
          frequencyInDays: 1,
          questions: [],
          company: existCompany,
        },
        {
          title: 'quiz-get-for-company',
          frequencyInDays: 1,
          questions: [],
          company: existCompany,
        },
      ]);
      existQuizzes.forEach(quiz => createdQuizIds.push(quiz.id));
      const pageOptions = { page: 1, take: 10 } as PaginationOptionsDto;
      const response = await request(app.getHttpServer())
        .get(`/quizzes/company/${existCompany.id}`)
        .query(pageOptions)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.meta).toMatchObject({
        page: '1',
        take: '10',
        itemCount: 3,
        pageCount: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      });
    });

    it('should get all quiz with pagination if user is admin', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: adminRole,
      });
      const existQuizzes: Quiz[] = await quizRepository.save([
        {
          title: 'quiz-get-for-company',
          frequencyInDays: 1,
          questions: [],
          company: existCompany,
        },
        {
          title: 'quiz-get-for-company',
          frequencyInDays: 1,
          questions: [],
          company: existCompany,
        },
        {
          title: 'quiz-get-for-company',
          frequencyInDays: 1,
          questions: [],
          company: existCompany,
        },
      ]);
      existQuizzes.forEach(quiz => createdQuizIds.push(quiz.id));
      const pageOptions = { page: 1, take: 10 } as PaginationOptionsDto;
      const response = await request(app.getHttpServer())
        .get(`/quizzes/company/${existCompany.id}`)
        .query(pageOptions)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.meta).toMatchObject({
        page: '1',
        take: '10',
        itemCount: 3,
        pageCount: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      });
    });

    it('should get all quiz with pagination if user is member', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: memberRole,
      });
      const existQuizzes: Quiz[] = await quizRepository.save([
        {
          title: 'quiz-get-for-company',
          frequencyInDays: 1,
          questions: [],
          company: existCompany,
        },
        {
          title: 'quiz-get-for-company',
          frequencyInDays: 1,
          questions: [],
          company: existCompany,
        },
        {
          title: 'quiz-get-for-company',
          frequencyInDays: 1,
          questions: [],
          company: existCompany,
        },
      ]);
      existQuizzes.forEach(quiz => createdQuizIds.push(quiz.id));
      const pageOptions = { page: 1, take: 10 } as PaginationOptionsDto;
      const response = await request(app.getHttpServer())
        .get(`/quizzes/company/${existCompany.id}`)
        .query(pageOptions)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.meta).toMatchObject({
        page: '1',
        take: '10',
        itemCount: 3,
        pageCount: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      });
    });

    it('should not get any quiz with pagination if user is not member', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      const existQuizzes: Quiz[] = await quizRepository.save([
        {
          title: 'quiz-get-for-company',
          frequencyInDays: 1,
          questions: [],
          company: existCompany,
        },
        {
          title: 'quiz-get-for-company',
          frequencyInDays: 1,
          questions: [],
          company: existCompany,
        },
        {
          title: 'quiz-get-for-company',
          frequencyInDays: 1,
          questions: [],
          company: existCompany,
        },
      ]);
      existQuizzes.forEach(quiz => createdQuizIds.push(quiz.id));
      const pageOptions = { page: 1, take: 10 } as PaginationOptionsDto;
      request(app.getHttpServer())
        .get(`/quizzes/company/${existCompany.id}`)
        .query(pageOptions)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should return 401 without token', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: memberRole,
      });
      createdCompanyIds.push(existCompany.id);
      const existQuizzes: Quiz[] = await quizRepository.save([
        {
          title: 'quiz-get-for-company',
          frequencyInDays: 1,
          questions: [],
          company: existCompany,
        },
        {
          title: 'quiz-get-for-company',
          frequencyInDays: 1,
          questions: [],
          company: existCompany,
        },
        {
          title: 'quiz-get-for-company',
          frequencyInDays: 1,
          questions: [],
          company: existCompany,
        },
      ]);
      existQuizzes.forEach(quiz => createdQuizIds.push(quiz.id));
      const pageOptions = { page: 1, take: 10 } as PaginationOptionsDto;
      request(app.getHttpServer())
        .get(`/quizzes/company/${existCompany.id}`)
        .query(pageOptions)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /quizzes/start/:quizId', () => {
    it('should return quiz without cut info if user is owner', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
        owner: currentUser,
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: ownerRole,
      });
      const existAnswer: Answer = await answerRepository.save({
        content: 'answer-get-quiz-start-1',
        isCorrect: true,
      });
      const existQuestion: Question = await questionRepository.save({
        content: 'question=get-quiz-start-1',
        answerOptions: [existAnswer],
      });
      const existQuiz: Quiz = await quizRepository.save({
        title: 'quiz',
        frequencyInDays: 1,
        questions: [existQuestion],
        company: existCompany,
      });
      createdQuizIds.push(existQuiz.id);
      const response = await request(app.getHttpServer())
        .get(`/quizzes/start/${existQuiz.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body.quiz.id).toBe(existQuiz.id);
      expect(
        response.body.quiz.questions[0].answerOptions[0].isCorrect,
      ).toBeUndefined();
    });

    it('should return quiz without cut info if user is admin', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: adminRole,
      });
      const existAnswer: Answer = await answerRepository.save({
        content: 'answer-get-quiz-start-2',
        isCorrect: true,
      });
      const existQuestion: Question = await questionRepository.save({
        content: 'question=get-quiz-start-2',
        answerOptions: [existAnswer],
      });
      const existQuiz: Quiz = await quizRepository.save({
        title: 'quiz',
        frequencyInDays: 1,
        questions: [existQuestion],
        company: existCompany,
      });
      createdQuizIds.push(existQuiz.id);
      const response = await request(app.getHttpServer())
        .get(`/quizzes/start/${existQuiz.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body.quiz.id).toBe(existQuiz.id);
      expect(
        response.body.quiz.questions[0].answerOptions[0].isCorrect,
      ).toBeUndefined();
    });

    it('should return quiz without cut info if user is member', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: memberRole,
      });
      const existAnswer: Answer = await answerRepository.save({
        content: 'answer-get-quiz-start-3',
        isCorrect: true,
      });
      const existQuestion: Question = await questionRepository.save({
        content: 'question=get-quiz-start-3',
        answerOptions: [existAnswer],
      });
      const existQuiz: Quiz = await quizRepository.save({
        title: 'quiz',
        frequencyInDays: 1,
        questions: [existQuestion],
        company: existCompany,
      });
      createdQuizIds.push(existQuiz.id);
      const response = await request(app.getHttpServer())
        .get(`/quizzes/start/${existQuiz.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body.quiz.id).toBe(existQuiz.id);
      expect(
        response.body.quiz.questions[0].answerOptions[0].isCorrect,
      ).toBeUndefined();
    });

    it('should not return quiz without cut info if user is not member', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      const existAnswer: Answer = await answerRepository.save({
        content: 'answer-get-quiz-start-4',
        isCorrect: true,
      });
      const existQuestion: Question = await questionRepository.save({
        content: 'question=get-quiz-start-4',
        answerOptions: [existAnswer],
      });
      const existQuiz: Quiz = await quizRepository.save({
        title: 'quiz',
        frequencyInDays: 1,
        questions: [existQuestion],
        company: existCompany,
      });
      createdQuizIds.push(existQuiz.id);
      await request(app.getHttpServer())
        .get(`/quizzes/start/${existQuiz.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should not return quiz without cut info if quiz not found', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: memberRole,
      });
      await request(app.getHttpServer())
        .get(`/quizzes/start/e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 401 without token', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: memberRole,
      });
      const existAnswer: Answer = await answerRepository.save({
        content: 'answer-get-quiz-start-3',
        isCorrect: true,
      });
      const existQuestion: Question = await questionRepository.save({
        content: 'question=get-quiz-start-3',
        answerOptions: [existAnswer],
      });
      const existQuiz: Quiz = await quizRepository.save({
        title: 'quiz',
        frequencyInDays: 1,
        questions: [existQuestion],
        company: existCompany,
      });
      createdQuizIds.push(existQuiz.id);
      const response = await request(app.getHttpServer())
        .get(`/quizzes/start/${existQuiz.id}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /quizzes/:quizId', () => {
    it('should return quiz with full info if user is owner', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
        owner: currentUser,
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: ownerRole,
      });
      const existAnswer: Answer = await answerRepository.save({
        content: 'answer-get-quiz-1',
        isCorrect: true,
      });
      const existQuestion: Question = await questionRepository.save({
        content: 'question=get-quiz-1',
        answerOptions: [existAnswer],
      });
      const existQuiz: Quiz = await quizRepository.save({
        title: 'quiz',
        frequencyInDays: 1,
        questions: [existQuestion],
        company: existCompany,
      });
      createdQuizIds.push(existQuiz.id);
      const response = await request(app.getHttpServer())
        .get(`/quizzes/${existQuiz.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body.id).toBe(existQuiz.id);
      expect(
        response.body.questions[0].answerOptions[0].isCorrect,
      ).toBeDefined();
    });

    it('should return quiz with full info if user is admin', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: adminRole,
      });
      const existAnswer: Answer = await answerRepository.save({
        content: 'answer-get-quiz-2',
        isCorrect: true,
      });
      const existQuestion: Question = await questionRepository.save({
        content: 'question=get-quiz-2',
        answerOptions: [existAnswer],
      });
      const existQuiz: Quiz = await quizRepository.save({
        title: 'quiz',
        frequencyInDays: 1,
        questions: [existQuestion],
        company: existCompany,
      });
      createdQuizIds.push(existQuiz.id);
      const response = await request(app.getHttpServer())
        .get(`/quizzes/${existQuiz.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body.id).toBe(existQuiz.id);
      expect(
        response.body.questions[0].answerOptions[0].isCorrect,
      ).toBeDefined();
    });

    it('should not return quiz with full info if user is member', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: memberRole,
      });
      const existAnswer: Answer = await answerRepository.save({
        content: 'answer-get-quiz-3',
        isCorrect: true,
      });
      const existQuestion: Question = await questionRepository.save({
        content: 'question=get-quiz-3',
        answerOptions: [existAnswer],
      });
      const existQuiz: Quiz = await quizRepository.save({
        title: 'quiz',
        frequencyInDays: 1,
        questions: [existQuestion],
        company: existCompany,
      });
      createdQuizIds.push(existQuiz.id);
      await request(app.getHttpServer())
        .get(`/quizzes/${existQuiz.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should return 401 without token', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: adminRole,
      });
      const existAnswer: Answer = await answerRepository.save({
        content: 'answer-get-quiz-4',
        isCorrect: true,
      });
      const existQuestion: Question = await questionRepository.save({
        content: 'question=get-quiz-4',
        answerOptions: [existAnswer],
      });
      const existQuiz: Quiz = await quizRepository.save({
        title: 'quiz',
        frequencyInDays: 1,
        questions: [existQuestion],
        company: existCompany,
      });
      createdQuizIds.push(existQuiz.id);
      await request(app.getHttpServer())
        .get(`/quizzes/${existQuiz.id}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('PATCH /quizzes/:quizId', () => {
    const updateQuizDto: QuizDto = {
      title: 'Quiz',
      frequencyInDays: 1,
      questions: [
        {
          content: 'question1',
          answerOptions: [
            { content: 'answer11', isCorrect: true },
            { content: 'answer12', isCorrect: false },
          ],
        },
        {
          content: 'question2',
          answerOptions: [
            { content: 'answer21', isCorrect: true },
            { content: 'answer22', isCorrect: false },
          ],
        },
      ],
    };

    it('should update quiz if user is owner', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
        owner: currentUser,
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: ownerRole,
      });
      const existQuiz: Quiz = await quizRepository.save({
        title: 'quiz',
        frequencyInDays: 1,
        questions: [],
        company: existCompany,
      });
      createdQuizIds.push(existQuiz.id);
      const response = await request(app.getHttpServer())
        .patch(`/quizzes/${existQuiz.id}`)
        .send({ ...updateQuizDto, title: 'patch-quiz-1' })
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body.message).toBe('Successfully updated quiz.');
      const updatedQuiz: Quiz = await quizRepository.findOne({
        where: { id: existQuiz.id },
        relations: {
          questions: {
            answerOptions: true,
          },
        },
      });
      expect(updatedQuiz.title).toBe('patch-quiz-1');
      expect(updatedQuiz.questions).toHaveLength(2);
      expect(updatedQuiz.questions[0].answerOptions).toHaveLength(2);
      expect(updatedQuiz.questions[1].answerOptions).toHaveLength(2);
    });

    it('should update quiz if user is admin', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: adminRole,
      });
      const existQuiz: Quiz = await quizRepository.save({
        title: 'quiz',
        frequencyInDays: 1,
        questions: [],
        company: existCompany,
      });
      createdQuizIds.push(existQuiz.id);
      const response = await request(app.getHttpServer())
        .patch(`/quizzes/${existQuiz.id}`)
        .send({ ...updateQuizDto, title: 'patch-quiz-2' })
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body.message).toBe('Successfully updated quiz.');
      const updatedQuiz: Quiz = await quizRepository.findOne({
        where: { id: existQuiz.id },
        relations: {
          questions: {
            answerOptions: true,
          },
        },
      });
      expect(updatedQuiz.title).toBe('patch-quiz-2');
      expect(updatedQuiz.questions).toHaveLength(2);
      expect(updatedQuiz.questions[0].answerOptions).toHaveLength(2);
      expect(updatedQuiz.questions[1].answerOptions).toHaveLength(2);
    });

    it('should not update quiz if user is member', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: memberRole,
      });
      const existQuiz: Quiz = await quizRepository.save({
        title: 'quiz',
        frequencyInDays: 1,
        questions: [],
        company: existCompany,
      });
      createdQuizIds.push(existQuiz.id);
      await request(app.getHttpServer())
        .patch(`/quizzes/${existQuiz.id}`)
        .send({ ...updateQuizDto, title: 'patch-quiz-3' })
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.FORBIDDEN);
      const updatedQuiz: Quiz = await quizRepository.findOne({
        where: { id: existQuiz.id },
        relations: {
          questions: {
            answerOptions: true,
          },
        },
      });
      expect(updatedQuiz.title).not.toBe('patch-quiz-3');
      expect(updatedQuiz.questions).toHaveLength(0);
    });

    it('should return 401 without token', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      const existQuiz: Quiz = await quizRepository.save({
        title: 'quiz',
        frequencyInDays: 1,
        questions: [],
        company: existCompany,
      });
      createdQuizIds.push(existQuiz.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: adminRole,
      });
      await request(app.getHttpServer())
        .patch(`/quizzes/${existQuiz.id}`)
        .send({ ...updateQuizDto, title: 'post-quiz-4' })
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('DELETE /quizzes/:quizId', () => {
    it('should delete quiz if user is owner', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
        owner: currentUser,
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: ownerRole,
      });
      const existQuiz: Quiz = await quizRepository.save({
        title: 'quiz',
        frequencyInDays: 1,
        questions: [],
        company: existCompany,
      });
      createdQuizIds.push(existQuiz.id);
      const response = await request(app.getHttpServer())
        .delete(`/quizzes/${existQuiz.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body.message).toBe('The quiz was successfully deleted.');
      const deletedQuiz: Quiz = await quizRepository.findOne({
        where: { id: existQuiz.id },
      });
      expect(deletedQuiz).toBeNull();
    });

    it('should delete quiz if user is admin', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: adminRole,
      });
      const existQuiz: Quiz = await quizRepository.save({
        title: 'quiz',
        frequencyInDays: 1,
        questions: [],
        company: existCompany,
      });
      createdQuizIds.push(existQuiz.id);
      const response = await request(app.getHttpServer())
        .delete(`/quizzes/${existQuiz.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body.message).toBe('The quiz was successfully deleted.');
      const deletedQuiz: Quiz = await quizRepository.findOne({
        where: { id: existQuiz.id },
      });
      expect(deletedQuiz).toBeNull();
    });

    it('should not delete quiz if user is member', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: memberRole,
      });
      const existQuiz: Quiz = await quizRepository.save({
        title: 'quiz',
        frequencyInDays: 1,
        questions: [],
        company: existCompany,
      });
      createdQuizIds.push(existQuiz.id);
      await request(app.getHttpServer())
        .delete(`/quizzes/${existQuiz.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.FORBIDDEN);
      const deletedQuiz: Quiz = await quizRepository.findOne({
        where: { id: existQuiz.id },
      });
      expect(deletedQuiz).toBeDefined();
    });

    it('should return 401 without token', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      const existQuiz: Quiz = await quizRepository.save({
        title: 'quiz',
        frequencyInDays: 1,
        questions: [],
        company: existCompany,
      });
      createdQuizIds.push(existQuiz.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: adminRole,
      });
      await request(app.getHttpServer())
        .delete(`/quizzes/${existQuiz.id}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
