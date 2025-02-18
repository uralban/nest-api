import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { RoleService } from '../role.service';
import { ConfigService } from '@nestjs/config';
import { RequestService } from '../../request/request.service';
import { Request } from '../../request/entities/request.entity';
import { Reflector } from '@nestjs/core';
import { Member } from '../../members/entities/member.entity';
import { MemberService } from '../../members/member.service';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private readonly roleService: RoleService,
    private readonly requestService: RequestService,
    private readonly memberService: MemberService,
    private configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userEmail: string =
      request.user[this.configService.get('AUTH0_USER_EMAIL_SELECTOR')] ||
      request.user.email;
    let companyId = request.body.companyId || request.params.companyId;
    const requestId = request.params.requestId;
    const memberId = request.params.memberId;

    if (requestId && !companyId) {
      const request: Request =
        await this.requestService.getRequestById(requestId);
      companyId = request.company.id;
    }

    if (memberId && !companyId) {
      const member: Member = await this.memberService.getMemberById(memberId);
      companyId = member.company.id;
    }

    const requiredRoles = this.reflector.get<string[]>(
      'roles',
      context.getHandler(),
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      throw new ForbiddenException('No roles specified');
    }

    if (!userEmail || !companyId) {
      throw new BadRequestException('Invalid request parameters');
    }

    const hasAccess = await this.roleService.checkUserRole(
      userEmail,
      companyId,
      requiredRoles,
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return true;
  }
}
