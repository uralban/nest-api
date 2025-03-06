import { QuizScore } from './quiz-score.interface';

export interface CompanyUsersWithScore {
  userName: string;
  quizzesScore: QuizScore[];
}
