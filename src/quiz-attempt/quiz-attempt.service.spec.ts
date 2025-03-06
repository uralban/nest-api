import { Test, TestingModule } from '@nestjs/testing';
import { QuizAttemptService } from './quiz-attempt.service';
import { RedisService } from '../redis/redis.service';
import { QuizService } from '../quiz/quiz.service';
import { UserService } from '../user/user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QuizAttempt } from './entities/quiz-attempt.entity';
import { Question } from '../quiz/entities/question.entity';
import { User } from '../user/entities/user.entity';
import { CreateQuizAttemptDto } from './dto/create-quiz-attempt.dto';
import { Quiz } from '../quiz/entities/quiz.entity';
import { Answer } from '../quiz/entities/answer.entity';
import { QuestionAttemptAnswerDto } from './dto/question-attempt-answer.dto';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Company } from '../company/entities/company.entity';
import { ExportType } from '../global/enums/export-type.enum';
import { ExportAttemptOptionsDto } from './dto/export-attempt-options.dto';
import { StoredAttempt } from '../global/interfaces/stored-attempt.interface';
import * as csvWriter from 'csv-writer';

jest.mock('csv-writer', () => ({
  createObjectCsvStringifier: jest.fn(),
}));

describe('QuizAttemptService', () => {
  let service: QuizAttemptService;
  let redisService: RedisService;
  let quizService: QuizService;
  let userService: UserService;

  const mockQuizAttemptRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockQuestionRepository = {
    findOne: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    })),
  };

  const mockCsvStringifier = {
    getHeaderString: jest
      .fn()
      .mockReturnValue(
        "Company Name,User Email,Quiz Title,Question Content,User's Answers Content,Correct Answer\n",
      ),
    stringifyRecords: jest.fn().mockReturnValue(''),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizAttemptService,
        {
          provide: getRepositoryToken(QuizAttempt),
          useValue: mockQuizAttemptRepository,
        },
        {
          provide: getRepositoryToken(Question),
          useValue: mockQuestionRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: RedisService,
          useValue: {
            set: jest.fn(),
            keys: jest.fn(),
            get: jest.fn(),
          },
        },
        {
          provide: QuizService,
          useValue: {
            getQuizById: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            getUserByEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QuizAttemptService>(QuizAttemptService);
    redisService = module.get<RedisService>(RedisService);
    quizService = module.get<QuizService>(QuizService);
    userService = module.get<UserService>(UserService);

    (csvWriter.createObjectCsvStringifier as jest.Mock).mockReturnValue(
      mockCsvStringifier,
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNewQuizAttempt', () => {
    const userEmail = 'user@email.com';
    const questionAttemptAnswerDtoList = [
      {
        questionId: 'question-id-1',
        answersIdList: ['answer-id-2'],
      },
      {
        questionId: 'question-id-2',
        answersIdList: ['answer-id-4', 'answer-id-5'],
      },
      {
        questionId: 'question-id-3',
        answersIdList: ['answer-id-6'],
      },
    ] as QuestionAttemptAnswerDto[];
    const createQuizAttemptDto = {
      quizId: 'exist-quiz-id',
      questions: questionAttemptAnswerDtoList,
    } as CreateQuizAttemptDto;
    const existQuiz = {
      id: 'exist-quiz-id',
      title: 'exist-quiz-title',
      company: {
        id: 'company-id',
        companyName: 'company-name',
      } as Company,
    } as Quiz;
    const existUser = {
      id: 'exist-user-id',
      emailLogin: userEmail,
    } as User;
    const existAnswers1 = [
      {
        id: 'answer-id-1',
        isCorrect: false,
      },
      {
        id: 'answer-id-2',
        isCorrect: true,
      },
    ] as Answer[];
    const existAnswers2 = [
      {
        id: 'answer-id-3',
        isCorrect: false,
      },
      {
        id: 'answer-id-4',
        isCorrect: true,
      },
      {
        id: 'answer-id-5',
        isCorrect: false,
      },
    ] as Answer[];
    const existAnswers3 = [
      {
        id: 'answer-id-6',
        isCorrect: false,
      },
      {
        id: 'answer-id-7',
        isCorrect: true,
      },
    ] as Answer[];
    const existQuestions = [
      {
        id: 'question-id-1',
        answerOptions: existAnswers1,
      },
      {
        id: 'question-id-2',
        answerOptions: existAnswers2,
      },
      {
        id: 'question-id-3',
        answerOptions: existAnswers3,
      },
    ] as Question[];
    const newQuizAttempt = {
      id: 'new-quiz-id',
    } as QuizAttempt;

    it('should return InternalServerErrorException if saving new attempt to repository is failed', async () => {
      jest.spyOn(quizService, 'getQuizById').mockResolvedValue(existQuiz);
      jest.spyOn(userService, 'getUserByEmail').mockResolvedValue(existUser);
      mockQuestionRepository.findOne
        .mockReturnValueOnce(existQuestions[0])
        .mockReturnValueOnce(existQuestions[1])
        .mockReturnValueOnce(existQuestions[2]);
      mockQuizAttemptRepository.create.mockReturnValue(newQuizAttempt);
      mockQuizAttemptRepository.save.mockRejectedValue(
        new Error('saving error'),
      );
      await expect(
        service.createNewQuizAttempt(createQuizAttemptDto, userEmail),
      ).rejects.toThrow(
        new InternalServerErrorException('Error while saving quiz attempt'),
      );
      expect(mockQuestionRepository.findOne).toHaveBeenCalledTimes(3);
      expect(mockQuizAttemptRepository.create).toHaveBeenCalledWith({
        quiz: existQuiz,
        user: existUser,
        answersScore: 1.5,
        questionCount: 3,
      });
    });

    it('should return InternalServerErrorException if saving attempt data to cache is failed', async () => {
      jest.spyOn(quizService, 'getQuizById').mockResolvedValue(existQuiz);
      jest.spyOn(userService, 'getUserByEmail').mockResolvedValue(existUser);
      mockQuestionRepository.findOne
        .mockReturnValueOnce(existQuestions[0])
        .mockReturnValueOnce(existQuestions[1])
        .mockReturnValueOnce(existQuestions[2]);
      mockQuizAttemptRepository.create.mockReturnValue(newQuizAttempt);
      mockQuizAttemptRepository.save.mockReturnValue(null);
      jest
        .spyOn(redisService, 'set')
        .mockRejectedValue(new Error('cache set error'));
      await expect(
        service.createNewQuizAttempt(createQuizAttemptDto, userEmail),
      ).rejects.toThrow(
        new InternalServerErrorException(
          'Error while saving quiz attempt data in cache',
        ),
      );
      expect(jest.spyOn(redisService, 'set')).toHaveBeenCalledWith(
        `quiz_attempt:${newQuizAttempt.id}`,
        JSON.stringify({
          user: { id: existUser.id, email: existUser.emailLogin },
          company: {
            id: existQuiz.company.id,
            companyName: existQuiz.company.companyName,
          },
          quiz: { id: existQuiz.id, title: existQuiz.title },
          questionsAndAnswers: [
            {
              question: existQuestions[0],
              answersIdList: questionAttemptAnswerDtoList[0].answersIdList,
            },
            {
              question: existQuestions[1],
              answersIdList: questionAttemptAnswerDtoList[1].answersIdList,
            },
            {
              question: existQuestions[2],
              answersIdList: questionAttemptAnswerDtoList[2].answersIdList,
            },
          ],
        }),
        172800,
      );
    });

    it('should return ResultMessage if creating new quiz attempt is successfully', async () => {
      jest.spyOn(quizService, 'getQuizById').mockResolvedValue(existQuiz);
      jest.spyOn(userService, 'getUserByEmail').mockResolvedValue(existUser);
      mockQuestionRepository.findOne
        .mockReturnValueOnce(existQuestions[0])
        .mockReturnValueOnce(existQuestions[1])
        .mockReturnValueOnce(existQuestions[2]);
      mockQuizAttemptRepository.create.mockReturnValue(newQuizAttempt);
      mockQuizAttemptRepository.save.mockReturnValue(null);
      jest.spyOn(redisService, 'set').mockReturnValue(null);
      const result = await service.createNewQuizAttempt(
        createQuizAttemptDto,
        userEmail,
      );
      expect(result).toEqual({ message: 'Attempt saved successfully.' });
    });
  });

  describe('getUserCompanyScore', () => {
    const companyId = 'company-id';
    const userEmail = 'user@email.com';
    const existQuizAttempts = [
      {
        id: 'quiz-attempt-id',
        answersScore: 1,
        questionCount: 2,
      },
    ] as QuizAttempt[];

    it('should return NotFoundException if attempts not found', async () => {
      mockQuizAttemptRepository.find.mockReturnValue([]);
      await expect(
        service.getUserCompanyScore(companyId, userEmail),
      ).rejects.toThrow(new NotFoundException(`Attempts not found.`));
    });

    it('should return ResultMessage with total company score', async () => {
      mockQuizAttemptRepository.find.mockReturnValue(existQuizAttempts);
      jest.spyOn(service, 'scoreExecutor').mockReturnValue('0.5');
      const result = await service.getUserCompanyScore(companyId, userEmail);
      expect(result).toEqual({ message: '0.5' });
    });
  });

  describe('getUserTotalScore', () => {
    const userEmail = 'user@email.com';
    const existUser = {
      attempts: [],
    } as User;

    it('should return NotFoundException if user not found', async () => {
      mockUserRepository.findOne.mockReturnValue(null);
      await expect(service.getUserTotalScore(userEmail)).rejects.toThrow(
        new NotFoundException(`User with email ${userEmail} not found.`),
      );
    });

    it('should return ResultMessage with total score 0 if user has not any attempt', async () => {
      mockUserRepository.findOne.mockReturnValue(existUser);
      const result = await service.getUserTotalScore(userEmail);
      expect(result).toEqual({ message: '0' });
    });

    it('should return ResultMessage with total score', async () => {
      mockUserRepository.findOne.mockReturnValue({
        ...existUser,
        attempts: [{ id: 'attempt-id' } as QuizAttempt],
      });
      jest.spyOn(service, 'scoreExecutor').mockReturnValue('0.5');
      const result = await service.getUserTotalScore(userEmail);
      expect(result).toEqual({ message: '0.5' });
    });
  });

  describe('scoreExecutor', () => {
    const quizAttemptList = [
      {
        answersScore: 1,
        questionCount: 2,
      },
      {
        answersScore: 2,
        questionCount: 2,
      },
      {
        answersScore: 3,
        questionCount: 8,
      },
    ] as QuizAttempt[];

    it('should return total score', () => {
      const result = service.scoreExecutor(quizAttemptList);
      expect(result).toEqual('0.5');
    });
  });

  describe('exportQuizAttemptsByCompany', () => {
    const exportAttemptOptionsDtoWithUser = {
      companyId: 'company-id',
      userId: 'user-id',
    } as ExportAttemptOptionsDto;
    const exportAttemptOptionsDtoWithQuiz = {
      companyId: 'company-id',
      quizId: 'quiz-id',
    } as ExportAttemptOptionsDto;
    const exportAttemptOptionsDtoWithCompany = {
      companyId: 'company-id',
    } as ExportAttemptOptionsDto;
    const mockAttempts = [{}] as StoredAttempt[];

    it('should return NotFoundException if no user attempts found', async () => {
      const exportType = ExportType.CSV;
      jest
        .spyOn(service as any, 'getAttemptsFromCache')
        .mockResolvedValue(mockAttempts);
      jest
        .spyOn(service, 'exportQuizAttemptsByCompanyUser')
        .mockResolvedValue(null);
      await expect(
        service.exportQuizAttemptsByCompany(
          exportType,
          exportAttemptOptionsDtoWithUser,
        ),
      ).rejects.toThrow(
        new NotFoundException('No quiz attempts found for the company user.'),
      );
      expect(service.exportQuizAttemptsByCompanyUser).toHaveBeenCalledWith(
        mockAttempts,
        exportAttemptOptionsDtoWithUser.companyId,
        exportAttemptOptionsDtoWithUser.userId,
        exportType,
      );
    });

    it('should return NotFoundException if no quiz attempts found', async () => {
      const exportType = ExportType.CSV;
      jest
        .spyOn(service as any, 'getAttemptsFromCache')
        .mockResolvedValue(mockAttempts);
      jest
        .spyOn(service, 'exportQuizAttemptsByCompanyQuiz')
        .mockResolvedValue(null);
      await expect(
        service.exportQuizAttemptsByCompany(
          exportType,
          exportAttemptOptionsDtoWithQuiz,
        ),
      ).rejects.toThrow(
        new NotFoundException('No quiz attempts found for the company quiz.'),
      );
      expect(service.exportQuizAttemptsByCompanyQuiz).toHaveBeenCalledWith(
        mockAttempts,
        exportAttemptOptionsDtoWithQuiz.companyId,
        exportAttemptOptionsDtoWithQuiz.quizId,
        exportType,
      );
    });

    it('should return NotFoundException if no quiz attempts found for all company', async () => {
      const exportType = ExportType.CSV;
      jest
        .spyOn(service as any, 'getAttemptsFromCache')
        .mockResolvedValue(mockAttempts);
      jest
        .spyOn(service, 'exportQuizAttemptsByAllCompany')
        .mockResolvedValue(null);
      await expect(
        service.exportQuizAttemptsByCompany(
          exportType,
          exportAttemptOptionsDtoWithCompany,
        ),
      ).rejects.toThrow(
        new NotFoundException('No quiz attempts found for the company.'),
      );
      expect(service.exportQuizAttemptsByAllCompany).toHaveBeenCalledWith(
        mockAttempts,
        exportAttemptOptionsDtoWithCompany.companyId,
        exportType,
      );
    });

    it('should export attempts by company user for JSON', async () => {
      const exportType = ExportType.JSON;
      jest
        .spyOn(service as any, 'getAttemptsFromCache')
        .mockResolvedValue(mockAttempts);
      jest
        .spyOn(service, 'exportQuizAttemptsByCompanyUser')
        .mockResolvedValue('user-data');
      jest
        .spyOn(service, 'exportQuizAttemptsByCompanyQuiz')
        .mockResolvedValue('quiz-data');
      jest
        .spyOn(service, 'exportQuizAttemptsByAllCompany')
        .mockResolvedValue('all-data');
      const result = await service.exportQuizAttemptsByCompany(
        exportType,
        exportAttemptOptionsDtoWithUser,
      );
      expect(result).toEqual({
        data: 'user-data',
        contentType: 'application/json',
        filename: `company_user_quiz_attempts.${exportType}`,
      });
      expect(service.exportQuizAttemptsByCompanyQuiz).not.toHaveBeenCalled();
      expect(service.exportQuizAttemptsByAllCompany).not.toHaveBeenCalled();
    });

    it('should export attempts by company quiz for JSON', async () => {
      const exportType = ExportType.JSON;
      jest
        .spyOn(service as any, 'getAttemptsFromCache')
        .mockResolvedValue(mockAttempts);
      jest
        .spyOn(service, 'exportQuizAttemptsByCompanyUser')
        .mockResolvedValue('user-data');
      jest
        .spyOn(service, 'exportQuizAttemptsByCompanyQuiz')
        .mockResolvedValue('quiz-data');
      jest
        .spyOn(service, 'exportQuizAttemptsByAllCompany')
        .mockResolvedValue('all-data');
      const result = await service.exportQuizAttemptsByCompany(
        exportType,
        exportAttemptOptionsDtoWithQuiz,
      );
      expect(result).toEqual({
        data: 'quiz-data',
        contentType: 'application/json',
        filename: `company_quiz_quiz_attempts.${exportType}`,
      });
      expect(service.exportQuizAttemptsByCompanyUser).not.toHaveBeenCalled();
      expect(service.exportQuizAttemptsByAllCompany).not.toHaveBeenCalled();
    });

    it('should export attempts by all company for JSON', async () => {
      const exportType = ExportType.JSON;
      jest
        .spyOn(service as any, 'getAttemptsFromCache')
        .mockResolvedValue(mockAttempts);
      jest
        .spyOn(service, 'exportQuizAttemptsByCompanyUser')
        .mockResolvedValue('user-data');
      jest
        .spyOn(service, 'exportQuizAttemptsByCompanyQuiz')
        .mockResolvedValue('quiz-data');
      jest
        .spyOn(service, 'exportQuizAttemptsByAllCompany')
        .mockResolvedValue('all-data');
      const result = await service.exportQuizAttemptsByCompany(
        exportType,
        exportAttemptOptionsDtoWithCompany,
      );
      expect(result).toEqual({
        data: 'all-data',
        contentType: 'application/json',
        filename: `company_quiz_attempts.${exportType}`,
      });
      expect(service.exportQuizAttemptsByCompanyUser).not.toHaveBeenCalled();
      expect(service.exportQuizAttemptsByCompanyQuiz).not.toHaveBeenCalled();
    });
  });

  describe('exportQuizAttemptsByAllCompany', () => {
    const companyId = 'company-id';
    const attempts = [
      {
        company: {
          id: companyId,
        },
      },
      {
        company: {
          id: companyId + 1,
        },
      },
    ] as StoredAttempt[];

    it('should export Quiz Attempts by all company in JSON', async () => {
      const exportType = ExportType.JSON;
      jest
        .spyOn(service as any, 'generateCSVFromAttempts')
        .mockReturnValue('result');
      const result = await service.exportQuizAttemptsByAllCompany(
        attempts,
        companyId,
        exportType,
      );
      expect(result).toEqual(JSON.stringify([attempts[0]], null, 2));
      expect(service['generateCSVFromAttempts']).not.toHaveBeenCalled();
    });

    it('should export Quiz Attempts by all company in CSV', async () => {
      const exportType = ExportType.CSV;
      jest
        .spyOn(service as any, 'generateCSVFromAttempts')
        .mockReturnValue('result');
      const result = await service.exportQuizAttemptsByAllCompany(
        attempts,
        companyId,
        exportType,
      );
      expect(result).toEqual('result');
    });
  });

  describe('exportQuizAttemptsByCompanyUser', () => {
    const companyId = 'company-id';
    const userId = 'user-id';
    const attempts = [
      {
        company: {
          id: companyId,
        },
        user: {
          id: userId,
        },
      },
      {
        company: {
          id: companyId + 1,
        },
        user: {
          id: userId + 1,
        },
      },
    ] as StoredAttempt[];

    it('should export Quiz Attempts by all company in JSON', async () => {
      const exportType = ExportType.JSON;
      jest
        .spyOn(service as any, 'generateCSVFromAttempts')
        .mockReturnValue('result');
      const result = await service.exportQuizAttemptsByCompanyUser(
        attempts,
        companyId,
        userId,
        exportType,
      );
      expect(result).toEqual(JSON.stringify([attempts[0]], null, 2));
      expect(service['generateCSVFromAttempts']).not.toHaveBeenCalled();
    });

    it('should export Quiz Attempts by all company in CSV', async () => {
      const exportType = ExportType.CSV;
      jest
        .spyOn(service as any, 'generateCSVFromAttempts')
        .mockReturnValue('result');
      const result = await service.exportQuizAttemptsByCompanyUser(
        attempts,
        companyId,
        userId,
        exportType,
      );
      expect(result).toEqual('result');
    });
  });

  describe('exportQuizAttemptsByCompanyQuiz', () => {
    const companyId = 'company-id';
    const quizId = 'quiz-id';
    const attempts = [
      {
        company: {
          id: companyId,
        },
        quiz: {
          id: quizId,
        },
      },
      {
        company: {
          id: companyId + 1,
        },
        quiz: {
          id: quizId + 1,
        },
      },
    ] as StoredAttempt[];

    it('should export Quiz Attempts by all company in JSON', async () => {
      const exportType = ExportType.JSON;
      jest
        .spyOn(service as any, 'generateCSVFromAttempts')
        .mockReturnValue('result');
      const result = await service.exportQuizAttemptsByCompanyQuiz(
        attempts,
        companyId,
        quizId,
        exportType,
      );
      expect(result).toEqual(JSON.stringify([attempts[0]], null, 2));
      expect(service['generateCSVFromAttempts']).not.toHaveBeenCalled();
    });

    it('should export Quiz Attempts by all company in CSV', async () => {
      const exportType = ExportType.CSV;
      jest
        .spyOn(service as any, 'generateCSVFromAttempts')
        .mockReturnValue('result');
      const result = await service.exportQuizAttemptsByCompanyQuiz(
        attempts,
        companyId,
        quizId,
        exportType,
      );
      expect(result).toEqual('result');
    });
  });

  describe('exportQuizAttemptsByUser', () => {
    const userEmail = 'user-email';
    const mockAttempts = [
      {
        user: {
          email: userEmail,
        },
      },
      {
        user: {
          email: userEmail + 1,
        },
      },
    ] as StoredAttempt[];

    it('should return NotFoundException if no user quiz attempts', async () => {
      const exportType = ExportType.JSON;
      jest
        .spyOn(service as any, 'getAttemptsFromCache')
        .mockResolvedValue(null);
      jest
        .spyOn(service as any, 'generateCSVFromAttempts')
        .mockResolvedValue('new-data');
      await expect(
        service.exportQuizAttemptsByUser(userEmail, exportType),
      ).rejects.toThrow(
        new NotFoundException('No quiz attempts found for user.'),
      );
      expect(service['generateCSVFromAttempts']).not.toHaveBeenCalled();
    });

    it('should return quiz attempts by user in JSON', async () => {
      const exportType = ExportType.JSON;
      jest
        .spyOn(service as any, 'getAttemptsFromCache')
        .mockResolvedValue(mockAttempts);
      jest
        .spyOn(service as any, 'generateCSVFromAttempts')
        .mockResolvedValue('new-data');
      const result = await service.exportQuizAttemptsByUser(
        userEmail,
        exportType,
      );
      expect(result).toEqual({
        data: JSON.stringify([mockAttempts[0]], null, 2),
        contentType: 'application/json',
        filename: `user_quiz_attempts.${exportType}`,
      });
      expect(service['generateCSVFromAttempts']).not.toHaveBeenCalled();
    });

    it('should return quiz attempts by user in CSV', async () => {
      const exportType = ExportType.CSV;
      jest
        .spyOn(service as any, 'getAttemptsFromCache')
        .mockResolvedValue(mockAttempts);
      jest
        .spyOn(service as any, 'generateCSVFromAttempts')
        .mockResolvedValue('new-data');
      const result = await service.exportQuizAttemptsByUser(
        userEmail,
        exportType,
      );
      expect(result).toEqual({
        data: 'new-data',
        contentType: 'text/csv',
        filename: `user_quiz_attempts.${exportType}`,
      });
    });
  });

  describe('getAttemptsFromCache', () => {
    const mockAttempts = [
      {
        user: { id: 'user1' },
        quiz: { id: 'quiz1' },
        company: { id: 'company1' },
      },
      {
        user: { id: 'user2' },
        quiz: { id: 'quiz2' },
        company: { id: 'company1' },
      },
    ] as StoredAttempt[];
    const mockKeys = ['quiz_attempt:1', 'quiz_attempt:2'];
    const mockValues = mockAttempts.map(attempt => JSON.stringify(attempt));

    it('should return quiz attempts from Redis', async () => {
      jest.spyOn(redisService, 'keys').mockResolvedValue(mockKeys);
      jest
        .spyOn(redisService, 'get')
        .mockResolvedValueOnce(mockValues[0])
        .mockResolvedValueOnce(mockValues[1]);
      const result = await service['getAttemptsFromCache']();
      expect(redisService.keys).toHaveBeenCalledWith('quiz_attempt:*');
      expect(redisService.get).toHaveBeenCalledTimes(2);
      expect(redisService.get).toHaveBeenCalledWith('quiz_attempt:1');
      expect(redisService.get).toHaveBeenCalledWith('quiz_attempt:2');
      expect(result).toEqual(mockAttempts);
    });

    it('should return empty array if no keys found in Redis', async () => {
      jest.spyOn(redisService, 'keys').mockResolvedValue([]);
      jest.spyOn(redisService, 'get').mockReturnValue(null);
      const result = await service['getAttemptsFromCache']();
      expect(redisService.keys).toHaveBeenCalledWith('quiz_attempt:*');
      expect(redisService.get).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should return error if redis keys fails', async () => {
      jest
        .spyOn(redisService, 'keys')
        .mockRejectedValue(new Error('Redis keys error'));
      jest.spyOn(redisService, 'get').mockReturnValue(null);
      await expect(service['getAttemptsFromCache']()).rejects.toThrow(
        'Redis keys error',
      );
      expect(redisService.keys).toHaveBeenCalledWith('quiz_attempt:*');
      expect(redisService.get).not.toHaveBeenCalled();
    });

    it('should return error if redis get fails', async () => {
      jest.spyOn(redisService, 'keys').mockResolvedValue(mockKeys);
      jest
        .spyOn(redisService, 'get')
        .mockRejectedValueOnce(new Error('Redis get error'))
        .mockResolvedValueOnce(mockValues[1]);
      await expect(service['getAttemptsFromCache']()).rejects.toThrow(
        'Redis get error',
      );
      expect(redisService.keys).toHaveBeenCalledWith('quiz_attempt:*');
      expect(redisService.get).toHaveBeenCalledWith('quiz_attempt:1');
    });
  });

  describe('generateCSVFromAttempts', () => {
    const mockAttempts = [
      {
        company: { companyName: 'Company A' },
        user: { email: 'user1@example.com' },
        quiz: { title: 'Quiz 1' },
        questionsAndAnswers: [
          {
            question: {
              content: 'What is 2+2?',
              answerOptions: [
                { id: 'a1', content: '4', isCorrect: true },
                { id: 'a2', content: '5', isCorrect: false },
              ],
            },
            answersIdList: ['a1'],
          },
        ],
      },
    ] as StoredAttempt[];

    it('should generate CSV from attempts', async () => {
      const expectedRecords = [
        {
          companyName: 'Company A',
          userEmail: 'user1@example.com',
          quizTitle: 'Quiz 1',
          questionContent: 'What is 2+2?',
          usersAnswersContent: '4',
          correctAnswer: '4',
        },
      ];
      mockCsvStringifier.getHeaderString.mockReturnValue(
        "Company Name,User Email,Quiz Title,Question Content,User's Answers Content,Correct Answer\n",
      );
      mockCsvStringifier.stringifyRecords.mockReturnValue(
        'Company A,user1@example.com,Quiz 1,"What is 2+2?","4","4"\n',
      );
      const result = await service['generateCSVFromAttempts'](mockAttempts);
      expect(csvWriter.createObjectCsvStringifier).toHaveBeenCalledWith({
        header: [
          { id: 'companyName', title: 'Company Name' },
          { id: 'userEmail', title: 'User Email' },
          { id: 'quizTitle', title: 'Quiz Title' },
          { id: 'questionContent', title: 'Question Content' },
          { id: 'usersAnswersContent', title: "User's Answers Content" },
          { id: 'correctAnswer', title: 'Correct Answer' },
        ],
      });
      expect(mockCsvStringifier.getHeaderString).toHaveBeenCalled();
      expect(mockCsvStringifier.stringifyRecords).toHaveBeenCalledWith(
        expectedRecords,
      );
      expect(result).toBe(
        'Company Name,User Email,Quiz Title,Question Content,User\'s Answers Content,Correct Answer\nCompany A,user1@example.com,Quiz 1,"What is 2+2?","4","4"\n',
      );
    });

    it('should return only header if no attempts provided', async () => {
      mockCsvStringifier.getHeaderString.mockReturnValue(
        "Company Name,User Email,Quiz Title,Question Content,User's Answers Content,Correct Answer\n",
      );
      mockCsvStringifier.stringifyRecords.mockReturnValue('');
      const result = await service['generateCSVFromAttempts']([]);
      expect(csvWriter.createObjectCsvStringifier).toHaveBeenCalled();
      expect(mockCsvStringifier.getHeaderString).toHaveBeenCalled();
      expect(mockCsvStringifier.stringifyRecords).toHaveBeenCalledWith([]);
      expect(result).toBe(
        "Company Name,User Email,Quiz Title,Question Content,User's Answers Content,Correct Answer\n",
      );
    });
  });

  describe('getUsersWithLongInactivity', () => {
    const days = 1;

    it('should return users list', async () => {
      mockUserRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(['user-data']),
      });
      const result = await service.getUsersWithLongInactivity(days);
      expect(result).toEqual(['user-data']);
    });
  });
});
