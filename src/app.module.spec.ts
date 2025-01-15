import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

describe('AppModule', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
  });

  afterEach(async () => {
    await app.close();
  });

  it('should configure Swagger correctly', () => {
    const createDocumentSpy = jest.spyOn(SwaggerModule, 'createDocument');
    const setupSpy = jest.spyOn(SwaggerModule, 'setup');

    AppModule.setupSwagger(app);

    expect(createDocumentSpy).toHaveBeenCalledWith(
      app,
      expect.objectContaining({
        components: {},
        info: {
          contact: {},
          title: 'Internship backend project',
          description: `
    This API serves as the backend for the my internship application. 
    At the moment it provides only one endpoint for check health data.
    
    Description will be updated in the future.
                        `,
          version: process.env.API_VERSION,
        },
        openapi: '3.0.0',
        servers: [],
        tags: [
          {
            description: '',
            name: 'API',
          },
        ],
      }),
    );

    expect(setupSpy).toHaveBeenCalledWith('api', app, expect.any(Object));

    createDocumentSpy.mockRestore();
    setupSpy.mockRestore();
  });
});
