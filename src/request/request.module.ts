import { Module } from '@nestjs/common';
import { RequestService } from './request.service';
import { RequestController } from './request.controller';
import { RoleModule } from '../role/role.module';
import { MemberModule } from '../members/member.module';

@Module({
  controllers: [RequestController],
  providers: [RequestService],
  imports: [MemberModule, RoleModule],
})
export class RequestModule {}
