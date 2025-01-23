import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: 'First name of the user', example: 'John' })
  firstName: string;

  @ApiProperty({ description: 'Last name of the user', example: 'Doe' })
  lastName: string;

  @ApiProperty({
    description: 'Email of the user',
    example: 'example@example.com',
  })
  emailLogin: string;

  @ApiProperty({ description: 'Password of the user', example: 'password' })
  password: string;
}
