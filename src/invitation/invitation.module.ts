import { forwardRef, Module } from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { InvitationController } from './invitation.controller';
import { RoleModule } from '../role/role.module';
import { MemberModule } from '../members/member.module';
import { RequestModule } from '../request/request.module';
import { QuizModule } from '../quiz/quiz.module';

@Module({
  controllers: [InvitationController],
  providers: [InvitationService],
  imports: [
    forwardRef(() => MemberModule),
    forwardRef(() => RequestModule),
    forwardRef(() => QuizModule),
    RoleModule,
  ],
  exports: [InvitationService],
})
export class InvitationModule {}
