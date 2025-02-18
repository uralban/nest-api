import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { Visibility } from '../../global/enums/visibility.enum';

export class CreateCompanyDto {
  @ApiProperty({ description: 'Company name', example: 'Company' })
  @Type(() => String)
  @IsNotEmpty({ message: 'Company name should not be empty' })
  @IsString({ message: 'Company name should be a string' })
  companyName?: string;

  @ApiPropertyOptional({ description: 'Company description' })
  @IsOptional()
  @Type(() => String)
  @IsString({ message: 'Company description should be a string' })
  companyDescription?: string;

  @ApiProperty({
    description: 'Visibility',
    example: 'hidden',
  })
  @IsNotEmpty({ message: 'Visibility Id should not be empty' })
  @Type(() => String)
  @IsEnum(Visibility, {
    message: 'Visibility should be either "visible" or "hidden"',
  })
  visibility?: string;
}
