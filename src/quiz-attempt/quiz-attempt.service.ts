import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AppService } from '../app.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Quiz } from '../quiz/entities/quiz.entity';
import { Repository } from 'typeorm';
import { Question } from '../quiz/entities/question.entity';
import { QuizAttempt } from './entities/quiz-attempt.entity';
import { RedisService } from '../redis/redis.service';
import { CreateQuizAttemptDto } from './dto/create-quiz-attempt.dto';
import { User } from '../user/entities/user.entity';
import { QuestionWithAnswers } from '../global/interfaces/question-with-answers.interface';
import { UserService } from '../user/user.service';
import { QuizService } from '../quiz/quiz.service';
import { ResultMessage } from '../global/interfaces/result-message';
import { AnswersScoreData } from '../global/interfaces/answers-score-data.interface';
import { Answer } from '../quiz/entities/answer.entity';
import { createObjectCsvStringifier } from 'csv-writer';
import { StoredAttempt } from '../global/interfaces/stored-attempt.interface';
import { ExportType } from '../global/enums/export-type.enum';
import { ExportAttemptOptionsDto } from './dto/export-attempt-options.dto';
import { ExportQuizAttemptsByCompanyData } from '../global/interfaces/export-quiz-attempts-by-company-data.interface';

@Injectable()
export class QuizAttemptService {
  private readonly logger: Logger = new Logger(AppService.name);

  constructor(
    @InjectRepository(QuizAttempt)
    private readonly quizAttemptRepository: Repository<QuizAttempt>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly redisService: RedisService,
    private readonly quizService: QuizService,
    private readonly userService: UserService,
  ) {}

  public async createNewQuizAttempt(
    createQuizAttemptDto: CreateQuizAttemptDto,
  ) {
    this.logger.log('Attempting to create a new quiz attempt.');
    const { quizId, userId, questions } = createQuizAttemptDto;
    const quiz: Quiz = await this.quizService.getQuizById(quizId);
    const user: User = await this.userService.getUserById(userId);
    let answersScore: number = 0;
    const questionCount: number = questions.length;
    const questionsAndAnswerData: QuestionWithAnswers[] = [];
    this.logger.log('Start checking answers...');
    for (const questionAttempt of questions) {
      const question: Question = await this.questionRepository.findOne({
        where: { id: questionAttempt.questionId },
        relations: {
          answerOptions: true,
        },
      });
      if (!question) continue;
      const correctAnswerId: string = question.answerOptions.find(
        answer => answer.isCorrect,
      ).id;
      const totalAnswerIds: string[] = question.answerOptions.map(
        answer => answer.id,
      );
      const selectedAnswersIds: string[] = questionAttempt.answersIdList;
      const isSelectAnswerChecked: boolean =
        selectedAnswersIds.findIndex(
          answerId => answerId === correctAnswerId,
        ) !== -1;
      questionsAndAnswerData.push({
        question: question,
        answersIdList: selectedAnswersIds,
      });
      if (
        selectedAnswersIds.length === 1 &&
        selectedAnswersIds[0] === correctAnswerId
      ) {
        answersScore += 1;
        continue;
      }
      if (
        selectedAnswersIds.length === totalAnswerIds.length ||
        !isSelectAnswerChecked
      ) {
        continue;
      }
      answersScore += 1 / selectedAnswersIds.length;
    }
    this.logger.log('Answers checking complete.');
    this.logger.log('Create quiz attempt to DB saving.');
    const newQuizAttempt: QuizAttempt = this.quizAttemptRepository.create({
      quiz: quiz,
      user: user,
      answersScore: answersScore,
      questionCount: questionCount,
    });
    this.logger.log('Saving the new quiz to the database.');
    try {
      await this.quizAttemptRepository.save(newQuizAttempt);
      this.logger.log('Successfully save new quiz attempt in DB.');
    } catch (error) {
      this.logger.error('Error while saving quiz attempt', error.stack);
    }
    this.logger.log('Create attempt data to cache saving.');
    const attemptId: string = newQuizAttempt.id;
    const attemptData: StoredAttempt = {
      user: { id: user.id, email: user.emailLogin },
      company: { id: quiz.company.id, companyName: quiz.company.companyName },
      quiz: { id: quiz.id, title: quiz.title },
      questionsAndAnswers: questionsAndAnswerData,
    };
    this.logger.log('Saving the new attempt data to cache.');
    try {
      await this.redisService.set(
        `quiz_attempt:${attemptId}`,
        JSON.stringify(attemptData),
        172800,
      );
    } catch (error) {
      this.logger.error(
        'Error while saving quiz attempt data in cache',
        error.stack,
      );
    }
    return { message: 'Attempt saved successfully.' };
  }

