import { QuizAttempt } from '../../quiz-attempt/entities/quiz-attempt.entity';

export interface QuizScore {
  quizId?: string;
  quizTitle?: string;
  attemptId?: string;
  attemptDate?: Date;
  score?: string;
  _attempts?: QuizAttempt[];
}
