import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { BaseCustomEntity } from '../../global/entities/base-custom.entity';
import { Quiz } from './quiz.entity';
import { Answer } from './answer.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Question extends BaseCustomEntity {
  @ApiProperty({
    description: 'Question content',
  })
  @Column('varchar', { length: 200 })
  content: string;

  @ApiProperty({ description: 'Quiz', type: () => Quiz })
  @ManyToOne(() => Quiz, quiz => quiz.questions, { onDelete: 'CASCADE' })
  quiz: Quiz;

  @ApiProperty({ description: 'Answers list', type: () => Answer })
  @OneToMany(() => Answer, answerOption => answerOption.question, {
    cascade: true,
  })
  answerOptions: Answer[];
}
