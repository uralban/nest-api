import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { QuizDto } from './dto/quiz.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Quiz } from './entities/quiz.entity';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AppService } from '../app.service';
import { ResultMessage } from '../global/interfaces/result-message';
import { Question } from './entities/question.entity';
import { Answer } from './entities/answer.entity';
import { PaginationOptionsDto } from '../global/dto/pagination-options.dto';
import { PaginationDto } from '../global/dto/pagination.dto';
import { PaginationMetaDto } from '../global/dto/pagination-meta.dto';
import { NotificationGateway } from '../notification/notification.gateway';
import { Member } from '../members/entities/member.entity';
import { CreateNotificationDto } from '../notification/dto/create-notification.dto';
import { QuizAttempt } from '../quiz-attempt/entities/quiz-attempt.entity';
import { QuizStartResult } from '../global/interfaces/quiz-start-result.interface';

@Injectable()
export class QuizService {
  private readonly logger: Logger = new Logger(AppService.name);

  constructor(
    @InjectRepository(Quiz)
    private readonly quizRepository: Repository<Quiz>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(Answer)
    private readonly answerRepository: Repository<Answer>,
    @InjectRepository(Member)
    private readonly memberRepository: Repository<Member>,
    @InjectRepository(QuizAttempt)
    private readonly quizAttemptRepository: Repository<QuizAttempt>,
    private notificationGateway: NotificationGateway,
  ) {}

  public async createNewQuiz(
    createQuizDto: QuizDto,
    companyId: string,
  ): Promise<ResultMessage> {
    this.logger.log('Attempting to create a new quiz.');
    const newQuiz: Quiz = this.quizRepository.create({
      title: createQuizDto.title,
      description: createQuizDto.description,
      frequencyInDays: createQuizDto.frequencyInDays,
      company: { id: companyId },
    });
    this.logger.log('Saving the new quiz to the database.');
    try {
      await this.quizRepository.save(newQuiz);
      for (const questionDto of createQuizDto.questions) {
        const question: Question = this.questionRepository.create({
          content: questionDto.content,
          quiz: newQuiz,
        });
        await this.questionRepository.save(question);
        for (const answerDto of questionDto.answerOptions) {
          const answer: Answer = this.answerRepository.create({
            content: answerDto.content,
            isCorrect: answerDto.isCorrect,
            question,
          });
          await this.answerRepository.save(answer);
        }
      }
      this.logger.log('Successfully created new quiz.');
      await this.sendNotificationToAllCompanyMembers(companyId);
      return { message: 'The quiz has been created.' };
    } catch (error) {
      this.logger.error('Error while saving quiz', error.stack);
      throw new InternalServerErrorException('Error while saving quiz');
    }
  }

  public async getQuizzesForCompanyById(
    companyId: string,
    pageOptionsDto: PaginationOptionsDto,
  ): Promise<PaginationDto<Quiz>> {
    const queryBuilder: SelectQueryBuilder<Quiz> =
      this.quizRepository.createQueryBuilder('quiz');
    queryBuilder
      .leftJoinAndSelect('quiz.company', 'company')
      .leftJoinAndSelect('quiz.attempts', 'attempts')
      .leftJoinAndSelect('attempts.user', 'user')
      .where('company.id = :companyId', { companyId: companyId })
      .orderBy('quiz.createdAt', pageOptionsDto.order)
      .skip(pageOptionsDto.skip)
      .take(+pageOptionsDto.take);
    const itemCount: number = await queryBuilder.getCount();
    const { entities } = await queryBuilder.getRawAndEntities();
    const pageMetaDto: PaginationMetaDto = new PaginationMetaDto({
      paginationOptionsDto: pageOptionsDto,
      itemCount,
    });
    return new PaginationDto(entities, pageMetaDto);
  }

  public async getQuizById(quizId: string): Promise<Quiz> {
    const quiz: Quiz = await this.quizRepository.findOne({
      where: { id: quizId },
      relations: {
        company: true,
        questions: {
          answerOptions: true,
        },
        attempts: true,
      },
    });
    if (!quiz) {
      this.logger.error('Quiz not found.');
      throw new NotFoundException(`Quiz not found.`);
    }
    return quiz;
  }

