import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HttpStatus } from '@nestjs/common';
import { HealthCheckData } from './global/interfaces/health-check-data';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return Health Check Data', async () => {
      const result: HealthCheckData = await appController.getHealthCheck();
      expect(result).toStrictEqual({
        status_code: HttpStatus.OK,
        detail: 'ok',
        result: 'working',
      });
    });
  });
});
