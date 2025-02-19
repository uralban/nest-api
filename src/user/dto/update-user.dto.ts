import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({
    description: 'First name of the user',
    example: 'John',
  })
  @IsOptional()
  @Type(() => String)
  @IsString({ message: 'First name should be a string' })
  @MaxLength(200, { message: 'Max first name length is 200' })
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name of the user', example: 'Doe' })
  @IsOptional()
  @Type(() => String)
  @IsString({ message: 'Last name should be a string' })
  @MaxLength(200, { message: 'Max last name length is 200' })
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Password of the user',
    example: 'password',
  })
  @IsOptional()
  @Type(() => String)
  @IsNotEmpty({ message: 'Password should not be empty' })
  @IsString({ message: 'Password should be a string' })
  @MaxLength(200, { message: 'Max password length is 200' })
  password?: string;

  @ApiPropertyOptional({
    description: 'Avatar url of the user',
  })
  @IsOptional()
  @Type(() => String)
  @IsString({ message: 'Avatar url should be a string' })
  avatarUrl?: string;
}
