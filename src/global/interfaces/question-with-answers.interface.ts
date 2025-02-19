import { Question } from '../../quiz/entities/question.entity';

export interface QuestionWithAnswers {
  question: Question;
  answersIdList: string[];
}
