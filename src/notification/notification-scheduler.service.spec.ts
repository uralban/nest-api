import { Test, TestingModule } from '@nestjs/testing';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { QuizAttemptService } from '../quiz-attempt/quiz-attempt.service';
import { NotificationGateway } from './notification.gateway';
import { User } from '../user/entities/user.entity';

describe('NotificationSchedulerService', () => {
  let service: NotificationSchedulerService;
  let quizAttemptService: QuizAttemptService;
  let notificationGateway: NotificationGateway;

  const mockQuizAttemptService = {
    getUsersWithLongInactivity: jest.fn(),
  };

  const mockNotificationGateway = {
    sendNotificationToUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationSchedulerService,
        {
          provide: QuizAttemptService,
          useValue: mockQuizAttemptService,
        },
        {
          provide: NotificationGateway,
          useValue: mockNotificationGateway,
        },
      ],
    }).compile();

    service = module.get<NotificationSchedulerService>(
      NotificationSchedulerService,
    );
    quizAttemptService = module.get<QuizAttemptService>(QuizAttemptService);
    notificationGateway = module.get<NotificationGateway>(NotificationGateway);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('checkUserQuizCompletion', () => {
    it('should send notifications to inactive users', async () => {
      const inactiveUsers: User[] = [
        { id: 'user1', emailLogin: 'user1@example.com' } as User,
        { id: 'user2', emailLogin: 'user2@example.com' } as User,
      ];
      mockQuizAttemptService.getUsersWithLongInactivity.mockResolvedValue(
        inactiveUsers,
      );
      mockNotificationGateway.sendNotificationToUser.mockResolvedValue(
        undefined,
      );
      await service.checkUserQuizCompletion();
      expect(
        mockQuizAttemptService.getUsersWithLongInactivity,
      ).toHaveBeenCalledWith(1);
      expect(
        mockNotificationGateway.sendNotificationToUser,
      ).toHaveBeenCalledTimes(2);
      expect(
        mockNotificationGateway.sendNotificationToUser,
      ).toHaveBeenCalledWith(
        'user1',
        {
          message:
            "You haven't taken a quiz in a while. Come back and test your knowledge!",
        },
        undefined,
      );
      expect(
        mockNotificationGateway.sendNotificationToUser,
      ).toHaveBeenCalledWith(
        'user2',
        {
          message:
            "You haven't taken a quiz in a while. Come back and test your knowledge!",
        },
        undefined,
      );
    });

    it('should not send notifications if no inactive users are found', async () => {
      mockQuizAttemptService.getUsersWithLongInactivity.mockResolvedValue([]);
      await service.checkUserQuizCompletion();
      expect(
        mockQuizAttemptService.getUsersWithLongInactivity,
      ).toHaveBeenCalledWith(1);
      expect(
        mockNotificationGateway.sendNotificationToUser,
      ).not.toHaveBeenCalled();
    });
  });
});