  public async getQuizByIdForStart(
    quizId: string,
    email: string,
  ): Promise<QuizStartResult> {
    const quiz: Quiz = await this.getQuizById(quizId);
    quiz.questions.forEach((question: Question) => {
      question.answerOptions.forEach((answer: Answer) => {
        delete answer.isCorrect;
      });
    });
    const lastUserAttempt: QuizAttempt = await this.quizAttemptRepository
      .createQueryBuilder('quizAttempt')
      .leftJoinAndSelect('quizAttempt.quiz', 'quiz')
      .leftJoinAndSelect('quizAttempt.user', 'user')
      .where('quiz.id = :quizId', { quizId })
      .andWhere('user.emailLogin = :email', { email })
      .orderBy('quizAttempt.createdAt', 'DESC')
      .getOne();
    if (
      lastUserAttempt &&
      new Date(lastUserAttempt.createdAt).getTime() +
        quiz.frequencyInDays * 24 * 60 * 60 * 1000 >
        new Date().getTime()
    ) {
      return {
        message: 'You recently took the quiz, please try again later.',
      };
    }
    return { quiz };
  }

  public async updateQuizById(
    quizId: string,
    updateQuizDto: QuizDto,
  ): Promise<ResultMessage> {
    this.logger.log('Attempting to update quiz.');
    const quiz: Quiz = await this.getQuizById(quizId);
    const { questions, ...newQuizData } = updateQuizDto;
    Object.assign(quiz, newQuizData);
    try {
      this.logger.log('Saving the updated quiz to the database.');
      await this.quizRepository.save(quiz);
      this.logger.log('Delete old questions.');
      await this.questionRepository.delete({ quiz: { id: quizId } });
      this.logger.log('Saving new questions for quiz.');
      for (const questionDto of questions) {
        const question: Question = this.questionRepository.create({
          content: questionDto.content,
          quiz,
        });
        await this.questionRepository.save(question);
        this.logger.log('Saving new answers for quiz question.');
        for (const answerDto of questionDto.answerOptions) {
          const answer: Answer = this.answerRepository.create({
            content: answerDto.content,
            isCorrect: answerDto.isCorrect,
            question,
          });
          await this.answerRepository.save(answer);
        }
      }
      return { message: 'Successfully updated quiz.' };
    } catch (error) {
      this.logger.error(`Failed to save updated quiz.`, error.stack);
      throw new InternalServerErrorException('Failed to save updated quiz.');
    }
  }

  public async removeQuizById(quizId: string): Promise<ResultMessage> {
    this.logger.log('Attempting to remove quiz.');
    const quiz: Quiz = await this.getQuizById(quizId);
    this.logger.log(`Deleting quiz with ID ${quizId}.`);
    try {
      await this.quizRepository.remove(quiz);
      this.logger.log('Successfully removed quiz from the database.');
      return {
        message: `The quiz was successfully deleted.`,
      };
    } catch (error) {
      this.logger.error(`Failed to remove quiz from the database`, error.stack);
      throw new InternalServerErrorException(
        'Failed to remove quiz from the database.',
      );
    }
  }

  public async sendNotificationToAllCompanyMembers(
    companyId: string,
  ): Promise<void> {
    this.logger.log('Attempting to send notifications to all company users.');
    const members: Member[] = await this.memberRepository.find({
      where: {
        company: { id: companyId },
      },
      relations: {
        company: true,
        user: true,
      },
    });
    if (!members.length) {
      throw new NotFoundException(`No members found for this company`);
    }
    const notification: CreateNotificationDto = {
      message: `New quiz was created in company ${members[0].company.companyName}.`,
    };
    members.forEach((member: Member) => {
      this.notificationGateway.sendNotificationToUser(
        member.user.id,
        notification,
        companyId,
      );
    });
  }
}
