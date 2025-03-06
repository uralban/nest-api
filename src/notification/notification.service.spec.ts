import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import {
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

describe('NotificationService', () => {
  let service: NotificationService;

  const mockNotificationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: getRepositoryToken(Notification),
          useValue: mockNotificationRepository,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    const userId = 'user-id';
    const companyId = 'company-id';
    const notificationDto = {
      message: 'new-message',
    } as CreateNotificationDto;
    const newNotification = {
      id: 'new-notification-id',
    } as Notification;

    it('should return InternalServerErrorException if saving new Notification is failed', async () => {
      mockNotificationRepository.create.mockReturnValue(newNotification);
      mockNotificationRepository.save.mockRejectedValue(
        new Error('Failed to save'),
      );
      await expect(
        service.createNotification(userId, notificationDto, companyId),
      ).rejects.toThrow(
        new InternalServerErrorException('Error while saving notification'),
      );
    });

    it('should return new Notification if saving new Notification is successfully', async () => {
      mockNotificationRepository.create.mockReturnValue(newNotification);
      mockNotificationRepository.save.mockReturnValue(newNotification);
      const result = await service.createNotification(
        userId,
        notificationDto,
        companyId,
      );
      expect(result).toEqual(newNotification);
    });
  });

  describe('getUserNotifications', () => {
    const userEmail = 'user-email';
    const existNotification = {
      id: 'exist-notification-id',
    } as Notification;

    it('should return empty array if notifications are not exist', async () => {
      mockNotificationRepository.find.mockReturnValue([]);
      const result = await service.getUserNotifications(userEmail);
      expect(result).toEqual([]);
    });

    it('should return notifications list', async () => {
      mockNotificationRepository.find.mockReturnValue([existNotification]);
      const result = await service.getUserNotifications(userEmail);
      expect(result).toEqual([existNotification]);
    });
  });

  describe('markNotificationAsRead', () => {
    const notificationId = 'notification-id';
    const existNotification = {
      id: 'exist-notification-id',
    } as Notification;

    it('should return NotFoundException if notification not exist', async () => {
      mockNotificationRepository.findOne.mockReturnValue(null);
      await expect(
        service.markNotificationAsRead(notificationId),
      ).rejects.toThrow(
        new NotFoundException(
          `Notification with ID ${notificationId} not found`,
        ),
      );
    });

    it('should return InternalServerErrorException if notification saving is failed', async () => {
      mockNotificationRepository.findOne.mockReturnValue(existNotification);
      mockNotificationRepository.save.mockRejectedValue(
        new Error('Failed to save'),
      );
      await expect(
        service.markNotificationAsRead(notificationId),
      ).rejects.toThrow(
        new InternalServerErrorException('Error while saving notification'),
      );
    });

    it('should return ResultMessage if notification saving is successfully', async () => {
      mockNotificationRepository.findOne.mockReturnValue(existNotification);
      mockNotificationRepository.save.mockResolvedValue(null);
      const result = await service.markNotificationAsRead(notificationId);
      expect(result).toEqual({ message: 'Completed successfully.' });
    });
  });
});
