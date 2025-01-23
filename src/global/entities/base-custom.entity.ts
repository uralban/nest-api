import { Entity, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class BaseCustomEntity {
  @ApiProperty({
    description: 'Unique ID',
    example: 'e1d4f6c0-b99a-4b59-8d94-c1a8347e8e3d',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;
}
