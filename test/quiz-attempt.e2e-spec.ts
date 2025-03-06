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
import { CreateQuizAttemptDto } from '../src/quiz-attempt/dto/create-quiz-attempt.dto';
import { ExportAttemptOptionsDto } from '../src/quiz-attempt/dto/export-attempt-options.dto';

const redisStore: Record<string, string> = {};

describe('QuizAttemptController (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let companyRepository: Repository<Company>;
  let memberRepository: Repository<Member>;
  let roleRepository: Repository<Role>;
  let authToken: string;
  let dataSource: DataSource;
  let currentUser: User;
  let createdCompanyIds: string[] = [];
  let createdUserIds: string[] = [];
  let createdQuizIds: string[] = [];
  let createdQuizAttemptIds: string[] = [];
  let quizRepository: Repository<Quiz>;
  let questionRepository: Repository<Question>;
  let answerRepository: Repository<Answer>;
  let quizAttemptRepository: Repository<QuizAttempt>;
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
        keys: async (pattern: string) => {
          return Object.keys(redisStore).filter(key =>
            key.startsWith('quiz_attempt:'),
          );
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
    questionRepository = dataSource.getRepository(Question);
    answerRepository = dataSource.getRepository(Answer);
    quizAttemptRepository = dataSource.getRepository(QuizAttempt);

    currentUser = await userRepository.save({
      emailLogin: 'test_quiz-attempt@mailinator.com',
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
    if (createdQuizAttemptIds.length > 0) {
      await quizAttemptRepository.delete({ id: In(createdQuizAttemptIds) });
    }
  });

  describe('POST /quiz-attempt', () => {
    it('should create a new quiz attempt as member', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'TestCompany',
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: memberRole,
      });
      const existQuiz: Quiz = await quizRepository.save({
        title: 'TestQuiz',
        frequencyInDays: 1,
        company: existCompany,
      });
      createdQuizIds.push(existQuiz.id);
      const existQuestions: Question[] = await questionRepository.save([
        { content: 'question1', quiz: existQuiz },
        { content: 'question2', quiz: existQuiz },
      ]);
      const existAnswers1: Answer[] = await answerRepository.save([
        { content: 'answer11', isCorrect: false, question: existQuestions[0] },
        { content: 'answer12', isCorrect: true, question: existQuestions[0] },
      ]);
      const existAnswers2: Answer[] = await answerRepository.save([
        { content: 'answer21', isCorrect: false, question: existQuestions[1] },
        { content: 'answer22', isCorrect: true, question: existQuestions[1] },
      ]);
      const createQuizAttemptDto: CreateQuizAttemptDto = {
        quizId: existQuiz.id,
        questions: [
          {
            questionId: existQuestions[0].id,
            answersIdList: [existAnswers1[0].id],
          },
          {
            questionId: existQuestions[1].id,
            answersIdList: [existAnswers2[1].id],
          },
        ],
      };
      const response = await request(app.getHttpServer())
        .post('/quiz-attempt')
        .set('Cookie', [`access_token=${authToken}`])
        .send(createQuizAttemptDto)
        .expect(HttpStatus.CREATED);
      expect(response.body.message).toBe('Attempt saved successfully.');
      const attempt: QuizAttempt = await quizAttemptRepository.findOne({
        where: { quiz: { id: existQuiz.id } },
      });
      createdQuizAttemptIds.push(attempt.id);
      expect(attempt).toBeDefined();
    });

    it('should create a new quiz attempt as owner', async () => {
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
        frequencyInDays: 1,
        company: existCompany,
      });
      createdQuizIds.push(existQuiz.id);
      const existQuestions: Question[] = await questionRepository.save([
        { content: 'question1', quiz: existQuiz },
        { content: 'question2', quiz: existQuiz },
      ]);
      const existAnswers1: Answer[] = await answerRepository.save([
        { content: 'answer11', isCorrect: false, question: existQuestions[0] },
        { content: 'answer12', isCorrect: true, question: existQuestions[0] },
      ]);
      const existAnswers2: Answer[] = await answerRepository.save([
        { content: 'answer21', isCorrect: false, question: existQuestions[1] },
        { content: 'answer22', isCorrect: true, question: existQuestions[1] },
      ]);
      const createQuizAttemptDto: CreateQuizAttemptDto = {
        quizId: existQuiz.id,
        questions: [
          {
            questionId: existQuestions[0].id,
            answersIdList: [existAnswers1[0].id],
          },
          {
            questionId: existQuestions[1].id,
            answersIdList: [existAnswers2[1].id],
          },
        ],
      };
      const response = await request(app.getHttpServer())
        .post('/quiz-attempt')
        .set('Cookie', [`access_token=${authToken}`])
        .send(createQuizAttemptDto)
        .expect(HttpStatus.CREATED);
      expect(response.body.message).toBe('Attempt saved successfully.');
      const attempt: QuizAttempt = await quizAttemptRepository.findOne({
        where: { quiz: { id: existQuiz.id } },
      });
      createdQuizAttemptIds.push(attempt.id);
      expect(attempt).toBeDefined();
    });

    it('should create a new quiz attempt as admin', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'TestCompany',
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: adminRole,
      });
      const existQuiz: Quiz = await quizRepository.save({
        title: 'TestQuiz',
        frequencyInDays: 1,
        company: existCompany,
      });
      createdQuizIds.push(existQuiz.id);
      const existQuestions: Question[] = await questionRepository.save([
        { content: 'question1', quiz: existQuiz },
        { content: 'question2', quiz: existQuiz },
      ]);
      const existAnswers1: Answer[] = await answerRepository.save([
        { content: 'answer11', isCorrect: false, question: existQuestions[0] },
        { content: 'answer12', isCorrect: true, question: existQuestions[0] },
      ]);
      const existAnswers2: Answer[] = await answerRepository.save([
        { content: 'answer21', isCorrect: false, question: existQuestions[1] },
        { content: 'answer22', isCorrect: true, question: existQuestions[1] },
      ]);
      const createQuizAttemptDto: CreateQuizAttemptDto = {
        quizId: existQuiz.id,
        questions: [
          {
            questionId: existQuestions[0].id,
            answersIdList: [existAnswers1[0].id],
          },
          {
            questionId: existQuestions[1].id,
            answersIdList: [existAnswers2[1].id],
          },
        ],
      };
      const response = await request(app.getHttpServer())
        .post('/quiz-attempt')
        .set('Cookie', [`access_token=${authToken}`])
        .send(createQuizAttemptDto)
        .expect(HttpStatus.CREATED);
      expect(response.body.message).toBe('Attempt saved successfully.');
      const attempt: QuizAttempt = await quizAttemptRepository.findOne({
        where: { quiz: { id: existQuiz.id } },
      });
      createdQuizAttemptIds.push(attempt.id);
      expect(attempt).toBeDefined();
    });

    it('should not create a new quiz attempt if user is not member', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'TestCompany',
      });
      createdCompanyIds.push(existCompany.id);
      const existQuiz: Quiz = await quizRepository.save({
        title: 'TestQuiz',
        frequencyInDays: 1,
        company: existCompany,
      });
      createdQuizIds.push(existQuiz.id);
      const existQuestions: Question[] = await questionRepository.save([
        { content: 'question1', quiz: existQuiz },
        { content: 'question2', quiz: existQuiz },
      ]);
      const existAnswers1: Answer[] = await answerRepository.save([
        { content: 'answer11', isCorrect: false, question: existQuestions[0] },
        { content: 'answer12', isCorrect: true, question: existQuestions[0] },
      ]);
      const existAnswers2: Answer[] = await answerRepository.save([
        { content: 'answer21', isCorrect: false, question: existQuestions[1] },
        { content: 'answer22', isCorrect: true, question: existQuestions[1] },
      ]);
      const createQuizAttemptDto: CreateQuizAttemptDto = {
        quizId: existQuiz.id,
        questions: [
          {
            questionId: existQuestions[0].id,
            answersIdList: [existAnswers1[0].id],
          },
          {
            questionId: existQuestions[1].id,
            answersIdList: [existAnswers2[1].id],
          },
        ],
      };
      await request(app.getHttpServer())
        .post('/quiz-attempt')
        .set('Cookie', [`access_token=${authToken}`])
        .send(createQuizAttemptDto)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should return 401 without token', async () => {
      const createQuizAttemptDto: CreateQuizAttemptDto = {
        quizId: 'some-quiz-id',
        questions: [],
      };
      await request(app.getHttpServer())
        .post(`/quiz-attempt`)
        .send(createQuizAttemptDto)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /quiz-attempt/company-score/:companyId', () => {
    it('should return user company score', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'TestCompany',
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: memberRole,
      });
      const existQuiz: Quiz = await quizRepository.save({
        title: 'TestQuiz',
        frequencyInDays: 1,
        company: existCompany,
      });
      createdQuizIds.push(existQuiz.id);
      const existAttempt: QuizAttempt = await quizAttemptRepository.save({
        quiz: existQuiz,
        user: currentUser,
        answersScore: 1,
        questionCount: 2,
      });
      createdQuizAttemptIds.push(existAttempt.id);
      const response = await request(app.getHttpServer())
        .get(`/quiz-attempt/company-score/${existCompany.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body.message).toBe('0.5');
    });

    it('should return 401 without token', async () => {
      const companyId: string = 'some-quiz-id';
      await request(app.getHttpServer())
        .get(`/quiz-attempt/company-score/${companyId}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /quiz-attempt/total-score', () => {
    it('should return user total score', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'TestCompany',
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: memberRole,
      });
      const existQuiz: Quiz = await quizRepository.save({
        title: 'TestQuiz',
        frequencyInDays: 1,
        company: existCompany,
      });
      createdQuizIds.push(existQuiz.id);
      const existAttempt: QuizAttempt = await quizAttemptRepository.save({
        quiz: existQuiz,
        user: currentUser,
        answersScore: 1,
        questionCount: 2,
      });
      createdQuizAttemptIds.push(existAttempt.id);
      const response = await request(app.getHttpServer())
        .get('/quiz-attempt/total-score')
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body.message).toBe('0.5');
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get(`/quiz-attempt/total-score`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /quiz-attempt/export/user/:format', () => {
    it('should export user quiz attempts as JSON', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'TestCompany',
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: memberRole,
      });
      const existQuiz: Quiz = await quizRepository.save({
        title: 'TestQuiz',
        frequencyInDays: 1,
        company: existCompany,
      });
      createdQuizIds.push(existQuiz.id);
      const existAttempt: QuizAttempt = await quizAttemptRepository.save({
        quiz: existQuiz,
        user: currentUser,
        answersScore: 1,
        questionCount: 2,
      });
      createdQuizAttemptIds.push(existAttempt.id);
      const existQuestions: Question[] = await questionRepository.save([
        { content: 'question1', quiz: existQuiz },
        { content: 'question2', quiz: existQuiz },
      ]);
      const existAnswers1: Answer[] = await answerRepository.save([
        { content: 'answer11', isCorrect: false, question: existQuestions[0] },
        { content: 'answer12', isCorrect: true, question: existQuestions[0] },
      ]);
      const existAnswers2: Answer[] = await answerRepository.save([
        { content: 'answer21', isCorrect: false, question: existQuestions[1] },
        { content: 'answer22', isCorrect: true, question: existQuestions[1] },
      ]);

      const attemptData = {
        user: { id: currentUser.id, email: currentUser.emailLogin },
        company: { id: existCompany.id, companyName: existCompany.companyName },
        quiz: { id: existQuiz.id, title: existQuiz.title },
        questionsAndAnswers: [
          { question: existQuestions[0], answersIdList: [existAnswers1[0].id] },
          { question: existQuestions[1], answersIdList: [existAnswers2[1].id] },
        ],
      };
      redisStore[`quiz_attempt:${existAttempt.id}`] =
        JSON.stringify(attemptData);

      const response = await request(app.getHttpServer())
        .get('/quiz-attempt/export/user/json')
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);

      expect(response.header['content-type']).toContain('application/json');
      expect(response.text).toContain(currentUser.emailLogin);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get(`/quiz-attempt/export/user/json`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /quiz-attempt/export/company/:format', () => {
    it('should export company quiz attempts as CSV for admin', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'TestCompany',
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: adminRole,
      });
      const existAnswers1: Answer[] = await answerRepository.save([
        { content: 'answer11', isCorrect: false },
        { content: 'answer12', isCorrect: true },
      ]);
      const existAnswers2: Answer[] = await answerRepository.save([
        { content: 'answer21', isCorrect: false },
        { content: 'answer22', isCorrect: true },
      ]);
      const existQuestions: Question[] = await questionRepository.save([
        { content: 'question1', answerOptions: existAnswers1 },
        { content: 'question2', answerOptions: existAnswers1 },
      ]);
      const existQuiz: Quiz = await quizRepository.save({
        title: 'TestQuiz',
        frequencyInDays: 1,
        company: existCompany,
        questions: existQuestions,
      });
      createdQuizIds.push(existQuiz.id);
      const existAttempt: QuizAttempt = await quizAttemptRepository.save({
        quiz: existQuiz,
        user: currentUser,
        answersScore: 1,
        questionCount: 2,
      });
      createdQuizAttemptIds.push(existAttempt.id);

      const attemptData = {
        user: { id: currentUser.id, email: currentUser.emailLogin },
        company: { id: existCompany.id, companyName: existCompany.companyName },
        quiz: { id: existQuiz.id, title: existQuiz.title },
        questionsAndAnswers: [
          { question: existQuestions[0], answersIdList: [existAnswers1[0].id] },
          { question: existQuestions[1], answersIdList: [existAnswers2[1].id] },
        ],
      };
      redisStore[`quiz_attempt:${existAttempt.id}`] =
        JSON.stringify(attemptData);
      const exportAttemptOptionsDto: ExportAttemptOptionsDto = {
        companyId: existCompany.id,
        userId: currentUser.id,
        quizId: existQuiz.id,
      };
      const response = await request(app.getHttpServer())
        .get('/quiz-attempt/export/company/csv')
        .send(exportAttemptOptionsDto)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);

      expect(response.header['content-type']).toContain('text/csv');
      expect(response.text).toContain('Company Name,User Email,Quiz Title');
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/quiz-attempt/export/company/csv')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
