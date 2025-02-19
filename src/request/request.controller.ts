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
import { RoleGuard } from '../role/guards/role.guard';
import { Roles } from '../global/decorators/roles.decorator';
import { ExcludeRoleGuard } from '../role/guards/exclude-role.guard';
import { RoleEnum } from '../global/enums/role.enum';

@ApiTags('Company requests')
@Controller('request')
@UseGuards(AuthGuard)
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

  @Patch(':requestId')
  @ApiOperation({ summary: 'Set request status to accepted.' })
  @ApiParam({
    name: 'requestId',
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
  @Roles(RoleEnum.ADMIN, RoleEnum.OWNER)
  @UseGuards(RoleGuard)
  public async acceptRequest(
    @Param('requestId') requestId: string,
  ): Promise<ResultMessage> {
    return this.requestService.acceptRequest(requestId);
  }

  @Delete(':requestId')
  @ApiOperation({ summary: 'Set request status to declined.' })
  @ApiParam({
    name: 'requestId',
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
  @Roles(RoleEnum.MEMBER)
  @UseGuards(ExcludeRoleGuard)
  public async declineRequest(
    @Param('requestId') requestId: string,
  ): Promise<ResultMessage> {
    return this.requestService.declineRequest(requestId);
  }
}
