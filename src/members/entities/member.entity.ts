import { Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseCustomEntity } from '../../global/entities/base-custom.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Company } from '../../company/entities/company.entity';
import { User } from '../../user/entities/user.entity';
import { Role } from '../../role/entities/role.entity';

@Entity()
export class Member extends BaseCustomEntity {
  @ApiProperty({ description: 'Company', type: () => Company })
  @ManyToOne(() => Company, company => company.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @ApiProperty({ description: 'User', type: () => User })
  @ManyToOne(() => User, user => user.companyMemberships, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ApiProperty({ description: 'Role', type: () => Role })
  @ManyToOne(() => Role, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'roleId' })
  role: Role;
}
