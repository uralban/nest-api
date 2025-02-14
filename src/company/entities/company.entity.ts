import { BaseCustomEntity } from '../../global/entities/base-custom.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Visibility } from '../../global/enums/visibility.enum';

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

  @Column({
    type: 'enum',
    enum: Visibility,
    default: Visibility.HIDDEN,
  })
  visibility: string;

  @ApiProperty({ description: 'Owner', type: () => User })
  @ManyToOne(() => User, user => user.emailLogin, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userEmailLogin' })
  user: Relation<User>;
}
