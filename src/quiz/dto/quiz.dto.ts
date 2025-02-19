import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateQuestionDto } from './create-question.dto';

export class QuizDto {
  @ApiProperty({
    description: 'Title of the quiz',
    example: 'JavaScript Basics',
  })
  @Type(() => String)
  @IsNotEmpty({ message: 'Title should not be empty' })
  @IsString({ message: 'Title should be a string' })
  @MaxLength(200, { message: 'Max title length is 200' })
  title: string;

  @ApiPropertyOptional({
    description: 'Description of the quiz',
    example: 'A quiz covering basic JavaScript concepts',
    required: false,
  })
  @Type(() => String)
  @IsOptional()
  @IsString({ message: 'Description should be a string' })
  description?: string;

  @ApiProperty({ description: 'Quiz completion frequency in days', example: 7 })
  @Type(() => Number)
  @IsNotEmpty({ message: 'Frequency should not be empty' })
  @IsInt({ message: 'Frequency should be a number' })
  @Min(1)
  frequencyInDays: number;

  @ApiProperty({ description: 'List of questions', type: [CreateQuestionDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionDto)
  @ArrayMinSize(2)
  questions: CreateQuestionDto[];
}
