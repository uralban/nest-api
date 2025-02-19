import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class GetUsersByNameDto {
  @ApiProperty({
    description: 'Part or full name of the users',
    example: 'John',
  })
  @Type(() => String)
  @IsString({ message: 'Name should be a string' })
  @MaxLength(200, { message: 'Max name length is 200' })
  readonly name?: string;
}
