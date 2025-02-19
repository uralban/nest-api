import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateCompanyDto } from './create-company.dto';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Visibility } from '../../global/enums/visibility.enum';

export class UpdateCompanyDto extends PartialType(CreateCompanyDto) {
  @ApiProperty({ description: 'Company name', example: 'Company' })
  @Type(() => String)
  @IsString({ message: 'Company name should be a string' })
  @MaxLength(200, { message: 'Max company name length is 200' })
  companyName?: string;

  @ApiProperty({ description: 'Company description' })
  @Type(() => String)
  @IsOptional()
  @IsString({ message: 'Company description should be a string' })
  companyDescription?: string;

  @ApiProperty({ description: 'Logo url' })
  @IsOptional()
  @Type(() => String)
  @IsString({ message: 'Logo url should be a string' })
  logoUrl?: string;

  @ApiProperty({
    description: 'Visibility',
    example: 'hidden',
  })
  @Type(() => String)
  @IsNotEmpty({ message: 'Visibility should not be empty' })
  @IsEnum(Visibility, {
    message: 'Visibility Id should be either "visible" or "hidden"',
  })
  visibility?: string;
}
