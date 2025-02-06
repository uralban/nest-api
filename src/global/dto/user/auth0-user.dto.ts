import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Auth0UserDto {
  @ApiProperty({ description: 'First name of the user', example: 'John' })
  given_name?: string;

  @ApiProperty({ description: 'Last name of the user', example: 'Doe' })
  family_name?: string;

  @ApiProperty({
    description: 'Email of the user',
    example: 'example@example.com',
  })
  email?: string;

  @ApiPropertyOptional({
    description: 'Email of the user',
    example: 'example@example.com',
  })
  sub?: string;
}
