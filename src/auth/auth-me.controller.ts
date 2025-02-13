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
import { GetUserEmail } from '../global/decorators/get-user-email.decorator';
import { GetUserGivenName } from '../global/decorators/get-user-given-name.decorator';
import { GetUserFamilyName } from '../global/decorators/get-user-family-name.decorator';

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
    @GetUserEmail() email: string,
    @GetUserGivenName() givenName: string,
    @GetUserFamilyName() familyName: string,
  ): Promise<User> {
    return await this.authService.getUserAfterLogin(
      email,
      givenName,
      familyName,
    );
  }
}
