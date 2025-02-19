import { forwardRef, Module } from '@nestjs/common';
import { MemberService } from './member.service';
import { MemberController } from './member.controller';
import { RoleModule } from '../role/role.module';
import { RequestModule } from '../request/request.module';
import { QuizModule } from '../quiz/quiz.module';

@Module({
  controllers: [MemberController],
  providers: [MemberService],
  imports: [
    forwardRef(() => RequestModule),
    forwardRef(() => QuizModule),
    RoleModule,
  ],
  exports: [MemberService],
})
export class MemberModule {}
