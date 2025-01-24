import { GeneralResponseInterceptor } from './general-response.interceptor';
import { Test, TestingModule } from '@nestjs/testing';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';

describe('GeneralResponseInterceptor', () => {
  let interceptor: GeneralResponseInterceptor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GeneralResponseInterceptor],
    }).compile();

    interceptor = module.get<GeneralResponseInterceptor>(
      GeneralResponseInterceptor,
    );
  });

  it('should be defined', () => {
    expect(new GeneralResponseInterceptor()).toBeDefined();
  });

  it('must modify the answer correctly', done => {
    const mockExecutionContext: Partial<ExecutionContext> = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue({ statusCode: 200 }),
      }),
    };

    const mockCallHandler: Partial<CallHandler> = {
      handle: jest.fn(() => of({ someData: 'test data' })),
    };

    interceptor
      .intercept(
        mockExecutionContext as ExecutionContext,
        mockCallHandler as CallHandler,
      )
      .subscribe(result => {
        expect(result).toEqual({
          status_code: 200,
          detail: { someData: 'test data' },
          result: 'working',
        });
        done();
      });
  });
});
