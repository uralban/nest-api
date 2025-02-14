import { BaseCustomEntity } from '../../global/entities/base-custom.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { Visibility } from '../../visibility/entity/visibility.entity';
import { User } from '../../user/entities/user.entity';

@Entity()
export class Company extends BaseCustomEntity {
  @ApiProperty({ description: 'Company name', example: 'Company' })
  @Column('varchar', { length: 200 })
  companyName: string;

  @ApiProperty({ description: 'Company description' })
  @Column('varchar')
  companyDescription: string;

  @ApiProperty({
    description: 'Company logo url',
  })
  @Column('varchar')
  logoUrl: string;

  @ApiProperty({ description: 'Company visibility', type: () => Visibility })
  @ManyToOne(() => Visibility, visibility => visibility.visibilityName)
  @JoinColumn({ name: 'visibilityId' })
  visibility: Relation<Visibility>;

  @ApiProperty({ description: 'Owner', type: () => User })
  @ManyToOne(() => User, user => user.emailLogin, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: Relation<User>;
}
