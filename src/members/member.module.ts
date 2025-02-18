import { forwardRef, Module } from '@nestjs/common';
import { MemberService } from './member.service';
import { MemberController } from './member.controller';
import { RoleModule } from '../role/role.module';
import { RequestModule } from '../request/request.module';

@Module({
  controllers: [MemberController],
  providers: [MemberService],
  imports: [forwardRef(() => RequestModule), RoleModule],
  exports: [MemberService],
})
export class MemberModule {}
