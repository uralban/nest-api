import {
  Controller,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UsePipes,
  ValidationPipe,
  HttpStatus,
} from '@nestjs/common';
import { MemberService } from './member.service';
import { UpdateMemberRoleDto } from './dto/update-member.dto';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '../auth/auth.guard';
import { GetUserEmail } from '../global/decorators/get-user-email.decorator';
import { ResultMessage } from '../global/interfaces/result-message';
import { Company } from '../company/entities/company.entity';

@ApiTags('Company members')
@Controller('members')
@UseGuards(AuthGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    transform: true,
  }),
)
export class MemberController {
  constructor(private readonly membersService: MemberService) {}

  @Patch(':id')
  @ApiOperation({ summary: "Update member's role." })
  @ApiParam({
    name: 'id',
    description: 'The ID of the member to update.',
    example: 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The member's role has been successfully updated.",
    type: Company,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Member not found.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request.',
  })
  public async changeRoleFromMember(
    @Param('id') memberId: string,
    @GetUserEmail() email: string,
    @Body() updateMemberRoleDto: UpdateMemberRoleDto,
  ): Promise<ResultMessage> {
    return this.membersService.changeRoleFromMember(
      memberId,
      email,
      updateMemberRoleDto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete the member by id.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the member to delete.',
    example: 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The member has been successfully deleted.',
    type: Company,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Member not found.',
  })
  public async removeMember(
    @Param('id') memberId: string,
    @GetUserEmail() email: string,
  ): Promise<ResultMessage> {
    return this.membersService.removeMember(memberId, email);
  }
}
