import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAnswerDto {
  @ApiProperty({ description: 'Answer content', example: 'Paris' })
  @Type(() => String)
  @IsNotEmpty({ message: 'Content should not be empty' })
  @IsString({ message: 'Content should be a string' })
  @MaxLength(200, { message: 'Max content length is 200' })
  content: string;

  @ApiProperty({
    example: true,
    description: 'Indicates if this answer is correct',
  })
  @IsBoolean({ message: 'Is correct flag should be a boolean' })
  @IsNotEmpty({ message: 'Is correct flag should not be empty' })
  isCorrect: boolean;
}
