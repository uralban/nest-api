import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  HttpStatus,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '../user/entities/user.entity';
import { AuthGuard } from './auth.guard';
import { AuthTokens } from '../global/decorators/auth-tokens.decorator';
import { TokenSet } from '../global/interfaces/token-set';

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
  @UseInterceptors(ClassSerializerInterceptor)
  public async getUserAfterLogin(
    @AuthTokens() tokens: TokenSet,
  ): Promise<User> {
    if (tokens.accessToken)
      return await this.authService.getUserAfterLoginByLocal(
        tokens.accessToken,
      );
    return await this.authService.getUserAfterLoginByAuth0(tokens.idToken);
  }
}
