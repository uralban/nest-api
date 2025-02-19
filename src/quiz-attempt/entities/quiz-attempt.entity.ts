import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseCustomEntity } from '../../global/entities/base-custom.entity';
import { Quiz } from '../../quiz/entities/quiz.entity';
import { User } from '../../user/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class QuizAttempt extends BaseCustomEntity {
  @ApiProperty({ description: 'Quiz', type: () => Quiz })
  @ManyToOne(() => Quiz, quiz => quiz.attempts, { onDelete: 'CASCADE' })
  quiz: Quiz;

  @ApiProperty({ description: 'User', type: () => User })
  @ManyToOne(() => User, user => user.attempts, { onDelete: 'CASCADE' })
  user: User;

  @ApiProperty({
    description: 'Answers score',
    example: 0,
    default: 0,
  })
  @Column({ type: 'int', default: 0 })
  answersScore: number;

  @ApiProperty({
    description: 'Question count',
    example: 0,
    default: 0,
  })
  @Column({ type: 'int', default: 0 })
  questionCount: number;
}
