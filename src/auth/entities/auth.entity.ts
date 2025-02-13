import { Column, Entity, JoinColumn, OneToOne, Relation } from 'typeorm';
import { BaseCustomEntity } from '../../global/entities/base-custom.entity';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../user/entities/user.entity';
import { Exclude } from 'class-transformer';

@Entity()
export class Auth extends BaseCustomEntity {
  @ApiProperty({ description: 'Token' })
  @Column('varchar', { length: 200 })
  refreshToken: string;

  @ApiProperty({ description: 'User', type: () => User })
  @OneToOne(() => User, user => user.emailLogin, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userEmail', referencedColumnName: 'emailLogin' })
  @Exclude()
  user: Relation<User>;
}
