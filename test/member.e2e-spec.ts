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

const redisStore: Record<string, string> = {};

describe('MembersController (e2e)', () => {
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

    currentUser = await userRepository.save({
      emailLogin: 'test_member@mailinator.com',
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
  });

  describe('PATCH /members/:memberId', () => {
    it('should update member role if user is owner', async () => {
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
      const anotherUser: User = await userRepository.save({
        emailLogin: 'patch-members-another-user1@email.com',
        firstName: 'John',
        lastName: 'Doe',
        passHash: '',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      const existMember: Member = await memberRepository.save({
        company: existCompany,
        user: anotherUser,
        role: memberRole,
      });
      const updateMemberRoleDto: UpdateMemberRoleDto = { roleId: adminRole.id };
      const response = await request(app.getHttpServer())
        .patch(`/members/${existMember.id}`)
        .send(updateMemberRoleDto)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body.message).toBe(
        "Successfully accepted member's role.",
      );
      const updatedMember: Member = await memberRepository.findOne({
        where: { id: existMember.id },
        relations: { role: true },
      });
      expect(updatedMember.role.roleName).toEqual('admin');
    });

    it('should update member role if user is admin', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: adminRole,
      });
      const anotherUser: User = await userRepository.save({
        emailLogin: 'patch-members-another-user2@email.com',
        firstName: 'John',
        lastName: 'Doe',
        passHash: '',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      const existMember: Member = await memberRepository.save({
        company: existCompany,
        user: anotherUser,
        role: memberRole,
      });
      const updateMemberRoleDto: UpdateMemberRoleDto = { roleId: adminRole.id };
      const response = await request(app.getHttpServer())
        .patch(`/members/${existMember.id}`)
        .send(updateMemberRoleDto)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body.message).toBe(
        "Successfully accepted member's role.",
      );
      const updatedMember: Member = await memberRepository.findOne({
        where: { id: existMember.id },
        relations: { role: true },
      });
      expect(updatedMember.role.roleName).toEqual('admin');
    });

    it('should not update member role if user is member', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: memberRole,
      });
      const anotherUser: User = await userRepository.save({
        emailLogin: 'patch-members-another-user3@email.com',
        firstName: 'John',
        lastName: 'Doe',
        passHash: '',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      const existMember: Member = await memberRepository.save({
        company: existCompany,
        user: anotherUser,
        role: memberRole,
      });
      const updateMemberRoleDto: UpdateMemberRoleDto = { roleId: adminRole.id };
      await request(app.getHttpServer())
        .patch(`/members/${existMember.id}`)
        .send(updateMemberRoleDto)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.FORBIDDEN);
      const updatedMember: Member = await memberRepository.findOne({
        where: { id: existMember.id },
        relations: { role: true },
      });
      expect(updatedMember.role.roleName).toEqual('member');
    });

    it('should return 401 without token', async () => {
      const existMemberId: string = 'some-member-id';
      const updateMemberRoleDto: UpdateMemberRoleDto = { roleId: adminRole.id };
      await request(app.getHttpServer())
        .patch(`/members/${existMemberId}`)
        .send(updateMemberRoleDto)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('DELETE /members/self/:companyId', () => {
    it('should self delete member if user is admin', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      const existMember: Member = await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: adminRole,
      });
      const response = await request(app.getHttpServer())
        .delete(`/members/self/${existCompany.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body.message).toBe(
        'The member was successfully deleted.',
      );
      const updatedMember: Member = await memberRepository.findOne({
        where: { id: existMember.id },
      });
      expect(updatedMember).toBeNull();
    });

    it('should self delete member if user is member', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      const existMember: Member = await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: memberRole,
      });
      const response = await request(app.getHttpServer())
        .delete(`/members/self/${existCompany.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body.message).toBe(
        'The member was successfully deleted.',
      );
      const updatedMember: Member = await memberRepository.findOne({
        where: { id: existMember.id },
      });
      expect(updatedMember).toBeNull();
    });

    it('should not self delete member if user is owner', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
        owner: currentUser,
      });
      createdCompanyIds.push(existCompany.id);
      const existMember: Member = await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: ownerRole,
      });
      await request(app.getHttpServer())
        .delete(`/members/self/${existCompany.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.FORBIDDEN);
      const updatedMember: Member = await memberRepository.findOne({
        where: { id: existMember.id },
      });
      expect(updatedMember).toBeDefined();
    });

    it('should return 401 without token', async () => {
      const existMemberId: string = 'some-member-id';
      await request(app.getHttpServer())
        .delete(`/members/${existMemberId}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('DELETE /member/:memberId', () => {
    it('should delete member if user is owner', async () => {
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
      const anotherUser: User = await userRepository.save({
        emailLogin: 'delete-members-another-user1@email.com',
        firstName: 'John',
        lastName: 'Doe',
        passHash: '',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      const existMember: Member = await memberRepository.save({
        company: existCompany,
        user: anotherUser,
        role: memberRole,
      });
      const response = await request(app.getHttpServer())
        .delete(`/members/${existMember.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body.message).toBe(
        'The member was successfully deleted.',
      );
      const updatedMember: Member = await memberRepository.findOne({
        where: { id: existMember.id },
      });
      expect(updatedMember).toBeNull();
    });

    it('should delete member if user is admin', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: adminRole,
      });
      const anotherUser: User = await userRepository.save({
        emailLogin: 'delete-members-another-user2@email.com',
        firstName: 'John',
        lastName: 'Doe',
        passHash: '',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      const existMember: Member = await memberRepository.save({
        company: existCompany,
        user: anotherUser,
        role: memberRole,
      });
      const response = await request(app.getHttpServer())
        .delete(`/members/${existMember.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body.message).toBe(
        'The member was successfully deleted.',
      );
      const updatedMember: Member = await memberRepository.findOne({
        where: { id: existMember.id },
      });
      expect(updatedMember).toBeNull();
    });

    it('should not delete member if user is member', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company',
      });
      createdCompanyIds.push(existCompany.id);
      await memberRepository.save({
        company: existCompany,
        user: currentUser,
        role: memberRole,
      });
      const anotherUser: User = await userRepository.save({
        emailLogin: 'delete-members-another-user3@email.com',
        firstName: 'John',
        lastName: 'Doe',
        passHash: '',
        avatarUrl: '',
      });
      createdUserIds.push(anotherUser.id);
      const existMember: Member = await memberRepository.save({
        company: existCompany,
        user: anotherUser,
        role: memberRole,
      });
      await request(app.getHttpServer())
        .delete(`/members/${existMember.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.FORBIDDEN);
      const updatedMember: Member = await memberRepository.findOne({
        where: { id: existMember.id },
      });
      expect(updatedMember).toBeDefined();
    });

    it('should return 401 without token', async () => {
      const existMemberId: string = 'some-member-id';
      await request(app.getHttpServer())
        .delete(`/members/${existMemberId}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
