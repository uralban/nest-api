import { BaseCustomEntity } from '../../global/entities/base-custom.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Company } from '../../company/entities/company.entity';
import { User } from '../../user/entities/user.entity';
import { InviteRequestStatus } from '../../global/enums/invite-request-status.enum';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Invitation extends BaseCustomEntity {
  @ApiProperty({ description: 'Company', type: () => Company })
  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @ApiProperty({ description: 'Invited user', type: () => User })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invitedUserId' })
  invitedUser: User;

  @ApiProperty({ description: 'Invited by user', type: () => User })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invitedBby' })
  invitedBy: User;

  @ApiProperty({ description: 'Invite status' })
  @Column({
    type: 'enum',
    enum: InviteRequestStatus,
    default: InviteRequestStatus.PENDING,
  })
  status: string;
}
