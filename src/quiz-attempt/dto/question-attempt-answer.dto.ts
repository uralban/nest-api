import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsNotEmpty, IsString } from 'class-validator';

export class QuestionAttemptAnswerDto {
  @ApiProperty({
    description: 'Question id',
    example: 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d',
  })
  @Type(() => String)
  @IsNotEmpty({ message: 'Question id should not be empty' })
  @IsString({ message: 'Question id should be a string' })
  questionId?: string;

  @ApiProperty({
    description: 'Answer id list',
    example: '[e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d]',
  })
  @IsString({ each: true })
  @ArrayMinSize(1)
  answersIdList?: string[];
}
