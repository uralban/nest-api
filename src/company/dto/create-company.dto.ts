import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

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
    description: 'Visibility id',
    example: 'fd411357-18bb-4bbd-969d-7b1f05b60df5',
  })
  @Type(() => String)
  @IsNotEmpty({ message: 'Visibility Id should not be empty' })
  @IsString({ message: 'Visibility Id should be a string' })
  visibilityId?: string;
}
