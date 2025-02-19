import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CreateQuizDto } from './create-quiz.dto';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateQuestionDto } from './create-question.dto';

export class UpdateQuizDto extends PartialType(CreateQuizDto) {
  @ApiProperty({
    description: 'Title of the quiz',
    example: 'JavaScript Basics',
  })
  @Type(() => String)
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({
    description: 'Description of the quiz',
    example: 'A quiz covering basic JavaScript concepts',
    required: false,
  })
  @Type(() => String)
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Quiz completion frequency in days', example: 7 })
  @Type(() => Number)
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  frequencyInDays: number;

  @ApiProperty({ description: 'List of questions', type: [CreateQuestionDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  @ArrayMinSize(2)
  questions: CreateQuestionDto[];
}
