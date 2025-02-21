import { QuizScore } from './quiz-score.interface';

export interface UserQuizScore {
  userId: string;
  userEmail: string;
  quizzes: QuizScore[];
}
