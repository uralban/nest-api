import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateQuestionDto } from './create-question.dto';

export class CreateQuizDto {
  @ApiProperty({
    description: 'Company id',
    example: 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d',
  })
  @Type(() => String)
  @IsNotEmpty({ message: 'Company id should not be empty' })
  @IsString({ message: 'Company id should be a string' })
  companyId: string;

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
