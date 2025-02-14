import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateCompanyDto } from './create-company.dto';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateCompanyVisibilityDto extends PartialType(CreateCompanyDto) {
  @ApiProperty({
    description: 'Visibility id',
    example: 'fd411357-18bb-4bbd-969d-7b1f05b60df5',
  })
  @Type(() => String)
  @IsNotEmpty({ message: 'Visibility Id should not be empty' })
  @IsString({ message: 'Visibility Id should be a string' })
  visibilityId?: string;
}
