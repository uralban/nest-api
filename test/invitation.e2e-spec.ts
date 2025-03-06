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
import { InviteRequestStatus } from '../src/global/enums/invite-request-status.enum';
import { PaginationOptionsDto } from '../src/global/dto/pagination-options.dto';
import { CreateInvitationDto } from '../src/invitation/dto/create-invitation.dto';

const redisStore: Record<string, string> = {};

describe('InvitationController (e2e)', () => {
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
      emailLogin: 'test_invitation@mailinator.com',
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

  describe('POST /invitation', () => {
    it('should create Invitation by owner for not-member user', async () => {
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
        emailLogin: 'post-invite-another-user1@email.com',
        firstName: 'John',
        lastName: 'Doe',
        passHash: '',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      const createInvitationDto: CreateInvitationDto = {
        companyId: existCompany.id,
        invitedUserId: anotherUser.id,
        userId: currentUser.id,
      };
      const response = await request(app.getHttpServer())
        .post('/invitation')
        .set('Cookie', [`access_token=${authToken}`])
        .send(createInvitationDto)
        .expect(HttpStatus.CREATED);
      expect(response.body.message).toBe('The invite has been created.');
      const newInvite: Invitation = await invitationRepository.findOne({
        where: {
          company: { id: existCompany.id },
          invitedUser: { id: anotherUser.id },
          status: InviteRequestStatus.PENDING,
        },
      });
      createdInviteIds.push(newInvite.id);
      expect(newInvite).toBeDefined();
    });

    it('should create Invitation by admin for not-member user', async () => {
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
        emailLogin: 'post-invite-another-user2@email.com',
        firstName: 'John',
        lastName: 'Doe',
        passHash: '',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      const createInvitationDto: CreateInvitationDto = {
        companyId: existCompany.id,
        invitedUserId: anotherUser.id,
        userId: currentUser.id,
      };
      const response = await request(app.getHttpServer())
        .post('/invitation')
        .set('Cookie', [`access_token=${authToken}`])
        .send(createInvitationDto)
        .expect(HttpStatus.CREATED);
      expect(response.body.message).toBe('The invite has been created.');
      const newInvite: Invitation = await invitationRepository.findOne({
        where: {
          company: { id: existCompany.id },
          invitedUser: { id: anotherUser.id },
          status: InviteRequestStatus.PENDING,
        },
      });
      createdInviteIds.push(newInvite.id);
      expect(newInvite).toBeDefined();
    });

    it('should not create Invitation by member for not-member user', async () => {
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
        emailLogin: 'post-invite-another-user3@email.com',
        firstName: 'John',
        lastName: 'Doe',
        passHash: '',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      const createInvitationDto: CreateInvitationDto = {
        companyId: existCompany.id,
        invitedUserId: anotherUser.id,
        userId: currentUser.id,
      };
      await request(app.getHttpServer())
        .post('/invitation')
        .set('Cookie', [`access_token=${authToken}`])
        .send(createInvitationDto)
        .expect(HttpStatus.FORBIDDEN);
      const newInvite: Invitation = await invitationRepository.findOne({
        where: {
          company: { id: existCompany.id },
          invitedUser: { id: anotherUser.id },
          status: InviteRequestStatus.PENDING,
        },
      });
      expect(newInvite).toBeNull();
    });

    it('should not create Invitation by owner if invite already exist', async () => {
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
        emailLogin: 'post-invite-another-user4@email.com',
        firstName: 'John',
        lastName: 'Doe',
        passHash: '',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      const existInvite: Invitation = await invitationRepository.save({
        company: existCompany,
        invitedUser: anotherUser,
        invitedBy: currentUser,
        status: InviteRequestStatus.PENDING,
      });
      createdInviteIds.push(existInvite.id);
      const createInvitationDto: CreateInvitationDto = {
        companyId: existCompany.id,
        invitedUserId: anotherUser.id,
        userId: currentUser.id,
      };
      await request(app.getHttpServer())
        .post('/invitation')
        .set('Cookie', [`access_token=${authToken}`])
        .send(createInvitationDto)
        .expect(HttpStatus.FORBIDDEN);
    });

    it('should return 401 without token', async () => {
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
        emailLogin: 'post-invite-another-user4@email.com',
        firstName: 'John',
        lastName: 'Doe',
        passHash: '',
        avatarUrl: '',
      });
      const createInvitationDto: CreateInvitationDto = {
        companyId: existCompany.id,
        invitedUserId: anotherUser.id,
        userId: currentUser.id,
      };
      createdUserIds.push(anotherUser.id);
      await request(app.getHttpServer())
        .post('/invitation')
        .send(createInvitationDto)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /invitation', () => {
    it("should get all invitations with pagination with 'pending' status", async () => {
      const existCompanies: Company[] = await companyRepository.save([
        { companyName: 'Company1' },
        { companyName: 'Company2' },
        { companyName: 'Company3' },
        { companyName: 'Company4' },
      ]);
      existCompanies.forEach(company => createdCompanyIds.push(company.id));
      const anotherUser: User = await userRepository.save({
        emailLogin: 'get-invitation-another-user1@email.com',
        firstName: 'John',
        lastName: 'Doe',
        passHash: '',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      const newInvitations: Invitation[] = await invitationRepository.save([
        {
          company: existCompanies[0],
          invitedUser: currentUser,
          invitedBy: anotherUser,
          status: InviteRequestStatus.PENDING,
        },
        {
          company: existCompanies[1],
          invitedUser: anotherUser,
          invitedBy: anotherUser,
          status: InviteRequestStatus.PENDING,
        },
        {
          company: existCompanies[2],
          invitedUser: currentUser,
          invitedBy: anotherUser,
          status: InviteRequestStatus.DECLINED,
        },
        {
          company: existCompanies[3],
          invitedUser: currentUser,
          invitedBy: anotherUser,
          status: InviteRequestStatus.PENDING,
        },
      ]);
      newInvitations.forEach(invite => createdInviteIds.push(invite.id));
      const pageOptions = { page: 1, take: 10 } as PaginationOptionsDto;
      const response = await request(app.getHttpServer())
        .get('/invitation')
        .query(pageOptions)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      const allInvites: Invitation[] = await invitationRepository.find({
        where: [
          {
            invitedUser: { id: currentUser.id },
            status: InviteRequestStatus.PENDING,
          },
        ],
      });
      expect(response.body.data).toHaveLength(allInvites.length);
      expect(response.body.meta).toMatchObject({
        page: '1',
        take: '10',
        itemCount: allInvites.length,
        pageCount: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      });
    });

    it('should return 401 without token', async () => {
      const pageOptions = { page: 1, take: 10 } as PaginationOptionsDto;
      await request(app.getHttpServer())
        .get('/invitation')
        .query(pageOptions)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('PATCH /invitation/:inviteId', () => {
    it("should update invite status to 'accept' if user is not company member, also should update request if exist", async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      const anotherUser: User = await userRepository.save({
        emailLogin: 'patch-invitation-another-user1@email.com',
        firstName: 'John',
        lastName: 'Doe',
        passHash: '',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      const existRequest: Request = await requestRepository.save({
        company: existCompany,
        requestedUser: currentUser,
        status: InviteRequestStatus.PENDING,
      });
      createdRequestIds.push(existRequest.id);
      const existInvite: Invitation = await invitationRepository.save({
        company: existCompany,
        invitedUser: currentUser,
        status: InviteRequestStatus.PENDING,
        invitedBy: anotherUser,
      });
      createdInviteIds.push(existInvite.id);
      const response = await request(app.getHttpServer())
        .patch(`/invitation/${existInvite.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body.message).toBe('Successfully accepted invitation.');
      const updatedRequest: Request = await requestRepository.findOne({
        where: { id: existRequest.id },
      });
      const updatedInvite: Invitation = await invitationRepository.findOne({
        where: { id: existInvite.id },
      });
      expect(updatedRequest.status).toEqual(InviteRequestStatus.ACCEPTED);
      expect(updatedInvite.status).toEqual(InviteRequestStatus.ACCEPTED);
    });

    it("should not update invite status to 'accept' if user is company owner", async () => {
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
        emailLogin: 'patch-invitation-another-user2@email.com',
        firstName: 'John',
        lastName: 'Doe',
        passHash: '',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      const existInvite: Invitation = await invitationRepository.save({
        company: existCompany,
        invitedUser: anotherUser,
        status: InviteRequestStatus.PENDING,
        invitedBy: currentUser,
      });
      createdInviteIds.push(existInvite.id);
      await request(app.getHttpServer())
        .patch(`/invitation/${existInvite.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.FORBIDDEN);
      const updatedInvite: Invitation = await invitationRepository.findOne({
        where: { id: existInvite.id },
      });
      expect(updatedInvite.status).toEqual(InviteRequestStatus.PENDING);
    });

    it("should not update invite status to 'accept' if user is company admin", async () => {
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
        emailLogin: 'patch-invitation-another-user3@email.com',
        firstName: 'John',
        lastName: 'Doe',
        passHash: '',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      const existInvite: Invitation = await invitationRepository.save({
        company: existCompany,
        invitedUser: anotherUser,
        status: InviteRequestStatus.PENDING,
        invitedBy: currentUser,
      });
      createdInviteIds.push(existInvite.id);
      await request(app.getHttpServer())
        .patch(`/invitation/${existInvite.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.FORBIDDEN);
      const updatedInvite: Invitation = await invitationRepository.findOne({
        where: { id: existInvite.id },
      });
      expect(updatedInvite.status).toEqual(InviteRequestStatus.PENDING);
    });

    it("should not update invite status to 'accept' if user is company member", async () => {
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
        emailLogin: 'patch-invitation-another-user4@email.com',
        firstName: 'John',
        lastName: 'Doe',
        passHash: '',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      const existInvite: Invitation = await invitationRepository.save({
        company: existCompany,
        invitedUser: anotherUser,
        status: InviteRequestStatus.PENDING,
        invitedBy: currentUser,
      });
      createdInviteIds.push(existInvite.id);
      await request(app.getHttpServer())
        .patch(`/invitation/${existInvite.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.FORBIDDEN);
      const updatedInvite: Invitation = await invitationRepository.findOne({
        where: { id: existInvite.id },
      });
      expect(updatedInvite.status).toEqual(InviteRequestStatus.PENDING);
    });

    it('should return 401 without token', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      const anotherUser: User = await userRepository.save({
        emailLogin: 'patch-invitation-another-user5@email.com',
        firstName: 'John',
        lastName: 'Doe',
        passHash: '',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      const existInvite: Invitation = await invitationRepository.save({
        company: existCompany,
        invitedUser: currentUser,
        status: InviteRequestStatus.PENDING,
        invitedBy: anotherUser,
      });
      createdInviteIds.push(existInvite.id);
      await request(app.getHttpServer())
        .patch(`/invitation/${existInvite.id}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('DELETE /invitation/:inviteId', () => {
    it("should update invitation status to 'declined' if user is not member", async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      const anotherUser: User = await userRepository.save({
        emailLogin: 'delete-invitation-another-user1@email.com',
        firstName: 'John',
        lastName: 'Doe',
        passHash: '',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      const existInvite: Invitation = await invitationRepository.save({
        company: existCompany,
        invitedUser: currentUser,
        invitedBy: anotherUser,
        status: InviteRequestStatus.PENDING,
      });
      createdInviteIds.push(existInvite.id);
      const response = await request(app.getHttpServer())
        .delete(`/invitation/${existInvite.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body.message).toBe('Successfully decline invitation.');
      const updatedInvite: Invitation = await invitationRepository.findOne({
        where: { id: existInvite.id },
      });
      expect(updatedInvite.status).toEqual(InviteRequestStatus.DECLINED);
    });

    it("should update invitation status to 'declined' if user owner", async () => {
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
        emailLogin: 'delete-invitation-another-user2@email.com',
        firstName: 'John',
        lastName: 'Doe',
        passHash: '',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      const existInvite: Invitation = await invitationRepository.save({
        company: existCompany,
        invitedUser: anotherUser,
        invitedBy: currentUser,
        status: InviteRequestStatus.PENDING,
      });
      createdInviteIds.push(existInvite.id);
      const response = await request(app.getHttpServer())
        .delete(`/invitation/${existInvite.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body.message).toBe('Successfully decline invitation.');
      const updatedInvite: Invitation = await invitationRepository.findOne({
        where: { id: existInvite.id },
      });
      expect(updatedInvite.status).toEqual(InviteRequestStatus.DECLINED);
    });

    it("should update invitation status to 'declined' if user admin", async () => {
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
        emailLogin: 'delete-invitation-another-user3@email.com',
        firstName: 'John',
        lastName: 'Doe',
        passHash: '',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      const existInvite: Invitation = await invitationRepository.save({
        company: existCompany,
        invitedUser: anotherUser,
        invitedBy: currentUser,
        status: InviteRequestStatus.PENDING,
      });
      createdInviteIds.push(existInvite.id);
      const response = await request(app.getHttpServer())
        .delete(`/invitation/${existInvite.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body.message).toBe('Successfully decline invitation.');
      const updatedInvite: Invitation = await invitationRepository.findOne({
        where: { id: existInvite.id },
      });
      expect(updatedInvite.status).toEqual(InviteRequestStatus.DECLINED);
    });

    it("should not update invitation status to 'declined' if user member", async () => {
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
        emailLogin: 'delete-invitation-another-user4@email.com',
        firstName: 'John',
        lastName: 'Doe',
        passHash: '',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      const existInvite: Invitation = await invitationRepository.save({
        company: existCompany,
        invitedUser: anotherUser,
        invitedBy: currentUser,
        status: InviteRequestStatus.PENDING,
      });
      createdInviteIds.push(existInvite.id);
      await request(app.getHttpServer())
        .delete(`/invitation/${existInvite.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.FORBIDDEN);
      const updatedInvite: Invitation = await invitationRepository.findOne({
        where: { id: existInvite.id },
      });
      expect(updatedInvite.status).toEqual(InviteRequestStatus.PENDING);
    });

    it('should return 401 without token', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      const anotherUser: User = await userRepository.save({
        emailLogin: 'delete-invitation-another-user5@email.com',
        firstName: 'John',
        lastName: 'Doe',
        passHash: '',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      const existInvite: Invitation = await invitationRepository.save({
        company: existCompany,
        invitedUser: currentUser,
        invitedBy: anotherUser,
        status: InviteRequestStatus.PENDING,
      });
      createdInviteIds.push(existInvite.id);
      await request(app.getHttpServer())
        .delete(`/invitation/${existInvite.id}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
