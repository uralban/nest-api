import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(HttpStatus.OK)
      .expect('ok');
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/user/fd411357-18bb-4bbd-969d-7b1f05b60df5')
      .expect(HttpStatus.OK)
      .expect({
        id: 'fd411357-18bb-4bbd-969d-7b1f05b60df5',
        createdAt: '2025-01-01T05:48:22.308Z',
        updatedAt: '2025-01-23T21:24:23.009Z',
        firstName: 'Geoffrey',
        lastName: 'Walker',
        emailLogin: 'Steve.Ryan@hotmail.com',
        passHash: 'password',
        token: '',
        role: {
          id: '56765b77-1974-4e27-b36f-a4e87d8b304c',
          createdAt: '2025-01-23T21:24:23.009Z',
          updatedAt: '2025-01-23T21:24:23.009Z',
          roleName: 'user',
        },
      });
  });
});
