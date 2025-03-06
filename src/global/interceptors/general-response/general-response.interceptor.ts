import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  StreamableFile,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { Response } from 'express';
import { RequestResponse } from '../../interfaces/request-response';

@Injectable()
export class GeneralResponseInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<RequestResponse | StreamableFile> {
    const response: Response = context.switchToHttp().getResponse<Response>();
    const statusCode: number = response.statusCode as number;

    return next.handle().pipe(
      map(data => {
        if (data instanceof StreamableFile) {
          return data;
        }
        return {
          status_code: statusCode,
          detail: data,
          result: 'working',
        };
      }),
    );
  }
}
