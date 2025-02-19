import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseCustomEntity } from '../../global/entities/base-custom.entity';
import { Question } from './question.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Answer extends BaseCustomEntity {
  @ApiProperty({
    description: 'Answer content',
  })
  @Column('varchar', { length: 200 })
  content: string;

  @ApiProperty({
    description: 'Is answer correct',
    example: false,
    default: false,
  })
  @Column('boolean', { default: false })
  isCorrect: boolean;

  @ApiProperty({ description: 'Question', type: () => Question })
  @ManyToOne(() => Question, question => question.answerOptions, {
    onDelete: 'CASCADE',
  })
  question: Question;
}
