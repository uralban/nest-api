import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseCustomEntity } from '../../global/entities/base-custom.entity';
import { NotificationStatus } from '../../global/enums/notification-status.enum';
import { User } from '../../user/entities/user.entity';
import { Company } from '../../company/entities/company.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Notification extends BaseCustomEntity {
  @ApiProperty({
    description: 'Notification text',
  })
  @Column()
  text: string;

  @ApiProperty({ description: 'Notification status' })
  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.UNREAD,
  })
  status: NotificationStatus;

  @ApiProperty({ description: 'User', type: () => User })
  @ManyToOne(() => User, user => user.notifications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({ description: 'Company', type: () => Company })
  @ManyToOne(() => Company, company => company.notifications, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  company?: Company;
}
