import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
  Query,
} from '@nestjs/common';
import { RequestService } from './request.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { AuthGuard } from '../auth/auth.guard';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from './entities/request.entity';
import { ResultMessage } from '../global/interfaces/result-message';
import { PaginationOptionsDto } from '../global/dto/pagination-options.dto';
import { GetUserEmail } from '../global/decorators/get-user-email.decorator';
import { PaginationDto } from '../global/dto/pagination.dto';
import { CompanyAdminOrOwnerGuard } from '../company/guards/company-admin-or-owner.guard';

@ApiTags('Company requests')
@Controller('request')
@UseGuards(AuthGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    transform: true,
  }),
)
export class RequestController {
  constructor(private readonly requestService: RequestService) {}

  @Post()
  @ApiOperation({
    summary: 'Create new request.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The request has been successfully created.',
    type: Request,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request.',
  })
  public async createRequest(
    @Body() createRequestDto: CreateRequestDto,
  ): Promise<ResultMessage> {
    return this.requestService.createRequest(createRequestDto);
  }

  @Get()
  @ApiOperation({ summary: "Get all user's requests." })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The list of requests.',
    type: [Request],
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request',
  })
  @UseInterceptors(ClassSerializerInterceptor)
  public async getAllUsersRequests(
    @Query() pageOptionsDto: PaginationOptionsDto,
    @GetUserEmail() email: string,
  ): Promise<PaginationDto<Request>> {
    return this.requestService.getAllUsersRequests(pageOptionsDto, email);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Set request status to accepted.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the request.',
    example: 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'The request status has been changed to accepted successfully.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Request not found.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request.',
  })
  @UseGuards(CompanyAdminOrOwnerGuard)
  public async acceptRequest(
    @Param('id') requestId: string,
  ): Promise<ResultMessage> {
    return this.requestService.acceptRequest(requestId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Set request status to declined.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the request.',
    example: 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'The request status has been changed to declined successfully.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Request not found.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request.',
  })
  public async declineRequest(
    @Param('id') id: string,
    @GetUserEmail() email: string,
  ): Promise<ResultMessage> {
    return this.requestService.declineRequest(id, email);
  }
}
