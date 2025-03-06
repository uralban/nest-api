import { ErrorHandlerFilter } from './error-handler.filter';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('ErrorHandlerFilterFilter', () => {
  let filter: ErrorHandlerFilter;
  let mockArgumentsHost;

  beforeEach(() => {
    filter = new ErrorHandlerFilter();
    mockArgumentsHost = {
      switchToHttp: jest.fn(),
    };
  });

  it('should be defined', () => {
    expect(new ErrorHandlerFilter()).toBeDefined();
  });

  it('should process correctly from HttpException', () => {
    const exception = new HttpException(
      'Custom error message',
      HttpStatus.BAD_REQUEST,
    );
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const mockHttpArgumentsHost = {
      getResponse: () => mockResponse,
    };

    mockArgumentsHost.switchToHttp.mockReturnValue(mockHttpArgumentsHost);

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith({
      status_code: HttpStatus.BAD_REQUEST,
      detail: null,
      result: 'Custom error message',
    });
  });

  it('should process correctly from HttpException with object in getResponse', () => {
    const exception = new HttpException(
      { message: 'Custom error object' },
      HttpStatus.NOT_FOUND,
    );
    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const mockHttpArgumentsHost = {
      getResponse: () => mockResponse,
    };

    mockArgumentsHost.switchToHttp.mockReturnValue(mockHttpArgumentsHost);

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith({
      status_code: HttpStatus.NOT_FOUND,
      detail: null,
      result: 'Custom error object',
    });
  });
});
