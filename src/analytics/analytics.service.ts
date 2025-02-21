import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AppService } from '../app.service';
import { InjectRepository } from '@nestjs/typeorm';
import { QuizAttempt } from '../quiz-attempt/entities/quiz-attempt.entity';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { QuizAttemptService } from '../quiz-attempt/quiz-attempt.service';
import { QuizScore } from '../global/interfaces/quiz-score.interface';
import { Member } from '../members/entities/member.entity';
import { UserQuizScore } from '../global/interfaces/user-score.interface';
import { UserLastAttempt } from '../global/interfaces/user-last-attempt.interface';

@Injectable()
export class AnalyticsService {
  private readonly logger: Logger = new Logger(AppService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    public quizAttemptService: QuizAttemptService,
  ) {}

  public async getUserQuizScores(email: string): Promise<QuizScore[]> {
    this.logger.log('Attempting to get list of user score for each quiz.');
    const user: User = await this.getUserWithAttemptsByEmail(email);
    this.logger.log('Start calculation scores...');
    const quizScores: QuizScore[] = [];
    user.attempts.forEach(attempt => {
      const quizScore: string = this.quizAttemptService.scoreExecutor([
        attempt,
      ]);
      quizScores.push({
        quizId: attempt.quiz.id,
        quizTitle: attempt.quiz.title,
        attemptId: attempt.id,
        attemptDate: attempt.createdAt,
        score: quizScore,
      });
    });
    this.logger.log('Calculation scores complete.');
    return quizScores;
  }

  public async getUserLastAttempts(email: string): Promise<QuizScore[]> {
    this.logger.log('Attempting to get list of user quiz for each quiz.');
    const user: User = await this.getUserWithAttemptsByEmail(email);
    this.logger.log('Start calculation scores...');
    const quizScores: QuizScore[] = [];
    user.attempts.forEach(attempt => {
      quizScores.push({
        quizId: attempt.quiz.id,
        quizTitle: attempt.quiz.title,
        attemptId: attempt.id,
        attemptDate: attempt.createdAt,
      });
    });
    this.logger.log('Calculation scores complete.');
    return quizScores;
  }

  public async getCompanyUserScores(
    companyId: string,
  ): Promise<UserQuizScore[]> {
    this.logger.log('Attempting to get list of company users score.');
    const members: Member[] = await this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.company', 'company')
      .leftJoinAndSelect('member.user', 'user')
      .leftJoinAndSelect('user.attempts', 'attempts')
      .leftJoinAndSelect('attempts.quiz', 'quiz')
      .leftJoinAndSelect('quiz.company', 'quiz_company')
      .where('company.id = :companyId', { companyId })
      .andWhere('quiz_company.id = :quizCompanyId', {
        quizCompanyId: companyId,
      })
      .getMany();
    const userScores: UserQuizScore[] = [];
    this.logger.log('Start calculation scores...');
    members.forEach((member: Member) => {
      const quizScores: QuizScore[] = [];
      member.user.attempts.forEach(attempt => {
        const memberScore: string = this.quizAttemptService.scoreExecutor([
          attempt,
        ]);
        quizScores.push({
          quizId: attempt.quiz.id,
          quizTitle: attempt.quiz.title,
          attemptId: attempt.id,
          attemptDate: attempt.createdAt,
          score: memberScore,
        });
      });
      userScores.push({
        userId: member.user.id,
        userEmail: member.user.emailLogin,
        quizzes: quizScores,
      });
    });
    this.logger.log('Calculation scores complete.');
    return userScores;
  }

  public async getUserQuizScoresInCompany(
    companyId: string,
    userId: string,
  ): Promise<QuizScore[]> {
    this.logger.log('Attempting to get list of company users score.');
    const user: User = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.attempts', 'attempts')
      .leftJoinAndSelect('attempts.quiz', 'quiz')
      .leftJoinAndSelect('quiz.company', 'company')
      .where('company.id = :companyId', { companyId })
      .andWhere('user.id = :userId', { userId })
      .getOne();
    const quizScores: QuizScore[] = [];
    this.logger.log('Start calculation scores...');
    user.attempts.forEach(attempt => {
      const userScore: string = this.quizAttemptService.scoreExecutor([
        attempt,
      ]);
      quizScores.push({
        quizId: attempt.quiz.id,
        quizTitle: attempt.quiz.title,
        attemptId: attempt.id,
        attemptDate: attempt.createdAt,
        score: userScore,
      });
    });
    this.logger.log('Calculation scores complete.');
    return quizScores;
  }

  public async getCompanyUsersLastAttempts(
    companyId: string,
  ): Promise<UserLastAttempt[]> {
    const members: Member[] = await this.memberRepository
      .createQueryBuilder('member')
      .leftJoinAndSelect('member.company', 'company')
      .leftJoinAndSelect('member.user', 'user')
      .leftJoinAndSelect('user.attempts', 'attempts')
      .leftJoinAndSelect('attempts.quiz', 'quiz')
      .leftJoinAndSelect('quiz.company', 'quiz_company')
      .where('company.id = :companyId', { companyId })
      .andWhere('quiz_company.id = :quizCompanyId', {
        quizCompanyId: companyId,
      })
      .getMany();
    const userLatsAttempt: UserLastAttempt[] = [];
    this.logger.log('Start calculation scores...');
    members.forEach(member => {
      const lastAttempt: QuizAttempt = member.user.attempts.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )[0];
      userLatsAttempt.push({
        userId: member.user.id,
        userEmail: member.user.emailLogin,
        attemptId: lastAttempt.id,
        attemptDate: lastAttempt.createdAt,
      });
    });
    this.logger.log('Calculation scores complete.');
    return userLatsAttempt;
  }

  private async getUserWithAttemptsByEmail(email: string): Promise<User> {
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
    return user;
  }
}
