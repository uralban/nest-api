import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAnswerDto {
  @ApiProperty({ description: 'Answer content', example: 'Paris' })
  @Type(() => String)
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiProperty({
    example: true,
    description: 'Indicates if this answer is correct',
  })
  @IsBoolean()
  @IsNotEmpty()
  isCorrect: boolean;
}
