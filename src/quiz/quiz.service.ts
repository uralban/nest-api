import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
      return { message: 'The quiz has been created.' };
    } catch (error) {
      this.logger.error('Error while saving quiz', error.stack);
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
      .leftJoinAndSelect('quiz.questions', 'questions')
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
        questions: true,
        attempts: true,
      },
    });
    if (!quiz) {
      this.logger.error('Quiz not found.');
      throw new NotFoundException(`Quiz not found.`);
    }
    return quiz;
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
    }
  }
}
