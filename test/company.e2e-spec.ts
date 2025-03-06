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
import { PaginationOptionsDto } from '../src/global/dto/pagination-options.dto';
import * as cookieParser from 'cookie-parser';
import { CreateCompanyDto } from '../src/company/dto/create-company.dto';
import { Visibility } from '../src/global/enums/visibility.enum';
import { UpdateCompanyVisibilityDto } from '../src/company/dto/update-company-visibility.dto';
import { UpdateCompanyDto } from '../src/company/dto/update-company.dto';

const redisStore: Record<string, string> = {};

describe('CompanyController (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let companyRepository: Repository<Company>;
  let memberRepository: Repository<Member>;
  let roleRepository: Repository<Role>;
  let authToken: string;
  let dataSource: DataSource;
  let user: User;
  let createdCompanyIds: string[] = [];
  let createdCompanyOwnerIds: string[] = [];

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

    user = await userRepository.save({
      emailLogin: 'test_comapny@mailinator.com',
      passHash: '$2b$10$thRF15WycBQ3uocoebpsk.YhUnJjz8QNk2A5KZKK6E4YGTHiS9Cc2',
      firstName: 'Test',
      lastName: 'User',
      avatarUrl: '',
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test_comapny@mailinator.com',
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
      where: { emailLogin: user.emailLogin },
    });
    if (authUser) await userRepository.remove(authUser);
    await app.close();
  });

  afterEach(async () => {
    if (createdCompanyIds.length > 0) {
      await companyRepository.delete({ id: In(createdCompanyIds) });
    }
    if (createdCompanyOwnerIds.length > 0) {
      await userRepository.delete({ id: In(createdCompanyOwnerIds) });
    }
  });

  describe('GET /company/visibility-statuses', () => {
    it('should return all visibility statuses', async () => {
      const response = await request(app.getHttpServer())
        .get(`/company/visibility-statuses`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);

      expect(response.body).toHaveLength(2);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/company/visibility-statuses')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('POST /company', () => {
    const createCompanyDto: CreateCompanyDto = {
      companyName: 'New Company',
      companyDescription: 'description',
      visibility: Visibility.HIDDEN,
    };

    it('should create a new company with file', async () => {
      await request(app.getHttpServer())
        .post('/company')
        .set('Cookie', [`access_token=${authToken}`])
        .field('companyData', JSON.stringify(createCompanyDto))
        .attach('file', Buffer.from('test file'), 'test.jpg')
        .expect(HttpStatus.CREATED);

      const company = await companyRepository.findOne({
        where: { companyName: createCompanyDto.companyName },
      });
      createdCompanyIds.push(company.id);
      expect(company).toBeDefined();
      expect(company.visibility).toBe(Visibility.HIDDEN);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .post('/company')
        .field('companyData', JSON.stringify(createCompanyDto))
        .attach('file', Buffer.from('test file'), 'test.jpg')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /company', () => {
    it('should get all companies with pagination', async () => {
      const newCompanies: Company[] = await companyRepository.save([
        { companyName: 'Company1', visibility: Visibility.VISIBLE },
        { companyName: 'Company2', visibility: Visibility.VISIBLE },
        { companyName: 'Company3', visibility: Visibility.HIDDEN },
        { companyName: 'Company4', visibility: Visibility.HIDDEN, owner: user },
      ]);
      newCompanies.forEach(company => createdCompanyIds.push(company.id));

      const pageOptions = { page: 1, take: 10 } as PaginationOptionsDto;

      const response = await request(app.getHttpServer())
        .get('/company')
        .query(pageOptions)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);

      const allCompanies: Company[] = await companyRepository.find({
        where: [{ visibility: Visibility.VISIBLE }, { owner: { id: user.id } }],
      });

      expect(response.body.data).toHaveLength(allCompanies.length);
      expect(response.body.meta).toMatchObject({
        page: '1',
        take: '10',
        itemCount: allCompanies.length,
        pageCount: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      });
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/company')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /company/:companyId', () => {
    it('should get company by id', async () => {
      const company = await companyRepository.save({
        companyName: 'Company5',
        visibility: Visibility.HIDDEN,
        owner: user,
      });
      createdCompanyIds.push(company.id);

      const response = await request(app.getHttpServer())
        .get(`/company/${company.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(company.id);
      expect(response.body.companyName).toBe('Company5');
    });

    it('should return 404 if company not found', async () => {
      await request(app.getHttpServer())
        .get('/company/e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d')
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 401 without token', async () => {
      const company: Company = await companyRepository.save({
        companyName: 'Company6',
        visibility: Visibility.HIDDEN,
        owner: user,
      });

      await request(app.getHttpServer())
        .get(`/company/${company.id}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('PATCH /company', () => {
    const updateCompanyVisibilityDto: UpdateCompanyVisibilityDto = {
      visibility: Visibility.VISIBLE,
    };

    it("should update visibility for all owner's companies", async () => {
      const newCompanies: Company[] = await companyRepository.save([
        { companyName: 'Company7', visibility: Visibility.HIDDEN, owner: user },
        { companyName: 'Company8', visibility: Visibility.HIDDEN, owner: user },
        { companyName: 'Company9', visibility: Visibility.HIDDEN },
      ]);
      newCompanies.forEach(company => createdCompanyIds.push(company.id));
      const response = await request(app.getHttpServer())
        .patch('/company')
        .set('Cookie', [`access_token=${authToken}`])
        .send(updateCompanyVisibilityDto)
        .expect(HttpStatus.OK);

      expect(response.body.message).toBe(
        'Update companies visibility status successfully.',
      );
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .patch('/company')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('PATCH /company/:companyId', () => {
    const updateCompanyDto: UpdateCompanyDto = {
      companyName: 'new-company-name',
      companyDescription: 'new-description',
      visibility: Visibility.VISIBLE,
    };

    it('should update the company by owner with file', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company10',
        visibility: Visibility.HIDDEN,
        owner: user,
      });
      createdCompanyIds.push(existCompany.id);
      const ownerRole: Role = await roleRepository.findOne({
        where: { roleName: 'owner' },
      });
      await memberRepository.save({
        company: existCompany,
        user: user,
        role: ownerRole,
      });
      await request(app.getHttpServer())
        .patch(`/company/${existCompany.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .field('companyData', JSON.stringify(updateCompanyDto))
        .attach('file', Buffer.from('test file'), 'test.jpg')
        .expect(HttpStatus.OK);

      const company: Company = await companyRepository.findOne({
        where: { id: existCompany.id },
      });
      expect(company.companyName).toBe(updateCompanyDto.companyName);
      expect(company.visibility).toBe(Visibility.VISIBLE);
    });

    it('should not update the company by admin with file', async () => {
      const ownerUser: User = await userRepository.save({
        emailLogin: 'patch_company_owner1@mailinator.com',
        passHash:
          '$2b$10$thRF15WycBQ3uocoebpsk.YhUnJjz8QNk2A5KZKK6E4YGTHiS9Cc2',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: '',
      });
      createdCompanyOwnerIds.push(ownerUser.id);
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company12',
        visibility: Visibility.HIDDEN,
        owner: ownerUser,
      });
      createdCompanyIds.push(existCompany.id);
      const adminRole: Role = await roleRepository.findOne({
        where: { roleName: 'admin' },
      });
      await memberRepository.save({
        company: existCompany,
        user: user,
        role: adminRole,
      });
      await request(app.getHttpServer())
        .patch(`/company/${existCompany.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .field('companyData', JSON.stringify(updateCompanyDto))
        .attach('file', Buffer.from('test file'), 'test.jpg')
        .expect(HttpStatus.FORBIDDEN);

      const company: Company = await companyRepository.findOne({
        where: { id: existCompany.id },
      });
      expect(company).toBeDefined();
    });

    it('should not update the company by member with file', async () => {
      const ownerUser: User = await userRepository.save({
        emailLogin: 'patch_company_owner2@mailinator.com',
        passHash:
          '$2b$10$thRF15WycBQ3uocoebpsk.YhUnJjz8QNk2A5KZKK6E4YGTHiS9Cc2',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: '',
      });
      createdCompanyOwnerIds.push(ownerUser.id);
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company13',
        visibility: Visibility.HIDDEN,
        owner: ownerUser,
      });
      createdCompanyIds.push(existCompany.id);
      const memberRole: Role = await roleRepository.findOne({
        where: { roleName: 'member' },
      });
      await memberRepository.save({
        company: existCompany,
        user: user,
        role: memberRole,
      });
      await request(app.getHttpServer())
        .patch(`/company/${existCompany.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .field('companyData', JSON.stringify(updateCompanyDto))
        .attach('file', Buffer.from('test file'), 'test.jpg')
        .expect(HttpStatus.FORBIDDEN);

      const company: Company = await companyRepository.findOne({
        where: { id: existCompany.id },
      });
      expect(company).toBeDefined();
    });

    it('should return 401 without token', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company14',
        visibility: Visibility.HIDDEN,
        owner: user,
      });
      createdCompanyIds.push(existCompany.id);
      const ownerRole: Role = await roleRepository.findOne({
        where: { roleName: 'owner' },
      });
      await memberRepository.save({
        company: existCompany,
        user: user,
        role: ownerRole,
      });
      await request(app.getHttpServer())
        .patch(`/company/${existCompany.id}`)
        .field('companyData', JSON.stringify(updateCompanyDto))
        .attach('file', Buffer.from('test file'), 'test.jpg')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('DELETE /company/:companyId', () => {
    it('should delete company by owner', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company15',
        visibility: Visibility.HIDDEN,
        owner: user,
      });
      createdCompanyIds.push(existCompany.id);
      const ownerRole: Role = await roleRepository.findOne({
        where: { roleName: 'owner' },
      });
      await memberRepository.save({
        company: existCompany,
        user: user,
        role: ownerRole,
      });
      const response = await request(app.getHttpServer())
        .delete(`/company/${existCompany.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);
      expect(response.body.message).toBe(
        'The company was successfully deleted.',
      );
      const deletedCompany: Company = await companyRepository.findOne({
        where: { id: existCompany.id },
      });
      expect(deletedCompany).toBeNull();
    });

    it('should not delete company by admin', async () => {
      const ownerUser: User = await userRepository.save({
        emailLogin: 'delete_company_owner1@mailinator.com',
        passHash:
          '$2b$10$thRF15WycBQ3uocoebpsk.YhUnJjz8QNk2A5KZKK6E4YGTHiS9Cc2',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: '',
      });
      createdCompanyOwnerIds.push(ownerUser.id);
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company16',
        visibility: Visibility.HIDDEN,
        owner: ownerUser,
      });
      createdCompanyIds.push(existCompany.id);
      const adminRole: Role = await roleRepository.findOne({
        where: { roleName: 'admin' },
      });
      await memberRepository.save({
        company: existCompany,
        user: user,
        role: adminRole,
      });
      const response = await request(app.getHttpServer())
        .delete(`/company/${existCompany.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.FORBIDDEN);
      const deletedCompany: Company = await companyRepository.findOne({
        where: { id: existCompany.id },
      });
      expect(deletedCompany).toBeDefined();
    });

    it('should not delete company by member', async () => {
      const ownerUser: User = await userRepository.save({
        emailLogin: 'delete_company_owner2@mailinator.com',
        passHash:
          '$2b$10$thRF15WycBQ3uocoebpsk.YhUnJjz8QNk2A5KZKK6E4YGTHiS9Cc2',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: '',
      });
      createdCompanyOwnerIds.push(ownerUser.id);
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company17',
        visibility: Visibility.HIDDEN,
        owner: ownerUser,
      });
      createdCompanyIds.push(existCompany.id);
      const memberRole: Role = await roleRepository.findOne({
        where: { roleName: 'member' },
      });
      await memberRepository.save({
        company: existCompany,
        user: user,
        role: memberRole,
      });
      const response = await request(app.getHttpServer())
        .delete(`/company/${existCompany.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.FORBIDDEN);
      const deletedCompany: Company = await companyRepository.findOne({
        where: { id: existCompany.id },
      });
      expect(deletedCompany).toBeDefined();
    });

    it('should return 401 without token', async () => {
      const existCompany: Company = await companyRepository.save({
        companyName: 'Company1',
        visibility: Visibility.HIDDEN,
        owner: user,
      });
      createdCompanyIds.push(existCompany.id);
      const ownerRole: Role = await roleRepository.findOne({
        where: { roleName: 'owner' },
      });
      await memberRepository.save({
        company: existCompany,
        user: user,
        role: ownerRole,
      });
      await request(app.getHttpServer())
        .delete(`/company/${existCompany.id}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
