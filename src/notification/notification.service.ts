import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationStatus } from '../global/enums/notification-status.enum';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  public async createNotification(
    userId: string,
    companyId: string,
    notificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    this.logger.log('Attempting to create a new notification.');
    const notification: Notification = this.notificationRepository.create({
      text: notificationDto.message,
      status: NotificationStatus.UNREAD,
      user: { id: userId },
      company: { id: companyId },
    });
    this.logger.log('Saving the new notification to the database.');
    try {
      const resultNotification: Notification =
        await this.notificationRepository.save(notification);
      this.logger.log(`Notification created for user ${userId}`);
      return resultNotification;
    } catch (error) {
      this.logger.error('Error while saving notification', error.stack);
    }
  }

  public async getUserNotifications(email: string): Promise<Notification[]> {
    this.logger.log('Attempting to get user notifications list.');
    const notifications = await this.notificationRepository.find({
      where: {
        user: { emailLogin: email },
      },
      order: { createdAt: 'DESC' },
    });
    if (!notifications.length) {
      throw new NotFoundException(`No notifications found for user ${email}`);
    }
    return notifications;
  }

  public async markNotificationAsRead(notificationId: string): Promise<void> {
    this.logger.log('Attempting to mark the notifications is read.');
    const notification: Notification =
      await this.notificationRepository.findOne({
        where: {
          id: notificationId,
        },
      });
    if (!notification) {
      throw new NotFoundException(
        `Notification with ID ${notificationId} not found`,
      );
    }
    notification.status = NotificationStatus.READ;
    this.logger.log('Saving the updated notification to the database.');
    try {
      await this.notificationRepository.save(notification);
      this.logger.log(`Notification ${notificationId} marked as read`);
      return;
    } catch (error) {
      this.logger.error('Error while saving notification', error.stack);
    }
  }
}
