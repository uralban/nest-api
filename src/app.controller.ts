import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('API')
@Controller('/api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({ summary: 'Get a health check data.' })
  public async getHealthCheck(): Promise<string> {
    return await this.appService.getHealthCheck();
  }
}