  public async getUserCompanyScore(
    companyId: string,
    email: string,
  ): Promise<ResultMessage> {
    this.logger.log('Attempting to get user score in company.');
    const attempts: QuizAttempt[] = await this.quizAttemptRepository.find({
      where: {
        quiz: { company: { id: companyId } },
        user: { emailLogin: email },
      },
    });
    if (!attempts) {
      this.logger.error('Attempts not found.');
      throw new NotFoundException(`Attempts not found.`);
    }
    return { message: this.scoreExecutor(attempts) };
  }

  public async getUserTotalScore(email: string): Promise<ResultMessage> {
    this.logger.log('Attempting to get total user score.');
    const user: User = await this.userRepository.findOne({
      where: { emailLogin: email },
      relations: {
        attempts: true,
      },
    });
    if (!user) {
      this.logger.error('User not found.');
      throw new NotFoundException(`User with email ${email} not found.`);
    }
    if (user.attempts.length === 0)
      throw new NotFoundException('No quiz attempts found');
    return { message: this.scoreExecutor(user.attempts) };
  }

  public scoreExecutor(quizAttemptList: QuizAttempt[]): string {
    const totalAnswersScoreData: AnswersScoreData = quizAttemptList.reduce(
      (res, attempt) => {
        return {
          answersScore: res.answersScore + attempt.answersScore,
          questionCount: res.questionCount + attempt.questionCount,
        };
      },
      {
        answersScore: 0,
        questionCount: 0,
      },
    );
    return (
      totalAnswersScoreData.answersScore / totalAnswersScoreData.questionCount
    ).toString();
  }

  public async exportQuizAttemptsByCompany(
    exportType: ExportType,
    exportAttemptOptionsDto: ExportAttemptOptionsDto,
  ): Promise<ExportQuizAttemptsByCompanyData> {
    const contentType: string =
      exportType === ExportType.JSON ? 'application/json' : 'text/csv';
    let filename: string;
    const attempts: StoredAttempt[] = await this.getAttemptsFromCache();
    if (exportAttemptOptionsDto.userId && !exportAttemptOptionsDto.quizId) {
      const data: string = await this.exportQuizAttemptsByCompanyUser(
        attempts,
        exportAttemptOptionsDto.companyId,
        exportAttemptOptionsDto.userId,
        exportType,
      );
      if (!data) {
        throw new NotFoundException(
          'No quiz attempts found for the company user.',
        );
      }
      filename = `company_user_quiz_attempts.${exportType}`;
      return { data, contentType, filename };
    }
    if (!exportAttemptOptionsDto.userId && exportAttemptOptionsDto.quizId) {
      const data: string = await this.exportQuizAttemptsByCompanyQuiz(
        attempts,
        exportAttemptOptionsDto.companyId,
        exportAttemptOptionsDto.quizId,
        exportType,
      );
      if (!data) {
        throw new NotFoundException(
          'No quiz attempts found for the company quiz.',
        );
      }
      filename = `company_quiz_quiz_attempts.${exportType}`;
      return { data, contentType, filename };
    }
    const data: string = await this.exportQuizAttemptsByAllCompany(
      attempts,
      exportAttemptOptionsDto.companyId,
      exportType,
    );
    if (!data) {
      throw new NotFoundException('No quiz attempts found for the company.');
    }
    filename = `company_quiz_attempts.${exportType}`;
    return { data, contentType, filename };
  }

  public async exportQuizAttemptsByAllCompany(
    attempts: StoredAttempt[],
    companyId: string,
    exportType: ExportType,
  ): Promise<string> {
    const filteredAttempts: StoredAttempt[] = attempts.filter(
      attempt => attempt.company.id === companyId,
    );
    switch (exportType) {
      case ExportType.JSON: {
        return JSON.stringify(filteredAttempts, null, 2);
      }
      case ExportType.CSV: {
        return this.generateCSVFromAttempts(filteredAttempts);
      }
    }
  }

