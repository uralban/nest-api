import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { User } from '../user/entities/user.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QuizAttemptService } from '../quiz-attempt/quiz-attempt.service';
import { Member } from '../members/entities/member.entity';
import { NotFoundException } from '@nestjs/common';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let userRepository: Repository<User>;
  let quizAttemptService: QuizAttemptService;

  const mockMemberRepository = {
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    })),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Member),
          useValue: mockMemberRepository,
        },
        {
          provide: QuizAttemptService,
          useValue: {
            scoreExecutor: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    userRepository = module.get(getRepositoryToken(User));
    quizAttemptService = module.get<QuizAttemptService>(QuizAttemptService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserWithAttemptsByEmail', () => {
    it('should throw NotFoundException if user not found', async () => {
      userRepository.findOne = jest.fn().mockResolvedValue(null);
      await expect(
        service['getUserWithAttemptsByEmail']('test@example.com'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return user with attempts', async () => {
      const mockUser = { id: 1, emailLogin: 'test@example.com', attempts: [] };
      userRepository.findOne = jest.fn().mockResolvedValue(mockUser);

      const result =
        await service['getUserWithAttemptsByEmail']('test@example.com');
      expect(result).toEqual(mockUser);
    });
  });

  describe('getUserName', () => {
    it('should return full name if both first and last name are provided', () => {
      const user = { firstName: 'John', lastName: 'Doe' };
      expect(service['getUserName'](user as User)).toBe('John Doe');
    });

    it('should return email if no name is provided', () => {
      const user = { emailLogin: 'test@example.com' };
      expect(service['getUserName'](user as User)).toBe('test@example.com');
    });

    it('should return firstName if no lastName is provided', () => {
      const user = { firstName: 'John' };
      expect(service['getUserName'](user as User)).toBe('John');
    });

    it('should return lastName if no firstName is provided', () => {
      const user = { lastName: 'Doe' };
      expect(service['getUserName'](user as User)).toBe('Doe');
    });
  });

  describe('getUserQuizScores', () => {
    it('should return an empty array if user has no attempts', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue({ attempts: [] } as User);
      const result = await service.getUserQuizScores('test@example.com');
      expect(result).toEqual([]);
    });

    it('should calculate and return quiz scores', async () => {
      const mockUser = {
        attempts: [
          {
            quiz: { title: 'Quiz 1' },
            answersScore: 1,
            questionCount: 2,
            createdAt: new Date('2024-01-01'),
          },
        ],
      } as User;

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      jest
        .spyOn(quizAttemptService, 'scoreExecutor')
        .mockReturnValue(String(1 / 2));

      const result = await service.getUserQuizScores('test@example.com');
      expect(result).toEqual([
        {
          quizTitle: 'Quiz 1',
          quizzesScore: [{ attemptDate: new Date('2024-01-01'), score: '0.5' }],
        },
      ]);
    });
  });

  describe('getUserQuizCompanyScore', () => {
    it('should return an empty object if no attempts', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue({ attempts: [] } as User);
      const result = await service.getUserQuizCompanyScore(
        'company-id',
        'test@example.com',
      );
      expect(result).toEqual({});
    });

    it('should return an empty object if no attempts for company', async () => {
      const mockUser = {
        attempts: [
          {
            quiz: {
              title: 'Quiz 1',
              company: {
                id: '1',
              },
            },
            answersScore: 1,
            questionCount: 2,
            createdAt: new Date('2024-01-01'),
          },
        ],
      } as User;
      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);
      const result = await service.getUserQuizCompanyScore(
        'company-id',
        'test@example.com',
      );
      expect(result).toEqual({});
    });

    it('should calculate and return company score', async () => {
      const mockAttempts = [
        { quiz: { company: { id: 'company-id' } }, createdAt: new Date() },
      ];
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue({ attempts: mockAttempts } as User);
      jest.spyOn(quizAttemptService, 'scoreExecutor').mockReturnValue('0.7');

      const result = await service.getUserQuizCompanyScore(
        'company-id',
        'test@example.com',
      );
      expect(result).toEqual({ score: '0.7' });
    });
  });

  describe('getUserLastAttempts', () => {
    it('should return an empty object if no attempts', async () => {
      jest
        .spyOn(userRepository, 'findOne')
        .mockResolvedValue({ attempts: [] } as User);
      const result = await service.getUserLastAttempts('test@example.com');
      expect(result).toEqual([]);
    });

    it('should return last attempt dates for each quiz', async () => {
      const mockUser = {
        attempts: [
          {
            quiz: {
              id: 'quiz-1',
              title: 'Quiz 1',
              company: { companyName: 'Company A' },
            },
            createdAt: new Date('2024-01-01'),
          },
          {
            quiz: {
              id: 'quiz-1',
              title: 'Quiz 1',
              company: { companyName: 'Company A' },
            },
            createdAt: new Date('2024-02-01'),
          },
        ],
      } as User;

      jest.spyOn(userRepository, 'findOne').mockResolvedValue(mockUser);

      const result = await service.getUserLastAttempts('test@example.com');
      expect(result).toEqual([
        {
          quizId: 'quiz-1',
          quizTitle: 'Quiz 1',
          quizCompanyName: 'Company A',
          attemptDate: new Date('2024-02-01'),
        },
      ]);
    });
  });

  describe('getCompanyUserScores', () => {
    it('should return an empty object if no members with attempts for this company', async () => {
      mockMemberRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });
      const result = await service.getCompanyUserScores('company-id');
      expect(result).toEqual([]);
    });

    it('should return user scores for company', async () => {
      const companyId = '1';
      const mockMembers = [
        {
          user: {
            id: 'u1',
            emailLogin: 'user@example.com',
            attempts: [
              {
                id: 'a1',
                quiz: { id: 'q1', title: 'Quiz 1', company: { id: companyId } },
                answersScore: 1,
                questionCount: 2,
                createdAt: new Date('2023-01-01'),
              },
            ],
          },
          company: { id: '1' },
        },
      ] as Member[];
      mockMemberRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockMembers),
      });

      jest.spyOn(quizAttemptService, 'scoreExecutor').mockReturnValue('0.5');
      const result = await service.getCompanyUserScores(companyId);
      expect(result).toEqual([
        {
          userId: 'u1',
          userEmail: 'user@example.com',
          quizzes: [
            {
              quizId: 'q1',
              quizTitle: 'Quiz 1',
              attemptId: 'a1',
              attemptDate: new Date('2023-01-01'),
              score: '0.5',
            },
          ],
        },
      ]);
    });
  });

  describe('getUserQuizScoresInCompany', () => {
    it('should return an empty object if no users with attempts for this company', async () => {
      mockUserRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });
      const result = await service.getUserQuizScoresInCompany('company-id');
      expect(result).toEqual([]);
    });

    it('should return user scores for company', async () => {
      const companyId = '1';
      const mockUsers = [
        {
          firstName: 'John',
          attempts: [
            {
              id: 'a1',
              quiz: { id: 'q1', title: 'Quiz 1', company: { id: companyId } },
              answersScore: 1,
              questionCount: 2,
              createdAt: new Date('2023-01-01'),
            },
          ],
        },
      ] as User[];
      mockUserRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockUsers),
      });
      jest.spyOn(quizAttemptService, 'scoreExecutor').mockReturnValue('0.5');
      const result = await service.getUserQuizScoresInCompany(companyId);
      expect(result).toEqual([
        {
          userName: 'John',
          quizzesScore: [
            {
              attemptDate: new Date('2023-01-01'),
              score: '0.5',
            },
          ],
        },
      ]);
    });
  });

  describe('getCompanyUsersLastAttempts', () => {
    it('should return an empty object if no users with attempts for this company', async () => {
      mockMemberRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      });
      const result = await service.getCompanyUsersLastAttempts('company-id');
      expect(result).toEqual([]);
    });

    it('should return list of users with last attempt by company', async () => {
      const companyId = '1';
      const mockMembers = [
        {
          user: {
            id: 'u1',
            emailLogin: 'user@example.com',
            attempts: [
              {
                id: 'a1',
                quiz: { id: 'q1', title: 'Quiz 1', company: { id: companyId } },
                createdAt: new Date('2023-01-01'),
              },
              {
                id: 'a2',
                quiz: { id: 'q1', title: 'Quiz 1', company: { id: companyId } },
                createdAt: new Date('2023-01-02'),
              },
            ],
          },
          company: { id: '1' },
        },
      ] as Member[];
      mockMemberRepository.createQueryBuilder.mockReturnValue({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockMembers),
      });
      const result = await service.getCompanyUsersLastAttempts(companyId);
      expect(result).toEqual([
        {
          userId: 'u1',
          userEmail: 'user@example.com',
          attemptId: 'a2',
          attemptDate: new Date('2023-01-02'),
        },
      ]);
    });
  });
});
