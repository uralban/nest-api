import { Module } from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { InvitationController } from './invitation.controller';
import { RoleModule } from '../role/role.module';
import { MemberModule } from '../members/member.module';

@Module({
  controllers: [InvitationController],
  providers: [InvitationService],
  imports: [MemberModule, RoleModule],
})
export class InvitationModule {}
