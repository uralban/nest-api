import { forwardRef, Module } from '@nestjs/common';
import { RequestService } from './request.service';
import { RequestController } from './request.controller';
import { RoleModule } from '../role/role.module';
import { MemberModule } from '../members/member.module';
import { InvitationModule } from '../invitation/invitation.module';

@Module({
  controllers: [RequestController],
  providers: [RequestService],
  imports: [
    forwardRef(() => MemberModule),
    forwardRef(() => InvitationModule),
    RoleModule,
  ],
  exports: [RequestService],
})
export class RequestModule {}
