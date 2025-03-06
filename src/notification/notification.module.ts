import { forwardRef, Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { NotificationsController } from './notification.controller';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { QuizAttemptModule } from '../quiz-attempt/quiz-attempt.module';
import { AuthModule } from '../auth/auth.module';
import { RedisModule } from '../redis/redis.module';
import { UserModule } from '../user/user.module';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationGateway,
    NotificationService,
    NotificationSchedulerService,
  ],
  imports: [
    forwardRef(() => AuthModule),
    forwardRef(() => QuizAttemptModule),
    forwardRef(() => RedisModule),
    forwardRef(() => UserModule),
  ],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}
