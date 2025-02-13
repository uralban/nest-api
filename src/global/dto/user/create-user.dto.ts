import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @ApiProperty({ description: 'First name of the user', example: 'John' })
  @IsOptional()
  @Type(() => String)
  @IsString({ message: 'First name should be a string' })
  firstName?: string;

  @ApiProperty({ description: 'Last name of the user', example: 'Doe' })
  @IsOptional()
  @Type(() => String)
  @IsString({ message: 'Last name should be a string' })
  lastName?: string;

  @ApiProperty({
    description: 'Email of the user',
    example: 'example@example.com',
  })
  @IsNotEmpty({ message: 'Email should not be empty' })
  @Type(() => String)
  @IsEmail({}, { message: 'Email address should be a valid email address' })
  emailLogin?: string;

  @ApiProperty({ description: 'Password of the user', example: 'password' })
  @Type(() => String)
  @IsNotEmpty({ message: 'Password should not be empty' })
  @IsString({ message: 'Password should be a string' })
  password?: string;

  @ApiProperty({
    description: 'Role id',
    example: 'fd411357-18bb-4bbd-969d-7b1f05b60df5',
  })
  @Type(() => String)
  @IsNotEmpty({ message: 'Role id should not be empty' })
  @IsString({ message: 'Role id should be a string' })
  roleId?: string;
}
