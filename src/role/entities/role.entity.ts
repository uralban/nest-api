import { Column, Entity } from 'typeorm';
import { BaseCustomEntity } from '../../global/entities/base-custom.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Role extends BaseCustomEntity {
  @ApiProperty({ description: 'Role name', example: 'user' })
  @Column('varchar', { length: 200, unique: true })
  roleName: string;
}
