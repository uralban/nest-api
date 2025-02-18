import { forwardRef, Module } from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { InvitationController } from './invitation.controller';
import { RoleModule } from '../role/role.module';
import { MemberModule } from '../members/member.module';
import { RequestModule } from '../request/request.module';

@Module({
  controllers: [InvitationController],
  providers: [InvitationService],
  imports: [
    forwardRef(() => MemberModule),
    forwardRef(() => RequestModule),
    RoleModule
  ],
  exports: [InvitationService]
})
export class InvitationModule {}
