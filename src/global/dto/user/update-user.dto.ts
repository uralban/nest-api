import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({
    description: 'First name of the user',
    example: 'John',
  })
  firstName?: string;

  @ApiPropertyOptional({ description: 'Last name of the user', example: 'Doe' })
  lastName?: string;

  @ApiPropertyOptional({
    description: 'Email of the user',
    example: 'example@example.com',
  })
  emailLogin?: string;

  @ApiPropertyOptional({
    description: 'Password of the user',
    example: 'password',
  })
  password?: string;
}
