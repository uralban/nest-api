import { HttpStatus, Injectable } from '@nestjs/common';
import { HealthCheckData } from './global/interfaces/health-check-data';

@Injectable()
export class AppService {
  public async getHealthCheck(): Promise<HealthCheckData> {
    return new Promise((resolve, reject) => {
      resolve({
        status_code: HttpStatus.OK,
        detail: 'ok',
        result: 'working',
      });
    });
  }
}
