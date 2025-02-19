import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsNotEmpty,
  IsString,
  MaxLength,
  Validate,
  ValidateNested,
} from 'class-validator';
import { CreateAnswerDto } from './create-answer.dto';
import { ContainsCorrectAnswer } from '../../global/validators/contains-correct-answer.validator';

export class CreateQuestionDto {
  @ApiProperty({
    description: 'Quiz question content',
    example: 'What is this?',
  })
  @Type(() => String)
  @IsNotEmpty({ message: 'Content should not be empty' })
  @IsString({ message: 'Content should be a string' })
  @MaxLength(200, { message: 'Max content length is 200' })
  content: string;

  @ApiProperty({
    description: 'List of possible answers',
    type: [CreateAnswerDto],
  })
  @ValidateNested({ each: true })
  @Type(() => CreateAnswerDto)
  @ArrayMinSize(2)
  @Validate(ContainsCorrectAnswer)
  answerOptions: CreateAnswerDto[];
}
