import { Quiz } from 'src/quiz/entities/quiz.entity';

export interface QuizStartResult {
  message?: string;
  quiz?: Quiz;
}
