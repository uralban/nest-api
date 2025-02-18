import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseCustomEntity } from '../../global/entities/base-custom.entity';
import { Company } from '../../company/entities/company.entity';
import { User } from '../../user/entities/user.entity';
import { InviteRequestStatus } from '../../global/enums/invite-request-status.enum';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Request extends BaseCustomEntity {
  @ApiProperty({ description: 'Company', type: () => Company })
  @ManyToOne(() => Company, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @ApiProperty({ description: 'Requested user', type: () => User })
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requestedUserId' })
  requestedUser: User;

  @ApiProperty({ description: 'Request status' })
  @Column({
    type: 'enum',
    enum: InviteRequestStatus,
    default: InviteRequestStatus.PENDING,
  })
  status: string;
}
