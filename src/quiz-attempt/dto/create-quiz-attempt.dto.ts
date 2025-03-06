import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { QuestionAttemptAnswerDto } from './question-attempt-answer.dto';

export class CreateQuizAttemptDto {
  @ApiProperty({
    description: 'Quiz id',
    example: 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d',
  })
  @Type(() => String)
  @IsNotEmpty({ message: 'Quiz id should not be empty' })
  @IsString({ message: 'Quiz id should be a string' })
  quizId?: string;

  @ApiProperty({
    description: 'List of answers',
    type: [QuestionAttemptAnswerDto],
  })
  @ValidateNested({ each: true })
  @Type(() => QuestionAttemptAnswerDto)
  @ArrayMinSize(2)
  questions: QuestionAttemptAnswerDto[];
}
