import { Test, TestingModule } from '@nestjs/testing';
import { QuizService } from './quiz.service';
import { Member } from '../members/entities/member.entity';
import { QuizAttempt } from '../quiz-attempt/entities/quiz-attempt.entity';
import { NotificationGateway } from '../notification/notification.gateway';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Role } from '../role/entities/role.entity';
import { RoleService } from '../role/role.service';
import { Quiz } from './entities/quiz.entity';
import { Question } from './entities/question.entity';
import { Answer } from './entities/answer.entity';
import { QuizDto } from './dto/quiz.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { CreateAnswerDto } from './dto/create-answer.dto';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Order } from '../global/enums/order.enum';
import { PaginationOptionsDto } from '../global/dto/pagination-options.dto';
import { Invitation } from '../invitation/entities/invitation.entity';

describe('QuizService', () => {
  let service: QuizService;
  let notificationGateway: NotificationGateway;

  const mockQuizRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getCount: jest.fn(),
      getRawAndEntities: jest.fn(),
    })),
  };

  const mockQuestionRepository = {
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  const mockAnswerRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockMemberRepository = {
    find: jest.fn(),
  };

  const mockQuizAttemptRepository = {
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn(),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuizService,
        {
          provide: getRepositoryToken(Quiz),
          useValue: mockQuizRepository,
        },
        {
          provide: getRepositoryToken(Question),
          useValue: mockQuestionRepository,
        },
        {
          provide: getRepositoryToken(Answer),
          useValue: mockAnswerRepository,
        },
        {
          provide: getRepositoryToken(Member),
          useValue: mockMemberRepository,
        },
        {
          provide: getRepositoryToken(QuizAttempt),
          useValue: mockQuizAttemptRepository,
        },
        {
          provide: NotificationGateway,
          useValue: {
            sendNotificationToUser: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<QuizService>(QuizService);
    notificationGateway = module.get<NotificationGateway>(NotificationGateway);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNewQuiz', () => {
    const companyId = 'company-id';
    const mockedAnswers1 = [
      {
        content: 'content-answer-1',
        isCorrect: true,
      },
      {
        content: 'content-answer-2',
        isCorrect: false,
      },
    ] as CreateAnswerDto[];
    const mockedAnswers2 = [
      {
        content: 'content-answer-3',
        isCorrect: true,
      },
      {
        content: 'content-answer-4',
        isCorrect: false,
      },
    ] as CreateAnswerDto[];
    const mockedQuestions = [
      {
        content: 'content-question-1',
        answerOptions: mockedAnswers1,
      },
      {
        content: 'content-question-2',
        answerOptions: mockedAnswers2,
      },
    ] as CreateQuestionDto[];
    const createQuizDto = {
      title: 'new-title',
      frequencyInDays: 1,
      questions: mockedQuestions,
    } as QuizDto;
    const newQuiz = {
      id: 'new-quiz-id',
    } as Quiz;

    it('should return InternalServerErrorException if saving quiz is failed', async () => {
      mockQuizRepository.create.mockReturnValue(newQuiz);
      mockQuizRepository.save.mockRejectedValue(new Error('saving error'));
      await expect(
        service.createNewQuiz(createQuizDto, companyId),
      ).rejects.toThrow(
        new InternalServerErrorException('Error while saving quiz'),
      );
    });

    it('should return InternalServerErrorException if saving question is failed', async () => {
      mockQuizRepository.create.mockReturnValue(newQuiz);
      mockQuizRepository.save.mockResolvedValue(null);
      mockQuestionRepository.create.mockReturnValue(mockedQuestions[0]);
      mockQuestionRepository.save.mockRejectedValue(new Error('saving error'));
      await expect(
        service.createNewQuiz(createQuizDto, companyId),
      ).rejects.toThrow(
        new InternalServerErrorException('Error while saving quiz'),
      );
      expect(mockQuestionRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should return InternalServerErrorException if saving answer is failed', async () => {
      mockQuizRepository.create.mockReturnValue(newQuiz);
      mockQuizRepository.save.mockResolvedValue(null);
      mockQuestionRepository.create.mockReturnValue(mockedQuestions[0]);
      mockQuestionRepository.save.mockResolvedValue(null);
      mockAnswerRepository.create.mockReturnValue(mockedAnswers1[0]);
      mockAnswerRepository.save.mockRejectedValue(new Error('saving error'));
      await expect(
        service.createNewQuiz(createQuizDto, companyId),
      ).rejects.toThrow(
        new InternalServerErrorException('Error while saving quiz'),
      );
      expect(mockQuestionRepository.create).toHaveBeenCalledTimes(1);
      expect(mockAnswerRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should return ResultMessage if saving quiz with questions and answers is successfully', async () => {
      mockQuizRepository.create.mockReturnValue(newQuiz);
      mockQuizRepository.save.mockResolvedValue(null);
      mockQuestionRepository.create.mockImplementation(question => question);
      mockQuestionRepository.save
        .mockResolvedValueOnce(mockedQuestions[0])
        .mockResolvedValueOnce(mockedQuestions[1]);
      mockAnswerRepository.create.mockImplementation(answer => answer);
      mockAnswerRepository.save
        .mockResolvedValueOnce(mockedAnswers1[0])
        .mockResolvedValueOnce(mockedAnswers1[1])
        .mockResolvedValueOnce(mockedAnswers2[0])
        .mockResolvedValueOnce(mockedAnswers2[1]);
      jest
        .spyOn(service, 'sendNotificationToAllCompanyMembers')
        .mockResolvedValue(null);
      const result = await service.createNewQuiz(createQuizDto, companyId);
      expect(result).toEqual({ message: 'The quiz has been created.' });
      expect(mockQuestionRepository.save).toHaveBeenCalledTimes(2);
      expect(mockAnswerRepository.save).toHaveBeenCalledTimes(4);
    });
  });

  describe('getQuizzesForCompanyById', () => {
    const companyId = 'company-id';
    const pageOptionsDto = {
      order: Order.ASC,
      page: 1,
      take: 3,
    } as PaginationOptionsDto;
    const existQuiz = {
      id: 'exist-quiz-id',
    } as Quiz;

    it('should return paginated quizzes list', async () => {
      mockQuizRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        getRawAndEntities: jest.fn().mockResolvedValue({
          entities: [existQuiz],
        }),
      });
      const result = await service.getQuizzesForCompanyById(
        companyId,
        pageOptionsDto,
      );
      expect(result).toEqual({
        data: [existQuiz],
        meta: {
          page: pageOptionsDto.page,
          take: pageOptionsDto.take,
          itemCount: 1,
          pageCount: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      });
    });
  });

  describe('getQuizById', () => {
    const quizId = 'quiz-id';
    const existQuiz = {
      id: 'exist-quiz-id',
    } as Quiz;

    it('should return NotFoundException if quiz not found', async () => {
      mockQuizRepository.findOne.mockReturnValue(null);
      await expect(service.getQuizById(quizId)).rejects.toThrow(
        new NotFoundException(`Quiz not found.`),
      );
    });

    it('should return Quiz', async () => {
      mockQuizRepository.findOne.mockReturnValue(existQuiz);
      const result = await service.getQuizById(quizId);
      expect(result).toEqual(existQuiz);
    });
  });

  describe('getQuizByIdForStart', () => {
    const quizId = 'quiz-id';
    const userEmail = 'email@email.com';
    const existQuiz = {
      id: 'exist-quiz-id',
      frequencyInDays: 1,
      questions: [],
    } as Quiz;
    const lastUserAttempt = {
      id: 'last-user-attempt-id',
    } as QuizAttempt;

    it('should return message if user took quiz soon', async () => {
      jest.spyOn(service, 'getQuizById').mockResolvedValue(existQuiz);
      mockQuizAttemptRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest
          .fn()
          .mockReturnValue({ ...lastUserAttempt, createdAt: new Date() }),
      });
      const result = await service.getQuizByIdForStart(quizId, userEmail);
      expect(result).toEqual({
        message: 'You recently took the quiz, please try again later.',
      });
    });

    it('should return quiz', async () => {
      jest.spyOn(service, 'getQuizById').mockResolvedValue(existQuiz);
      mockQuizAttemptRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest
          .fn()
          .mockReturnValue({
            ...lastUserAttempt,
            createdAt: new Date('2012-01-01'),
          }),
      });
      const result = await service.getQuizByIdForStart(quizId, userEmail);
      expect(result).toEqual({ quiz: existQuiz });
    });
  });

  describe('updateQuizById', () => {
    const quizId = 'quiz-id';
    const mockedAnswers1 = [
      {
        content: 'content-answer-1',
        isCorrect: true,
      },
      {
        content: 'content-answer-2',
        isCorrect: false,
      },
    ] as CreateAnswerDto[];
    const mockedAnswers2 = [
      {
        content: 'content-answer-3',
        isCorrect: true,
      },
      {
        content: 'content-answer-4',
        isCorrect: false,
      },
    ] as CreateAnswerDto[];
    const mockedQuestions = [
      {
        content: 'content-question-1',
        answerOptions: mockedAnswers1,
      },
      {
        content: 'content-question-2',
        answerOptions: mockedAnswers2,
      },
    ] as CreateQuestionDto[];
    const updateQuizDto = {
      title: 'new-quiz-title',
      questions: mockedQuestions,
    } as QuizDto;
    const newQuiz = {
      id: quizId,
      title: updateQuizDto.title,
      questions: mockedQuestions,
    } as Quiz;
    const existQuiz = {
      id: 'exist-quiz-id',
      title: 'old-title',
      questions: [],
    } as Quiz;

    it('should return InternalServerErrorException if saving new quiz is failed', async () => {
      jest.spyOn(service, 'getQuizById').mockResolvedValue(existQuiz);
      mockQuizRepository.save.mockRejectedValue(new Error('saving error'));
      await expect(
        service.updateQuizById(quizId, updateQuizDto),
      ).rejects.toThrow(
        new InternalServerErrorException('Failed to save updated quiz.'),
      );
    });

    it('should return InternalServerErrorException if deleting questions is failed', async () => {
      jest.spyOn(service, 'getQuizById').mockResolvedValue(existQuiz);
      mockQuizRepository.save.mockReturnValue(null);
      mockQuestionRepository.delete.mockRejectedValue(
        new Error('deleting error'),
      );
      await expect(
        service.updateQuizById(quizId, updateQuizDto),
      ).rejects.toThrow(
        new InternalServerErrorException('Failed to save updated quiz.'),
      );
    });

    it('should return InternalServerErrorException if saving new quiz is failed', async () => {
      jest.spyOn(service, 'getQuizById').mockResolvedValue(existQuiz);
      mockQuizRepository.save.mockReturnValue(null);
      mockQuestionRepository.delete.mockReturnValue(null);
      mockQuestionRepository.create
        .mockReturnValueOnce(mockedQuestions[0])
        .mockReturnValueOnce(mockedQuestions[1]);
      mockQuestionRepository.save.mockRejectedValue(new Error('save error'));
      await expect(
        service.updateQuizById(quizId, updateQuizDto),
      ).rejects.toThrow(
        new InternalServerErrorException('Failed to save updated quiz.'),
      );
      expect(mockQuestionRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should return InternalServerErrorException if saving new quiz is failed', async () => {
      jest.spyOn(service, 'getQuizById').mockResolvedValue(existQuiz);
      mockQuizRepository.save.mockReturnValue(null);
      mockQuestionRepository.delete.mockReturnValue(null);
      mockQuestionRepository.create
        .mockReturnValueOnce(mockedQuestions[0])
        .mockReturnValueOnce(mockedQuestions[1]);
      mockQuestionRepository.save.mockReturnValue(null);
      mockAnswerRepository.create
        .mockReturnValueOnce(mockedAnswers1[0])
        .mockReturnValueOnce(mockedAnswers1[1])
        .mockReturnValueOnce(mockedAnswers2[0])
        .mockReturnValueOnce(mockedAnswers2[1]);
      mockAnswerRepository.save.mockRejectedValue(new Error('save error'));
      await expect(
        service.updateQuizById(quizId, updateQuizDto),
      ).rejects.toThrow(
        new InternalServerErrorException('Failed to save updated quiz.'),
      );
      expect(mockQuestionRepository.create).toHaveBeenCalledTimes(1);
      expect(mockAnswerRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should return ResultMessage if saving new quiz is successfully', async () => {
      jest.spyOn(service, 'getQuizById').mockResolvedValue(existQuiz);
      mockQuizRepository.save.mockReturnValue(null);
      mockQuestionRepository.delete.mockReturnValue(null);
      mockQuestionRepository.create
        .mockReturnValueOnce(mockedQuestions[0])
        .mockReturnValueOnce(mockedQuestions[1]);
      mockQuestionRepository.save.mockReturnValue(null);
      mockAnswerRepository.create
        .mockReturnValueOnce(mockedAnswers1[0])
        .mockReturnValueOnce(mockedAnswers1[1])
        .mockReturnValueOnce(mockedAnswers2[0])
        .mockReturnValueOnce(mockedAnswers2[1]);
      mockAnswerRepository.save.mockReturnValue(null);
      const result = await service.updateQuizById(quizId, updateQuizDto);
      expect(result).toEqual({ message: 'Successfully updated quiz.' });
      expect(mockQuestionRepository.create).toHaveBeenCalledTimes(2);
      expect(mockAnswerRepository.create).toHaveBeenCalledTimes(4);
    });
  });

  describe('removeQuizById', () => {
    const quizId = 'quiz-id';
    const existQuiz = {
      id: quizId,
    } as Quiz;

    it('should return InternalServerErrorException if deleting quiz is failed', async () => {
      jest.spyOn(service, 'getQuizById').mockResolvedValue(existQuiz);
      mockQuizRepository.remove.mockRejectedValue(new Error('remove error'));
      await expect(service.removeQuizById(quizId)).rejects.toThrow(
        new InternalServerErrorException(
          'Failed to remove quiz from the database.',
        ),
      );
    });

    it('should return ResultMessage if deleting quiz is successfully', async () => {
      jest.spyOn(service, 'getQuizById').mockResolvedValue(existQuiz);
      mockQuizRepository.remove.mockReturnValue(null);
      const result = await service.removeQuizById(quizId);
      expect(result).toEqual({ message: 'The quiz was successfully deleted.' });
    });
  });

  describe('sendNotificationToAllCompanyMembers', () => {
    const companyId = 'company-id';
    const existMembers = [
      {
        id: 'member-id-1',
        company: { id: companyId },
        user: { id: 'user-id-1' },
      },
      {
        id: 'member-id-2',
        company: { id: companyId },
        user: { id: 'user-id-2' },
      },
    ] as Member[];

    it('should return NotFoundException if members not found', async () => {
      mockMemberRepository.find.mockReturnValue([]);
      await expect(
        service.sendNotificationToAllCompanyMembers(companyId),
      ).rejects.toThrow(
        new NotFoundException(`No members found for this company`),
      );
    });

    it('should send notifications', async () => {
      mockMemberRepository.find.mockReturnValue(existMembers);
      jest
        .spyOn(notificationGateway, 'sendNotificationToUser')
        .mockReturnValue(null);
      await service.sendNotificationToAllCompanyMembers(companyId);
      expect(
        jest.spyOn(notificationGateway, 'sendNotificationToUser'),
      ).toHaveBeenCalledTimes(2);
    });
  });
});
