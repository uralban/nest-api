import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ExportAttemptOptionsDto {
  @ApiProperty({
    description: 'Company id',
    example: 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d',
  })
  @Type(() => String)
  @IsNotEmpty({ message: 'Company id should not be empty' })
  @IsString({ message: 'Company id should be a string' })
  companyId?: string;

  @ApiPropertyOptional({
    description: 'User id',
    example: 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d',
  })
  @Type(() => String)
  @IsOptional()
  @IsNotEmpty({ message: 'User id should not be empty' })
  @IsString({ message: 'User id should be a string' })
  userId?: string;

  @ApiPropertyOptional({
    description: 'Quiz id',
    example: 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d',
  })
  @Type(() => String)
  @IsOptional()
  @IsNotEmpty({ message: 'Quiz id should not be empty' })
  @IsString({ message: 'Quiz id should be a string' })
  quizId?: string;
}