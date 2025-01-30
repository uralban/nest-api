import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  public async getHealthCheck(): Promise<string> {
    return new Promise(resolve => {
      resolve('ok');
      this.logger.log('Getting health check is OK');
    });
  }
}
