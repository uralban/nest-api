import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class LoginDto {
  @ApiProperty({
    description: 'Email of the user',
    example: 'example@example.com',
  })
  @Type(() => String)
  @IsNotEmpty({ message: 'Email should not be empty' })
  @IsEmail({}, { message: 'Email address should be a valid email address' })
  @MaxLength(200, { message: 'Max email length is 200' })
  email?: string;

  @ApiProperty({ description: 'Password of the user' })
  @Type(() => String)
  @IsNotEmpty({ message: 'Password should not be empty' })
  @IsString({ message: 'Password should be a string' })
  @MaxLength(200, { message: 'Max password length is 200' })
  password?: string;
}
