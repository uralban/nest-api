import { HttpStatus } from '@nestjs/common';

export interface HealthCheckData {
  status_code: HttpStatus;
  detail: string;
  result: string;
}
