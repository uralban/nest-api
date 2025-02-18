import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export class GetAllCompanyMemberDto {
  @ApiProperty({
    description: 'Company id',
    example: 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d',
  })
  @Type(() => String)
  @IsNotEmpty({ message: 'Company id should not be empty' })
  @IsString({ message: 'Company id should be a string' })
  companyId?: string;
}
