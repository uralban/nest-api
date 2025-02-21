import { forwardRef, Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { NotificationsController } from './notification.controller';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { QuizAttemptModule } from '../quiz-attempt/quiz-attempt.module';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationGateway,
    NotificationService,
    NotificationSchedulerService,
  ],
  imports: [
    forwardRef(() => QuizAttemptModule),
  ],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}
