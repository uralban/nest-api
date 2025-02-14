import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { Visibility } from '../../global/enums/visibility.enum';

export class CreateCompanyDto {
  @ApiProperty({ description: 'Company name', example: 'Company' })
  @Type(() => String)
  @IsString({ message: 'Company name should be a string' })
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
