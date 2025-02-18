import { Module } from '@nestjs/common';
import { MemberService } from './member.service';
import { MemberController } from './member.controller';
import { RoleModule } from '../role/role.module';

@Module({
  controllers: [MemberController],
  providers: [MemberService],
  imports: [RoleModule],
  exports: [MemberService],
})
export class MemberModule {}
