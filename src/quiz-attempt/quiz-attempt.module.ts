import { forwardRef, Module } from '@nestjs/common';
import { QuizAttemptService } from './quiz-attempt.service';
import { QuizAttemptController } from './quiz-attempt.controller';
import { RedisModule } from '../redis/redis.module';
import { QuizModule } from '../quiz/quiz.module';
import { UserModule } from '../user/user.module';
import { MemberModule } from '../members/member.module';
import { InvitationModule } from '../invitation/invitation.module';
import { RequestModule } from '../request/request.module';
import { RoleModule } from '../role/role.module';

@Module({
  controllers: [QuizAttemptController],
  providers: [QuizAttemptService],
  imports: [
    forwardRef(() => RoleModule),
    forwardRef(() => MemberModule),
    forwardRef(() => InvitationModule),
    forwardRef(() => RequestModule),
    RedisModule,
    QuizModule,
    UserModule,
  ],
})
export class QuizAttemptModule {}
