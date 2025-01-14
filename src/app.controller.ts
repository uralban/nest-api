import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import {HealthCheckData} from "./global/interfaces/health-check-data";

@Controller('/')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHealthCheck(): HealthCheckData {
    return this.appService.getHealthCheck();
  }
}
