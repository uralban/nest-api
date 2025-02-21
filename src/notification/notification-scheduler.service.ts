import { Injectable, Logger } from '@nestjs/common';
import { QuizAttemptService } from '../quiz-attempt/quiz-attempt.service';
import { NotificationService } from './notification.service';
import { User } from '../user/entities/user.entity';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private quizAttemptService: QuizAttemptService,
    private notificationService: NotificationService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'notifications',
  })
  public async checkUserQuizCompletion() {
    const inactiveUsers: User[] =
      await this.quizAttemptService.getUsersWithLongInactivity(1);
    this.logger.log(`Found ${inactiveUsers.length} inactive users.`);

    for (const user of inactiveUsers) {
      await this.notificationService.createNotification(user.id, {
        message: `You haven't taken a quiz in a while. Come back and test your knowledge!`,
      });
      this.logger.log(`Notification sent to user ${user.emailLogin}`);
    }
  }
}