  public async exportQuizAttemptsByCompanyUser(
    attempts: StoredAttempt[],
    companyId: string,
    userId: string,
    exportType: ExportType,
  ): Promise<string> {
    const filteredAttempts: StoredAttempt[] = attempts.filter(
      attempt => attempt.company.id === companyId && attempt.user.id === userId,
    );
    switch (exportType) {
      case ExportType.JSON: {
        return JSON.stringify(filteredAttempts, null, 2);
      }
      case ExportType.CSV: {
        return this.generateCSVFromAttempts(filteredAttempts);
      }
    }
  }

  public async exportQuizAttemptsByCompanyQuiz(
    attempts: StoredAttempt[],
    companyId: string,
    quizId: string,
    exportType: ExportType,
  ): Promise<string> {
    const filteredAttempts: StoredAttempt[] = attempts.filter(
      attempt => attempt.company.id === companyId && attempt.quiz.id === quizId,
    );
    switch (exportType) {
      case ExportType.JSON: {
        return JSON.stringify(filteredAttempts, null, 2);
      }
      case ExportType.CSV: {
        return this.generateCSVFromAttempts(filteredAttempts);
      }
    }
  }

  public async exportQuizAttemptsByUser(
    email: string,
    exportType: ExportType,
  ): Promise<ExportQuizAttemptsByCompanyData> {
    const contentType: string =
      exportType === ExportType.JSON ? 'application/json' : 'text/csv';
    const filename: string = `user_quiz_attempts.${exportType}`;
    const attempts: StoredAttempt[] = await this.getAttemptsFromCache();
    const filteredAttempts: StoredAttempt[] = attempts.filter(
      attempt => attempt.user.email === email,
    );
    switch (exportType) {
      case ExportType.JSON: {
        const data: string = JSON.stringify(filteredAttempts, null, 2);
        if (!data) {
          throw new NotFoundException('No quiz attempts found for user.');
        }
        return { data, contentType, filename };
      }
      case ExportType.CSV: {
        const data: string =
          await this.generateCSVFromAttempts(filteredAttempts);
        if (!data) {
          throw new NotFoundException('No quiz attempts found for user.');
        }
        return { data, contentType, filename };
      }
    }
  }

  private async getAttemptsFromCache(): Promise<StoredAttempt[]> {
    this.logger.log('Fetching quiz attempts from Redis for JSON export.');
    const keys: string[] = await this.redisService.keys('quiz_attempt:*');
    const attempts: string[] = await Promise.all(
      keys.map(key => this.redisService.get(key)),
    );
    return attempts.map(attempt => JSON.parse(attempt));
  }

  private async generateCSVFromAttempts(
    filteredAttempts: StoredAttempt[],
  ): Promise<string> {
    const csvStringifier = createObjectCsvStringifier({
      header: [
        { id: 'companyName', title: 'Company Name' },
        { id: 'userEmail', title: 'User Email' },
        { id: 'quizTitle', title: 'Quiz Title' },
        { id: 'questionContent', title: 'Question Content' },
        { id: 'usersAnswersContent', title: "User's Answers Content" },
        { id: 'correctAnswer', title: 'Correct Answer' },
      ],
    });

    const csvRecords = filteredAttempts.flatMap(attempt =>
      attempt.questionsAndAnswers.map((qa: QuestionWithAnswers) => {
        const correctAnswer: Answer = qa.question.answerOptions.find(
          (ans: Answer) => ans.isCorrect,
        );
        const answersList: string[] = [];
        qa.answersIdList.forEach(answerId => {
          answersList.push(
            qa.question.answerOptions.find((ans: Answer) => ans.id === answerId)
              .content,
          );
        });
        return {
          companyName: attempt.company.companyName,
          userEmail: attempt.user.email,
          quizTitle: attempt.quiz.title,
          questionContent: qa.question.content,
          usersAnswers: answersList.join(', '),
          correctAnswer: correctAnswer.content,
        };
      }),
    );
    return (
      csvStringifier.getHeaderString() +
      csvStringifier.stringifyRecords(csvRecords)
    );
  }
}
