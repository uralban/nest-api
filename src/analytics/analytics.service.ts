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
import { CompanyUsersWithScore } from '../global/interfaces/company-users-with-score.interface';
import { QuizWithLastDate } from '../global/interfaces/quiz-with-last-date.interface';
import { UsersQuizzesWithScore } from '../global/interfaces/users-quizzes-with-score.interface';

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

  public async getUserQuizScores(
    email: string,
  ): Promise<UsersQuizzesWithScore[]> {
    this.logger.log('Attempting to get list of user score for each quiz.');
    const user: User = await this.getUserWithAttemptsByEmail(email);
    if (user.attempts.length === 0) return [];
    this.logger.log('Start calculation scores...');
    const usersQuizzesWithScore: UsersQuizzesWithScore[] = [];
    user.attempts
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
      .forEach(attempt => {
        const usersQuizzesWithScoreIndex: number =
          usersQuizzesWithScore.findIndex(
            usersQuizzesWithScore =>
              usersQuizzesWithScore.quizTitle === attempt.quiz.title,
          );
        if (usersQuizzesWithScoreIndex === -1) {
          const quizScore: string = this.quizAttemptService.scoreExecutor([
            attempt,
          ]);
          usersQuizzesWithScore.push({
            quizTitle: attempt.quiz.title,
            quizzesScore: [
              {
                attemptDate: attempt.createdAt,
                score: quizScore,
                _attempts: [attempt],
              },
            ],
          });
        } else {
          const newTempAttemptList: QuizAttempt[] = [
            ...usersQuizzesWithScore[usersQuizzesWithScoreIndex].quizzesScore[
              usersQuizzesWithScore[usersQuizzesWithScoreIndex].quizzesScore
                .length - 1
            ]._attempts,
            attempt,
          ];
          const quizScore: string =
            this.quizAttemptService.scoreExecutor(newTempAttemptList);
          usersQuizzesWithScore[usersQuizzesWithScoreIndex].quizzesScore.push({
            attemptDate: attempt.createdAt,
            score: quizScore,
            _attempts: newTempAttemptList,
          });
        }
      });
    usersQuizzesWithScore.forEach(usersQuizWithScore =>
      usersQuizWithScore.quizzesScore.forEach(
        quizScore => delete quizScore._attempts,
      ),
    );
    this.logger.log('Calculation scores complete.');
    return usersQuizzesWithScore;
  }

  public async getUserQuizCompanyScore(
    companyId: string,
    email: string,
  ): Promise<QuizScore> {
    this.logger.log('Attempting to get user score in company.');
    const user: User = await this.getUserWithAttemptsByEmail(email);
    if (user.attempts.length === 0) return {};
    const attempts: QuizAttempt[] = user.attempts.filter(
      attempt => attempt.quiz.company.id === companyId,
    );
    if (!attempts.length) return {};
    this.logger.log('Start calculation scores...');
    const quizScore: string = this.quizAttemptService.scoreExecutor(attempts);
    this.logger.log('Calculation scores complete.');
    return {
      score: quizScore,
    };
  }

  public async getUserLastAttempts(email: string): Promise<QuizWithLastDate[]> {
    this.logger.log('Attempting to get list of user quiz for each quiz.');
    const user: User = await this.getUserWithAttemptsByEmail(email);
    if (user.attempts.length === 0) {
      this.logger.log('There are not attempts');
      return [];
    }
    this.logger.log('Start calculation scores...');
    const quizScores: QuizWithLastDate[] = [];
    user.attempts.forEach(attempt => {
      const quizScoreIndex: number = quizScores.findIndex(
        quizScore => quizScore.quizId === attempt.quiz.id,
      );
      if (quizScoreIndex === -1) {
        quizScores.push({
          quizId: attempt.quiz.id,
          quizTitle: attempt.quiz.title,
          quizCompanyName: attempt.quiz.company.companyName,
          attemptDate: attempt.createdAt,
        });
      } else {
        if (
          new Date(attempt.createdAt).getTime() >
          new Date(quizScores[quizScoreIndex].attemptDate).getTime()
        )
          quizScores[quizScoreIndex].attemptDate = attempt.createdAt;
      }
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
    if (!members?.length) {
      this.logger.log('There are not members');
      return [];
    }
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
  ): Promise<CompanyUsersWithScore[]> {
    this.logger.log('Attempting to get list of company users score.');
    const users: User[] = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.attempts', 'attempts')
      .leftJoinAndSelect('attempts.quiz', 'quiz')
      .leftJoinAndSelect('quiz.company', 'company')
      .where('company.id = :companyId', { companyId })
      .getMany();
    if (users?.length === 0) {
      this.logger.log('There are not attempts');
      return [];
    }
    this.logger.log('Start calculation scores...');
    const usersWithScore: CompanyUsersWithScore[] = [];
    users.forEach((user: User) => {
      const quizScores: QuizScore[] = [];
      const attemptsListForExecute: QuizAttempt[] = [];
      user.attempts
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        )
        .forEach(attempt => {
          attemptsListForExecute.push(attempt);
          const userScore: string = this.quizAttemptService.scoreExecutor(
            attemptsListForExecute,
          );
          const newQuizScore: QuizScore = {
            attemptDate: attempt.createdAt,
            score: userScore,
          };
          quizScores.push(newQuizScore);
        });
      usersWithScore.push({
        userName: this.getUserName(user),
        quizzesScore: quizScores,
      });
    });
    this.logger.log('Calculation scores complete.');
    return usersWithScore;
  }

  private getUserName(user: User): string {
    if (!user.firstName && !user.lastName) {
      return user.emailLogin || '';
    } else if (user.firstName && user.lastName) {
      return user.firstName + ' ' + user.lastName;
    } else {
      return user.firstName ? user.firstName : user.lastName || '';
    }
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
    if (!members?.length) {
      this.logger.log('There are not members');
      return [];
    }
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
        attempts: {
          quiz: {
            company: true,
          },
        },
      },
    });
    if (!user) {
      this.logger.error('User not found.');
      throw new NotFoundException(`User with email ${email} not found.`);
    }
    return user;
  }
}
