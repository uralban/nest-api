import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { BaseCustomEntity } from '../../global/entities/base-custom.entity';
import { Company } from '../../company/entities/company.entity';
import { Question } from './question.entity';
import { QuizAttempt } from '../../quiz-attempt/entities/quiz-attempt.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Quiz extends BaseCustomEntity {
  @ApiProperty({
    description: 'Quiz title',
    example: 'Quiz',
  })
  @Column('varchar', { length: 200 })
  title: string;

  @ApiProperty({
    description: 'Quiz description',
  })
  @Column({ type: 'varchar', nullable: true })
  description: string;

  @ApiProperty({
    description: 'Quiz frequency',
    example: 10,
    default: 10,
  })
  @Column({ type: 'int', default: 10 })
  frequencyInDays: number;

  @ApiProperty({ description: 'Company', type: () => Company })
  @ManyToOne(() => Company, company => company.quizzes, { onDelete: 'CASCADE' })
  company: Company;

  @ApiProperty({ description: 'Questions list', type: () => Question })
  @OneToMany(() => Question, question => question.quiz, { cascade: true })
  questions: Question[];

  @ApiProperty({ description: 'Quiz attempts list', type: () => QuizAttempt })
  @OneToMany(() => QuizAttempt, quizAttempt => quizAttempt.quiz, {
    cascade: true,
  })
  attempts: QuizAttempt[];
}
