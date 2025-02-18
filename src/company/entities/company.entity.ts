import { BaseCustomEntity } from '../../global/entities/base-custom.entity';
import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Relation,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Visibility } from '../../global/enums/visibility.enum';
import { Member } from '../../members/entities/member.entity';
import { Request } from '../../request/entities/request.entity';
import { Invitation } from '../../invitation/entities/invitation.entity';

@Entity()
export class Company extends BaseCustomEntity {
  @ApiProperty({ description: 'Company name', example: 'Company' })
  @Column('varchar', { length: 200 })
  companyName: string;

  @ApiProperty({ description: 'Company description' })
  @Column({ type: 'varchar', default: '' })
  companyDescription: string;

  @ApiProperty({
    description: 'Company logo url',
  })
  @Column({ type: 'varchar', default: '' })
  logoUrl: string;

  @ApiProperty({ description: 'Company visibility' })
  @Column({
    type: 'enum',
    enum: Visibility,
    default: Visibility.HIDDEN,
  })
  visibility: string;

  @ApiProperty({ description: 'Owner', type: () => User })
  @ManyToOne(() => User, user => user.ownedCompanies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner: Relation<User>;

  @OneToMany(() => Member, member => member.company)
  members: Member[];

  @OneToMany(() => Request, request => request.company)
  requests: Request[];

  @OneToMany(() => Invitation, invitation => invitation.company)
  invitations: Invitation[];
}
