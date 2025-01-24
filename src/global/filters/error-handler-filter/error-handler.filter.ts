import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { RequestResponse } from '../../interfaces/request-response';

@Catch()
export class ErrorHandlerFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx: HttpArgumentsHost = host.switchToHttp();
    const response: Response<RequestResponse> = ctx.getResponse<Response>();

    const status: number = exception.getStatus();

    const message: string =
      exception instanceof HttpException
        ? (exception.getResponse() as string)
        : 'Internal server error';

    response.status(status).json({
      status_code: status,
      detail: null,
      result: message,
    });
  }
}
