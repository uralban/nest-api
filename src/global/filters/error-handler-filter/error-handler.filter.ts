import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { HttpArgumentsHost } from '@nestjs/common/interfaces';
import { RequestResponse } from '../../interfaces/request-response';

@Catch()
export class ErrorHandlerFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx: HttpArgumentsHost = host.switchToHttp();
    const response: Response<RequestResponse> = ctx.getResponse<Response>();

    let status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string = 'Internal server error. Please contact Alex.';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse: string | object = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : //@ts-expect-error: property 'object' is not defined, but it has property 'message'
            exceptionResponse.message;
    }

    response.status(status).json({
      status_code: status,
      detail: null,
      result: message,
    });
  }
}
