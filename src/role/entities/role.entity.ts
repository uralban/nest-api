import { Column, Entity, OneToMany } from 'typeorm';
import { BaseCustomEntity } from '../../global/entities/base-custom.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Member } from '../../members/entities/member.entity';

@Entity()
export class Role extends BaseCustomEntity {
  @ApiProperty({ description: 'Role name', example: 'user' })
  @Column('varchar', { length: 200, unique: true })
  roleName: string;

  @OneToMany(() => Member, member => member.role)
  members?: Member[];
}
