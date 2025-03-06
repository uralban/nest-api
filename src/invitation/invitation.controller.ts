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
import { RoleGuard } from '../role/guards/role.guard';
import { Roles } from '../global/decorators/roles.decorator';
import { ExcludeRoleGuard } from '../role/guards/exclude-role.guard';
import { RoleEnum } from '../global/enums/role.enum';

@ApiTags('Company invitations')
@Controller('invitation')
@UseGuards(AuthGuard)
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Post()
  @UseGuards(RoleGuard)
  @ApiOperation({
    summary: 'Create new invite.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The invite has been successfully created.',
    type: Invitation,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request.',
  })
  @Roles(RoleEnum.ADMIN, RoleEnum.OWNER)
  @UseGuards(RoleGuard)
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

  @Patch(':inviteId')
  @ApiOperation({ summary: 'Set invitation status to accepted.' })
  @ApiParam({
    name: 'inviteId',
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
  @Roles(RoleEnum.MEMBER, RoleEnum.OWNER, RoleEnum.ADMIN)
  @UseGuards(ExcludeRoleGuard)
  public async acceptInvite(
    @Param('inviteId') inviteId: string,
  ): Promise<ResultMessage> {
    return this.invitationService.acceptInvite(inviteId);
  }

  @Delete(':inviteId')
  @ApiOperation({ summary: 'Set invitation status to declined.' })
  @ApiParam({
    name: 'inviteId',
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
  @Roles(RoleEnum.MEMBER)
  @UseGuards(ExcludeRoleGuard)
  public async declineInvitation(
    @Param('inviteId') inviteId: string,
  ): Promise<ResultMessage> {
    return this.invitationService.declineInvitation(inviteId);
  }
}
