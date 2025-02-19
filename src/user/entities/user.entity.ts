import { Column, Entity, OneToMany } from 'typeorm';
import { BaseCustomEntity } from '../../global/entities/base-custom.entity';
import { ApiProperty } from '@nestjs/swagger';
import { Exclude } from 'class-transformer';
import { Company } from '../../company/entities/company.entity';
import { Member } from '../../members/entities/member.entity';
import { Invitation } from '../../invitation/entities/invitation.entity';
import { QuizAttempt } from '../../quiz-attempt/entities/quiz-attempt.entity';

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

  @ApiProperty({
    description: 'Avatar url of the user',
  })
  @Column('varchar')
  avatarUrl: string;

  @ApiProperty({ description: 'Hashed password of the user' })
  @Column('varchar', { length: 60 })
  @Exclude()
  passHash: string;

  @ApiProperty({ description: 'Memberships list', type: () => Member })
  @OneToMany(() => Member, member => member.user)
  companyMemberships?: Member[];

  @ApiProperty({
    description: 'Companies list, which user is owner',
    type: () => Invitation,
  })
  @OneToMany(() => Company, company => company.owner)
  ownedCompanies?: Company[];

  @ApiProperty({ description: 'Quiz attempts list', type: () => Invitation })
  @OneToMany(() => QuizAttempt, attempt => attempt.user)
  attempts?: QuizAttempt[];
}
