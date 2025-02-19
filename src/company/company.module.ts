import { forwardRef, Module } from '@nestjs/common';
import { CompanyService } from './company.service';
import { CompanyController } from './company.controller';
import { RoleModule } from '../role/role.module';
import { MemberModule } from '../members/member.module';
import { RequestModule } from '../request/request.module';
import { QuizModule } from '../quiz/quiz.module';

@Module({
  controllers: [CompanyController],
  providers: [CompanyService],
  imports: [
    forwardRef(() => RequestModule),
    forwardRef(() => QuizModule),
    MemberModule,
    RoleModule,
  ],
})
export class CompanyModule {}
