import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as schedule from 'node-schedule';
import { QuizAttemptService } from '../quiz-attempt/quiz-attempt.service';
import { NotificationService } from './notification.service';
import { User } from '../user/entities/user.entity';

@Injectable()
export class NotificationSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private quizAttemptService: QuizAttemptService,
    private notificationService: NotificationService,
  ) {}

  public onModuleInit(): void {
    this.scheduleDailyCheck();
  }

  private scheduleDailyCheck(): void {
    schedule.scheduleJob('0 0 * * *', async () => {
      this.logger.log('Running daily quiz completion check.');
      await this.checkUserQuizCompletion();
    });
  }

  private async checkUserQuizCompletion() {
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
