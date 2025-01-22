import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
} from 'typeorm';
import { Role } from './role.entity';
import {BaseCustomEntity} from "../../global/entities/base-custom.entity";

@Entity()
export class User extends BaseCustomEntity{

  @Column('varchar', { length: 200 })
  firstName: string;

  @Column('varchar', { length: 200 })
  lastName: string;

  @Column('varchar', { length: 200, unique: true })
  emailLogin: string;

  @Column('varchar', { length: 60 })
  passHash: string;

  @Column('varchar', { length: 200 })
  token: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Role, role => role.roleName)
  role: string;
}
