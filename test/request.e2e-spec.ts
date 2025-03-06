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
import { CreateRequestDto } from '../src/request/dto/create-request.dto';
import { InviteRequestStatus } from '../src/global/enums/invite-request-status.enum';
import { PaginationOptionsDto } from '../src/global/dto/pagination-options.dto';

const redisStore: Record<string, string> = {};

describe('RequestController (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let requestRepository: Repository<Request>;
  let companyRepository: Repository<Company>;
  let memberRepository: Repository<Member>;
  let roleRepository: Repository<Role>;
  let invitationRepository: Repository<Invitation>;
  let authToken: string;
  let dataSource: DataSource;
  let currentUser: User;
  let createdRequestIds: string[] = [];
  let createdCompanyIds: string[] = [];
  let createdUserIds: string[] = [];
  let createdInviteIds: string[] = [];

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
    requestRepository = dataSource.getRepository(Request);
    companyRepository = dataSource.getRepository(Company);
    memberRepository = dataSource.getRepository(Member);
    roleRepository = dataSource.getRepository(Role);
    invitationRepository = dataSource.getRepository(Invitation);

    currentUser = await userRepository.save({
      emailLogin: 'test_request@mailinator.com',
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
    const trashRequests: Request[] = await requestRepository.find();
    if (trashRequests.length > 0)
      for (const request1 of trashRequests) {
        await requestRepository.remove(request1);
      }
    await app.close();
  });

  afterEach(async () => {
    if (createdCompanyIds.length > 0) {
      await companyRepository.delete({ id: In(createdCompanyIds) });
    }
    if (createdRequestIds.length > 0) {
      await userRepository.delete({ id: In(createdRequestIds) });
    }
    if (createdUserIds.length > 0) {
      await userRepository.delete({ id: In(createdUserIds) });
    }
    if (createdInviteIds.length > 0) {
      await userRepository.delete({ id: In(createdInviteIds) });
    }
  });

  describe('POST /request', () => {
    it('should create Request', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      const createRequestDto: CreateRequestDto = {
        companyId: existCompany.id,
        userId: currentUser.id,
      };
      const response = await request(app.getHttpServer())
        .post('/request')
        .set('Cookie', [`access_token=${authToken}`])
        .send(createRequestDto)
        .expect(HttpStatus.CREATED);
      expect(response.body.message).toBe('The request has been created.');
      const newRequest: Request = await requestRepository.findOne({
        where: {
          company: { id: existCompany.id },
          requestedUser: { id: currentUser.id },
        },
      });
      createdRequestIds.push(newRequest.id);
      expect(newRequest).toBeDefined();
      expect(newRequest.status).toBe(InviteRequestStatus.PENDING);
    });

    it('should not create Request if user is already member', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      const memberRole: Role = await roleRepository.findOne({
        where: { roleName: 'member' },
      });
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: memberRole,
      });
      const createRequestDto: CreateRequestDto = {
        companyId: existCompany.id,
        userId: currentUser.id,
      };
      await request(app.getHttpServer())
        .post('/request')
        .set('Cookie', [`access_token=${authToken}`])
        .send(createRequestDto)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("should not create Request if similar request with 'pending' status is already exist", async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      const existRequest: Request = await requestRepository.save({
        company: existCompany,
        requestedUser: currentUser,
        status: InviteRequestStatus.PENDING,
      });
      createdRequestIds.push(existRequest.id);
      const createRequestDto: CreateRequestDto = {
        companyId: existCompany.id,
        userId: currentUser.id,
      };
      await request(app.getHttpServer())
        .post('/request')
        .set('Cookie', [`access_token=${authToken}`])
        .send(createRequestDto)
        .expect(HttpStatus.FORBIDDEN);
    });

    it("should create Request if similar request with 'declined' status is already exist", async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      const existRequest: Request = await requestRepository.save({
        company: existCompany,
        requestedUser: currentUser,
        status: InviteRequestStatus.DECLINED,
      });
      createdRequestIds.push(existRequest.id);
      const createRequestDto: CreateRequestDto = {
        companyId: existCompany.id,
        userId: currentUser.id,
      };
      const response = await request(app.getHttpServer())
        .post('/request')
        .set('Cookie', [`access_token=${authToken}`])
        .send(createRequestDto)
        .expect(HttpStatus.CREATED);
      expect(response.body.message).toBe('The request has been created.');
      const newRequest = await requestRepository.findOne({
        where: {
          company: { id: createRequestDto.companyId },
          requestedUser: { id: createRequestDto.userId },
          status: InviteRequestStatus.PENDING,
        },
      });
      createdRequestIds.push(newRequest.id);
    });

    it("should create Request if similar request with 'accepted' status is already exist", async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      const existRequest: Request = await requestRepository.save({
        company: existCompany,
        requestedUser: currentUser,
        status: InviteRequestStatus.ACCEPTED,
      });
      createdRequestIds.push(existRequest.id);
      const createRequestDto: CreateRequestDto = {
        companyId: existCompany.id,
        userId: currentUser.id,
      };
      const response = await request(app.getHttpServer())
        .post('/request')
        .set('Cookie', [`access_token=${authToken}`])
        .send(createRequestDto)
        .expect(HttpStatus.CREATED);
      expect(response.body.message).toBe('The request has been created.');
      const newRequest = await requestRepository.findOne({
        where: {
          company: { id: createRequestDto.companyId },
          requestedUser: { id: createRequestDto.userId },
          status: InviteRequestStatus.PENDING,
        },
      });
      createdRequestIds.push(newRequest.id);
    });

    it('should return 401 without token', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      const createRequestDto: CreateRequestDto = {
        companyId: existCompany.id,
        userId: currentUser.id,
      };
      await request(app.getHttpServer())
        .post('/request')
        .send(createRequestDto)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /request', () => {
    it("should get all request with pagination with 'pending' status", async () => {
      const existCompanies: Company[] = await companyRepository.save([
        { companyName: 'Company1' },
        { companyName: 'Company2' },
        { companyName: 'Company3' },
        { companyName: 'Company4' },
      ]);
      existCompanies.forEach(company => createdCompanyIds.push(company.id));
      const anotherUser: User = await userRepository.save({
        emailLogin: 'get-request-another-user@email.com',
        firstName: 'John',
        lastName: 'Doe',
        passHash: '',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      const newRequests: Request[] = await requestRepository.save([
        {
          company: existCompanies[0],
          requestedUser: currentUser,
          status: InviteRequestStatus.PENDING,
        },
        {
          company: existCompanies[1],
          requestedUser: anotherUser,
          status: InviteRequestStatus.PENDING,
        },
        {
          company: existCompanies[2],
          requestedUser: currentUser,
          status: InviteRequestStatus.DECLINED,
        },
        {
          company: existCompanies[3],
          requestedUser: currentUser,
          status: InviteRequestStatus.PENDING,
        },
      ]);
      newRequests.forEach(request => createdRequestIds.push(request.id));
      const pageOptions = { page: 1, take: 10 } as PaginationOptionsDto;
      const response = await request(app.getHttpServer())
        .get('/request')
        .query(pageOptions)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      const allRequests: Request[] = await requestRepository.find({
        where: [
          {
            requestedUser: { id: currentUser.id },
            status: InviteRequestStatus.PENDING,
          },
        ],
      });
      expect(response.body.data).toHaveLength(allRequests.length);
      expect(response.body.meta).toMatchObject({
        page: '1',
        take: '10',
        itemCount: allRequests.length,
        pageCount: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      });
    });

    it('should return 401 without token', async () => {
      const pageOptions = { page: 1, take: 10 } as PaginationOptionsDto;
      await request(app.getHttpServer())
        .get('/request')
        .query(pageOptions)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('PATCH /request/:requestId', () => {
    it("should update request status to 'accept' if user is company owner, also should update invite if exist", async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
        owner: currentUser,
      });
      createdCompanyIds.push(existCompany.id);
      const ownerRole: Role = await roleRepository.findOne({
        where: { roleName: 'owner' },
      });
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: ownerRole,
      });
      const anotherUser: User = await userRepository.save({
        emailLogin: 'patch-request-another-user1@email.com',
        firstName: 'John',
        lastName: 'Doe',
        passHash: '',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      const existRequest: Request = await requestRepository.save({
        company: existCompany,
        requestedUser: anotherUser,
        status: InviteRequestStatus.PENDING,
      });
      createdRequestIds.push(existRequest.id);
      const existInvite: Invitation = await invitationRepository.save({
        company: existCompany,
        invitedUser: anotherUser,
        status: InviteRequestStatus.PENDING,
        invitedBy: currentUser,
      });
      createdInviteIds.push(existInvite.id);
      const response = await request(app.getHttpServer())
        .patch(`/request/${existRequest.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body.message).toBe('Successfully accepted request.');
      const updatedRequest: Request = await requestRepository.findOne({
        where: { id: existRequest.id },
      });
      const updatedInvite: Invitation = await invitationRepository.findOne({
        where: { id: existInvite.id },
      });
      expect(updatedRequest.status).toEqual(InviteRequestStatus.ACCEPTED);
      expect(updatedInvite.status).toEqual(InviteRequestStatus.ACCEPTED);
    });

    it("should update request status to 'accept' if user is company admin", async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      const adminRole: Role = await roleRepository.findOne({
        where: { roleName: 'admin' },
      });
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: adminRole,
      });
      const anotherUser: User = await userRepository.save({
        emailLogin: 'patch-request-another-user2@email.com',
        firstName: 'John',
        lastName: 'Doe',
        passHash: '',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      const existRequest: Request = await requestRepository.save({
        company: existCompany,
        requestedUser: anotherUser,
        status: InviteRequestStatus.PENDING,
      });
      createdRequestIds.push(existRequest.id);
      const response = await request(app.getHttpServer())
        .patch(`/request/${existRequest.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body.message).toBe('Successfully accepted request.');
      const updatedRequest: Request = await requestRepository.findOne({
        where: { id: existRequest.id },
      });
      expect(updatedRequest.status).toEqual(InviteRequestStatus.ACCEPTED);
    });

    it("should not update request status to 'accept' if user is company member", async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      const memberRole: Role = await roleRepository.findOne({
        where: { roleName: 'member' },
      });
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: memberRole,
      });
      const anotherUser: User = await userRepository.save({
        emailLogin: 'patch-request-another-user3@email.com',
        firstName: 'John',
        lastName: 'Doe',
        passHash: '',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      const existRequest: Request = await requestRepository.save({
        company: existCompany,
        requestedUser: anotherUser,
        status: InviteRequestStatus.PENDING,
      });
      createdRequestIds.push(existRequest.id);
      const response = await request(app.getHttpServer())
        .patch(`/request/${existRequest.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.FORBIDDEN);
      const updatedRequest: Request = await requestRepository.findOne({
        where: { id: existRequest.id },
      });
      expect(updatedRequest.status).toEqual(InviteRequestStatus.PENDING);
    });

    it('should return 401 without token', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      const anotherUser: User = await userRepository.save({
        emailLogin: 'patch-request-another-user4@email.com',
        firstName: 'John',
        lastName: 'Doe',
        passHash: '',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      const existRequest: Request = await requestRepository.save({
        company: existCompany,
        requestedUser: anotherUser,
        status: InviteRequestStatus.PENDING,
      });
      createdRequestIds.push(existRequest.id);
      await request(app.getHttpServer())
        .patch(`/request/${existRequest.id}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('DELETE /request/:requestId', () => {
    it("should update request status to 'declined' if user is not member", async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      const anotherUser: User = await userRepository.save({
        emailLogin: 'delete-request-another-user1@email.com',
        firstName: 'John',
        lastName: 'Doe',
        passHash: '',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      const existRequest: Request = await requestRepository.save({
        company: existCompany,
        requestedUser: anotherUser,
        status: InviteRequestStatus.PENDING,
      });
      createdRequestIds.push(existRequest.id);
      const response = await request(app.getHttpServer())
        .delete(`/request/${existRequest.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body.message).toBe('Successfully decline request.');
      const updatedRequest: Request = await requestRepository.findOne({
        where: { id: existRequest.id },
      });
      expect(updatedRequest.status).toEqual(InviteRequestStatus.DECLINED);
    });

    it("should not update request status to 'declined' if user is member", async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      const memberRole: Role = await roleRepository.findOne({
        where: { roleName: 'member' },
      });
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: memberRole,
      });
      const anotherUser: User = await userRepository.save({
        emailLogin: 'delete-request-another-user2@email.com',
        firstName: 'John',
        lastName: 'Doe',
        passHash: '',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      const existRequest: Request = await requestRepository.save({
        company: existCompany,
        requestedUser: anotherUser,
        status: InviteRequestStatus.PENDING,
      });
      createdRequestIds.push(existRequest.id);
      const response = await request(app.getHttpServer())
        .delete(`/request/${existRequest.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.FORBIDDEN);
      const updatedRequest: Request = await requestRepository.findOne({
        where: { id: existRequest.id },
      });
      expect(updatedRequest.status).toEqual(InviteRequestStatus.PENDING);
    });

    it('should return 401 without token', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      const anotherUser: User = await userRepository.save({
        emailLogin: 'delete-request-another-user3@email.com',
        firstName: 'John',
        lastName: 'Doe',
        passHash: '',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      const existRequest: Request = await requestRepository.save({
        company: existCompany,
        requestedUser: anotherUser,
        status: InviteRequestStatus.PENDING,
      });
      createdRequestIds.push(existRequest.id);
      await request(app.getHttpServer())
        .delete(`/request/${existRequest.id}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
