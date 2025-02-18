import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class GetUsersByNameDto {
  @ApiProperty({
    description: 'Part or full name of the users',
    example: 'John',
  })
  @Type(() => String)
  @IsString({ message: 'Name should be a string' })
  readonly name?: string;
}
