import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpStatus,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { VisibilityService } from './visibility.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Visibility } from './entity/visibility.entity';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('Visibility')
@Controller('visibility')
@UseGuards(AuthGuard)
export class VisibilityController {
  constructor(private readonly visibilityService: VisibilityService) {}

  @Get()
  @ApiOperation({ summary: 'Get all visibility statuses.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The list of visibility statuses.',
    type: [Visibility],
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request',
  })
  @UseInterceptors(ClassSerializerInterceptor)
  public async getAllVisibilityStatuses(): Promise<Visibility[]> {
    return await this.visibilityService.getAllVisibilityStatuses();
  }
}
