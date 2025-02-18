import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  UseGuards,
  UsePipes,
  ValidationPipe,
  UseInterceptors,
  ClassSerializerInterceptor,
  Query,
} from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from '../request/entities/request.entity';
import { ResultMessage } from '../global/interfaces/result-message';
import { AuthGuard } from '../auth/auth.guard';
import { Invitation } from './entities/invitation.entity';
import { PaginationOptionsDto } from '../global/dto/pagination-options.dto';
import { GetUserEmail } from '../global/decorators/get-user-email.decorator';
import { PaginationDto } from '../global/dto/pagination.dto';
import { CompanyAdminOrOwnerGuard } from '../company/guards/company-admin-or-owner.guard';

@ApiTags('Company invitations')
@Controller('invitation')
@UseGuards(AuthGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    transform: true,
  }),
)
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Post()
  @UseGuards(CompanyAdminOrOwnerGuard)
  @ApiOperation({
    summary: 'Create new invite.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The invite has been successfully created.',
    type: Request,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request.',
  })
  public async createInvite(
    @Body() createInvitationDto: CreateInvitationDto,
  ): Promise<ResultMessage> {
    return this.invitationService.createInvite(createInvitationDto);
  }

  @Get()
  @ApiOperation({ summary: "Get all user's invites." })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The list of invites.',
    type: [Invitation],
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request',
  })
  @UseInterceptors(ClassSerializerInterceptor)
  public async getAllUsersInvites(
    @Query() pageOptionsDto: PaginationOptionsDto,
    @GetUserEmail() email: string,
  ): Promise<PaginationDto<Invitation>> {
    return this.invitationService.getAllUsersInvites(pageOptionsDto, email);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Set invitation status to accepted.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the invitation.',
    example: 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'The invitation status has been changed to accepted successfully.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Invitation not found.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request.',
  })
  public async acceptInvite(
    @Param('id') id: string,
    @GetUserEmail() email: string,
  ): Promise<ResultMessage> {
    return this.invitationService.acceptInvite(id, email);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Set invitation status to declined.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the invitation.',
    example: 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'The invitation status has been changed to declined successfully.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Invitation not found.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request.',
  })
  public async declineInvitation(
    @Param('id') id: string,
    @GetUserEmail() email: string,
  ): Promise<ResultMessage> {
    return this.invitationService.declineInvitation(id, email);
  }
}
