import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @ApiProperty({ description: 'First name of the user', example: 'John' })
  @IsOptional()
  @Type(() => String)
  @IsString({ message: 'First name should be a string' })
  @MaxLength(200, { message: 'Max first name length is 200' })
  firstName?: string;

  @ApiProperty({ description: 'Last name of the user', example: 'Doe' })
  @IsOptional()
  @Type(() => String)
  @IsString({ message: 'Last name should be a string' })
  @MaxLength(200, { message: 'Max last name length is 200' })
  lastName?: string;

  @ApiProperty({
    description: 'Email of the user',
    example: 'example@example.com',
  })
  @IsNotEmpty({ message: 'Email should not be empty' })
  @Type(() => String)
  @IsEmail({}, { message: 'Email address should be a valid email address' })
  @MaxLength(200, { message: 'Max email length is 200' })
  emailLogin?: string;

  @ApiProperty({ description: 'Password of the user', example: 'password' })
  @Type(() => String)
  @IsNotEmpty({ message: 'Password should not be empty' })
  @IsString({ message: 'Password should be a string' })
  @MaxLength(200, { message: 'Max password length is 200' })
  password?: string;

  @ApiProperty({ description: 'Avatar url' })
  @IsOptional()
  @Type(() => String)
  @IsString({ message: 'Avatar url should be a string' })
  avatarUrl?: string;
}
