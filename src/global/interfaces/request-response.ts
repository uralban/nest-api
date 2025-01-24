import { HttpStatus } from '@nestjs/common';

export interface RequestResponse {
  status_code: HttpStatus;
  detail: any;
  result: string;
}
