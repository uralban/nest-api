import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { HealthCheckData } from './global/interfaces/health-check-data';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('API')
@Controller('/')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get a health check data.' })
  public async getHealthCheck(): Promise<HealthCheckData> {
    try {
      return await this.appService.getHealthCheck();
    } catch (e) {
      console.error(e);
    }
  }
}
