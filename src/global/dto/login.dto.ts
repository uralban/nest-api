import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Email of the user',
    example: 'example@example.com',
  })
  email?: string;

  @ApiProperty({ description: 'Password of the user' })
  password?: string;
}
