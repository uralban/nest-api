import { QuestionWithAnswers } from './question-with-answers.interface';

export interface StoredAttempt {
  user: {
    id: string;
    email: string;
  };
  company: {
    id: string;
    companyName: string;
  };
  quiz: {
    id: string;
    title: string;
  };
  questionsAndAnswers: QuestionWithAnswers[];
}
