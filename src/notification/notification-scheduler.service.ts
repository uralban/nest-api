import { Injectable, Logger } from '@nestjs/common';
import { QuizAttemptService } from '../quiz-attempt/quiz-attempt.service';
import { User } from '../user/entities/user.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    private quizAttemptService: QuizAttemptService,
    private notificationGateway: NotificationGateway,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'notifications',
  })
  public async checkUserQuizCompletion() {
    const inactiveUsers: User[] =
      await this.quizAttemptService.getUsersWithLongInactivity(1);
    this.logger.log(`Found ${inactiveUsers.length} inactive users.`);

    for (const user of inactiveUsers) {
      await this.notificationGateway.sendNotificationToUser(
        user.id,
        {
          message: `You haven't taken a quiz in a while. Come back and test your knowledge!`,
        },
        undefined,
      );
    }
  }
}
