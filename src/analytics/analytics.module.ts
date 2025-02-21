import { forwardRef, Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { RoleModule } from '../role/role.module';
import { MemberModule } from '../members/member.module';
import { InvitationModule } from '../invitation/invitation.module';
import { RequestModule } from '../request/request.module';
import { QuizAttemptModule } from '../quiz-attempt/quiz-attempt.module';
import { QuizModule } from '../quiz/quiz.module';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  imports: [
    forwardRef(() => RoleModule),
    forwardRef(() => MemberModule),
    forwardRef(() => InvitationModule),
    forwardRef(() => RequestModule),
    forwardRef(() => QuizModule),
    QuizAttemptModule,
  ],
})
export class AnalyticsModule {}
