import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateCompanyDto } from './create-company.dto';
import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { Visibility } from '../../global/enums/visibility.enum';

export class UpdateCompanyVisibilityDto extends PartialType(CreateCompanyDto) {
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
