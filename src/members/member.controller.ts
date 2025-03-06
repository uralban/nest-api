import {
  Controller,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { MemberService } from './member.service';
import { UpdateMemberRoleDto } from './dto/update-member.dto';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { ResultMessage } from '../global/interfaces/result-message';
import { Roles } from '../global/decorators/roles.decorator';
import { RoleGuard } from '../role/guards/role.guard';
import { RoleEnum } from '../global/enums/role.enum';
import { ExcludeRoleGuard } from '../role/guards/exclude-role.guard';
import { GetUserEmail } from '../global/decorators/get-user-email.decorator';

@ApiTags('Company members')
@Controller('members')
@UseGuards(AuthGuard)
export class MemberController {
  constructor(private readonly membersService: MemberService) {}

  @Patch(':memberId')
  @ApiOperation({ summary: "Update member's role." })
  @ApiParam({
    name: 'memberId',
    description: 'The ID of the member to update.',
    example: 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The member's role has been successfully updated.",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Member not found.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request.',
  })
  @Roles(RoleEnum.ADMIN, RoleEnum.OWNER)
  @UseGuards(RoleGuard)
  public async changeRoleFromMember(
    @Param('memberId') memberId: string,
    @Body() updateMemberRoleDto: UpdateMemberRoleDto,
  ): Promise<ResultMessage> {
    return this.membersService.changeRoleFromMember(
      memberId,
      updateMemberRoleDto,
    );
  }

  @Delete('self/:companyId')
  @ApiOperation({ summary: 'Delete self \from members' })
  @ApiParam({
    name: 'companyId',
    description: 'The ID of the company.',
    example: 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The member has been successfully deleted.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Member not found.',
  })
  @Roles(RoleEnum.OWNER)
  @UseGuards(ExcludeRoleGuard)
  public async selfRemoveMember(
    @GetUserEmail() userEmail: string,
    @Param('companyId') companyId: string,
  ): Promise<ResultMessage> {
    return this.membersService.selfRemoveMember(userEmail, companyId);
  }

  @Delete(':memberId')
  @ApiOperation({ summary: 'Delete the member by id.' })
  @ApiParam({
    name: 'memberId',
    description: 'The ID of the member to delete.',
    example: 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The member has been successfully deleted.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Member not found.',
  })
  @Roles(RoleEnum.ADMIN, RoleEnum.OWNER)
  @UseGuards(RoleGuard)
  public async removeMember(
    @Param('memberId') memberId: string,
  ): Promise<ResultMessage> {
    return this.membersService.removeMember(memberId);
  }
}
