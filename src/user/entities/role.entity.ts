import { Column, Entity } from 'typeorm';
import { BaseCustomEntity } from '../../global/entities/base-custom.entity';

@Entity()
export class Role extends BaseCustomEntity {
  @Column('varchar', { length: 200, unique: true })
  roleName: string;
}
