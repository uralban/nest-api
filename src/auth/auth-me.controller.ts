import { Controller, Get, HttpStatus, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '../user/entities/user.entity';
import { AuthGuard } from './auth.guard';

@ApiTags('Me')
@Controller('me')
export class AuthMeController {
  constructor(private authService: AuthService) {}

  @Get()
  @ApiOperation({ summary: 'Get data by authorized user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Data sent successfully.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request',
  })
  @UseGuards(AuthGuard)
  public async getUserAfterLogin(@Req() request): Promise<User> {
    if (request.cookies?.access_token)
      return await this.authService.getUserAfterLoginByLocal(
        request.cookies?.access_token,
      );
    return await this.authService.getUserAfterLoginByAuth0(
      request.headers['x-id-token'],
    );
  }
}
