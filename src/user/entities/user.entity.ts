import { Column, Entity, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { Role } from '../../role/entities/role.entity';
import { BaseCustomEntity } from '../../global/entities/base-custom.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';

@Entity()
export class User extends BaseCustomEntity {
  @ApiProperty({ description: 'First name of the user', example: 'John' })
  @Column('varchar', { length: 200 })
  firstName: string;

  @ApiProperty({ description: 'Last name of the user', example: 'Doe' })
  @Column('varchar', { length: 200 })
  lastName: string;

  @ApiProperty({
    description: 'Email of the user',
    example: 'example@example.com',
  })
  @Column('varchar', { length: 200, unique: true })
  emailLogin: string;

  @ApiProperty({ description: 'Hashed password of the user' })
  @Column('varchar', { length: 60 })
  @Exclude()
  passHash: string;

  @ApiProperty({ description: 'Role of the user', type: () => Role })
  @ManyToOne(() => Role, role => role.roleName)
  @JoinColumn({ name: 'roleId' })
  role: Relation<Role>;
}
