import { forwardRef, Module } from '@nestjs/common';
import { RequestService } from './request.service';
import { RequestController } from './request.controller';
import { RoleModule } from '../role/role.module';
import { MemberModule } from '../members/member.module';
import { InvitationModule } from '../invitation/invitation.module';
import { QuizModule } from '../quiz/quiz.module';

@Module({
  controllers: [RequestController],
  providers: [RequestService],
  imports: [
    forwardRef(() => MemberModule),
    forwardRef(() => InvitationModule),
    forwardRef(() => QuizModule),
    RoleModule,
  ],
  exports: [RequestService],
})
export class RequestModule {}
