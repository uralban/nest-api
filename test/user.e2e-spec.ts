import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { User } from '../src/user/entities/user.entity';
import { CreateUserDto } from '../src/user/dto/create-user.dto';
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
import { GetUsersByNameDto } from '../src/user/dto/get-users-by-name.dto';
import { UpdateUserDto } from '../src/user/dto/update-user.dto';

const redisStore: Record<string, string> = {};

describe('UserController (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let authToken: string;
  let dataSource: DataSource;
  let createdUserEmails: string[] = [];
  let user: User;

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

    user = await userRepository.save({
      emailLogin: 'test_user@mailinator.com',
      passHash: '$2b$10$thRF15WycBQ3uocoebpsk.YhUnJjz8QNk2A5KZKK6E4YGTHiS9Cc2',
      firstName: 'Test',
      lastName: 'User',
      avatarUrl: '',
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test_user@mailinator.com',
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
    if (createdUserEmails.length > 0) {
      await userRepository.delete({ emailLogin: In(createdUserEmails) });
    }
  });

  describe('POST /user', () => {
    it('should create a new user', async () => {
      const createUserDto: CreateUserDto = {
        emailLogin: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      };

      const response = await request(app.getHttpServer())
        .post('/user')
        .send(createUserDto)
        .expect(HttpStatus.CREATED);

      const newUser = await userRepository.findOne({
        where: { emailLogin: 'newuser@example.com' },
      });
      expect(newUser).toBeDefined();
      expect(newUser.firstName).toBe('New');
      createdUserEmails.push(newUser.emailLogin);
    });
  });

  describe('GET /user', () => {
    it('should get all users with pagination', async () => {
      await userRepository.save([
        {
          emailLogin: 'user1@example.com',
          firstName: 'User1',
          lastName: 'Test',
          passHash: 'hash',
          avatarUrl: '',
        },
        {
          emailLogin: 'user2@example.com',
          firstName: 'User2',
          lastName: 'Test',
          passHash: 'hash',
          avatarUrl: '',
        },
      ]);
      createdUserEmails.push('user1@example.com');
      createdUserEmails.push('user2@example.com');

      const pageOptions = { page: 1, take: 10 } as PaginationOptionsDto;

      const response = await request(app.getHttpServer())
        .get('/user')
        .query(pageOptions)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);

      expect(response.body.data).toBeDefined();
      expect(response.body.meta.page).toBe('1');
      expect(response.body.meta.take).toBe('10');
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/user')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /user/check-email-exist/:email', () => {
    it('should return emailNotExist for unused email', async () => {
      const response = await request(app.getHttpServer())
        .get('/user/check-email-exist/unique@example.com')
        .expect(HttpStatus.OK);

      expect(response.text).toBe('emailNotExist');
    });

    it('should return emailExist for existing email', async () => {
      await userRepository.save({
        emailLogin: 'existing@example.com',
        passHash: 'hash',
        firstName: 'Existing',
        lastName: 'User',
        avatarUrl: '',
      });
      createdUserEmails.push('existing@example.com');

      const response = await request(app.getHttpServer())
        .get('/user/check-email-exist/existing@example.com')
        .expect(HttpStatus.OK);

      expect(response.text).toBe('emailExist');
    });
  });

  describe('GET /user/get-users-by-name', () => {
    it('should get users by name', async () => {
      await userRepository.save([
        {
          emailLogin: 'john@example.com',
          firstName: 'John-get-users-by-name',
          lastName: 'Doe',
          passHash: 'hash',
          avatarUrl: '',
        },
        {
          emailLogin: 'jane@example.com',
          firstName: 'Jane-get-users-by-name',
          lastName: 'Doe',
          passHash: 'hash',
          avatarUrl: '',
        },
      ]);
      createdUserEmails.push('john@example.com');
      createdUserEmails.push('jane@example.com');

      const getUsersByNameDto: GetUsersByNameDto = {
        name: 'John-get-users-by-name',
      };

      const response = await request(app.getHttpServer())
        .get('/user/get-users-by-name')
        .query(getUsersByNameDto)
        .expect(HttpStatus.OK);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].firstName).toBe('John-get-users-by-name');
    });
  });

  describe('GET /user/:id', () => {
    it('should get user by id', async () => {
      const user = await userRepository.save({
        emailLogin: 'user_user1@example.com',
        passHash: 'hash',
        firstName: 'User',
        lastName: 'Test',
        avatarUrl: '',
      });
      createdUserEmails.push('user_user1@example.com');

      const response = await request(app.getHttpServer())
        .get(`/user/${user.id}`)
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);

      expect(response.body.id).toBe(user.id);
      expect(response.body.emailLogin).toBe('user_user1@example.com');
    });

    it('should return 404 if user not found', async () => {
      await request(app.getHttpServer())
        .get('/user/e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d')
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.NOT_FOUND);
    });

    it('should return 401 without token', async () => {
      const user = await userRepository.save({
        emailLogin: 'user_user2@example.com',
        passHash: 'hash',
        firstName: 'User',
        lastName: 'Test',
        avatarUrl: '',
      });
      createdUserEmails.push('user_user2@example.com');

      await request(app.getHttpServer())
        .get(`/user/${user.id}`)
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('PATCH /user', () => {
    it('should update user with file', async () => {
      await userRepository.save({
        emailLogin: 'test@mailinator.com',
        passHash:
          '$2b$10$thRF15WycBQ3uocoebpsk.YhUnJjz8QNk2A5KZKK6E4YGTHiS9Cc2',
        firstName: 'Test',
        lastName: 'User',
        avatarUrl: '',
      });
      createdUserEmails.push('test@mailinator.com');

      const updateUserDto: UpdateUserDto = {
        firstName: 'Updated',
        lastName: 'User',
      };

      const response = await request(app.getHttpServer())
        .patch('/user')
        .set('Cookie', [`access_token=${authToken}`])
        .field('userData', JSON.stringify(updateUserDto))
        .attach('file', Buffer.from('test file'), 'test.jpg')
        .expect(HttpStatus.OK);

      expect(response.body.firstName).toBe('Updated');
      expect(response.body.avatarUrl).toBeDefined();
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .patch('/user')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });

  describe('DELETE /user', () => {
    it('should self delete user', async () => {
      const response = await request(app.getHttpServer())
        .delete('/user')
        .set('Cookie', [`access_token=${authToken}`])
        .expect(HttpStatus.OK);

      expect(response.body.message).toBe('The user was successfully deleted.');

      const deletedUser: User = await userRepository.findOne({
        where: { id: user.id },
      });
      expect(deletedUser).toBeNull();
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .delete('/user')
        .expect(HttpStatus.UNAUTHORIZED);
    });
  });
});
