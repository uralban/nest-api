import { Controller, Get, HttpStatus } from '@nestjs/common';
import { RoleService } from './role.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from './entities/role.entity';

@ApiTags('Role')
@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @ApiOperation({ summary: 'Get all roles.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The list of roles.',
    type: [Role],
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request',
  })
  public async getAllRoles(): Promise<Role[]> {
    return await this.roleService.getAllRoles();
  }
}
