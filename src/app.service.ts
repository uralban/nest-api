import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { HealthCheckData } from './global/interfaces/health-check-data';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  public async getHealthCheck(): Promise<HealthCheckData> {
    return new Promise(resolve => {
      resolve({
        status_code: HttpStatus.OK,
        detail: 'ok',
        result: 'working',
      });
      this.logger.log('Getting health check is OK');
    });
  }
}
