export interface QuizScore {
  quizId: string;
  quizTitle: string;
  attemptId?: string;
  attemptDate: Date;
  score?: string;
}
