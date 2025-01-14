import { Injectable } from '@nestjs/common';
import {HealthCheckData} from "./global/interfaces/health-check-data";

@Injectable()
export class AppService {
  getHealthCheck(): HealthCheckData {
    return {
      status_code: 200,
      detail: 'ok',
      result: 'working'
    };
  }
}
