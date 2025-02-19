import { forwardRef, Module } from '@nestjs/common';
import { QuizService } from './quiz.service';
import { QuizController } from './quiz.controller';
import { MemberModule } from '../members/member.module';
import { InvitationModule } from '../invitation/invitation.module';
import { RoleModule } from '../role/role.module';
import { RequestModule } from '../request/request.module';

@Module({
  controllers: [QuizController],
  providers: [QuizService],
  imports: [
    forwardRef(() => MemberModule),
    forwardRef(() => InvitationModule),
    forwardRef(() => RequestModule),
    RoleModule,
  ],
  exports: [QuizService],
})
export class QuizModule {}
