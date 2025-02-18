import {
  Body,
  Controller,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Response } from 'express';
import { LoginDto } from './dto/login.dto';
import { TokenSet } from '../global/interfaces/token-set';
import { AuthGuard } from './auth.guard';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetUserEmail } from '../global/decorators/get-user-email.decorator';

@ApiTags('Authorization')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Authenticate user with local strategy' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Authorize successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request',
  })
  public async login(
    @Body() body: LoginDto,
    @Res() response: Response,
  ): Promise<Response> {
    const tokens: TokenSet = await this.authService.validateUser(body);
    response.cookie('access_token', tokens.accessToken, { httpOnly: true });
    response.cookie('refresh_token', tokens.refreshToken, { httpOnly: true });
    return response.send({});
  }

  @Post('logout')
  @ApiOperation({ summary: 'Logout user with local strategy' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logout successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request',
  })
  @UseGuards(AuthGuard)
  public async logout(
    @GetUserEmail() email: string,
    @Res() response: Response,
  ): Promise<Response> {
    await this.authService.logoutUser(email);
    response.clearCookie('access_token');
    response.clearCookie('refresh_token');
    return response.send({});
  }
}
