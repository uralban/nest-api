import { Column, Entity } from 'typeorm';
import { BaseCustomEntity } from '../../global/entities/base-custom.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Visibility extends BaseCustomEntity {
  @ApiProperty({ description: 'Visibility name', example: 'visible' })
  @Column('varchar', { length: 200, unique: true })
  visibilityName: string;
}
