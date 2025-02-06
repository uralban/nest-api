import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  HttpCode,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from '../global/dto/user/create-user.dto';
import { UpdateUserDto } from '../global/dto/user/update-user.dto';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from './entities/user.entity';
import { DeleteResultMessage } from '../global/interfaces/delete-result-message';
import { PaginationDto } from '../global/dto/pagination.dto';
import { PaginationOptionsDto } from '../global/dto/pagination-options.dto';
import { AuthGuard } from '../auth/auth.guard';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new user.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The user has been successfully created.',
    type: User,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request.',
  })
  @UseGuards(AuthGuard)
  public async createUser(@Body() createUserDto: CreateUserDto): Promise<void> {
    return this.userService.createUser(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The list of users.',
    type: [User],
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request',
  })
  @UseGuards(AuthGuard)
  public async getAllUsers(
    @Query() pageOptionsDto: PaginationOptionsDto,
  ): Promise<PaginationDto<User>> {
    return await this.userService.getAllUsers(pageOptionsDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get the user by id.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the user to get.',
    example: 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The user with the specified ID.',
    type: User,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found.',
  })
  @UseGuards(AuthGuard)
  public async getUserById(@Param('id') id: string): Promise<User> {
    return await this.userService.getUserById(id);
  }

  @Get('check-email-exist/:email')
  @ApiOperation({ summary: 'Check free email.' })
  @ApiParam({
    name: 'email',
    description: 'The email of the user to get.',
    example: 'example@email.com',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The email status',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request.',
  })
  @UseGuards(AuthGuard)
  public async getCheckEmailExist(
    @Param('email') email: string,
  ): Promise<string> {
    return await this.userService.getCheckEmailExist(email);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing user.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the user to update.',
    example: 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The user has been successfully updated.',
    type: User,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Bad request.',
  })
  @UseGuards(AuthGuard)
  public async updateUserById(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    return this.userService.updateUserById(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete the user by id.' })
  @ApiParam({
    name: 'id',
    description: 'The ID of the user to delete.',
    example: 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The user has been successfully deleted.',
    type: User,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found.',
  })
  @UseGuards(AuthGuard)
  public async removeUserById(
    @Param('id') id: string,
  ): Promise<DeleteResultMessage> {
    return this.userService.removeUserById(id);
  }
}
