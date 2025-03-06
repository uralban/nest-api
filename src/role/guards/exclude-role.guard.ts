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
import { Invitation } from '../../invitation/entities/invitation.entity';
import { InvitationService } from '../../invitation/invitation.service';

@Injectable()
export class ExcludeRoleGuard implements CanActivate {
  constructor(
    private readonly roleService: RoleService,
    private readonly requestService: RequestService,
    private readonly invitationService: InvitationService,
    private configService: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userEmail: string =
      request.user[this.configService.get('AUTH0_USER_EMAIL_SELECTOR')] ||
      request.user.email;
    let companyId = request.params.companyId;
    const requestId = request.params.requestId;
    const inviteId = request.params.inviteId;

    if (requestId) {
      const request: Request =
        await this.requestService.getRequestById(requestId);
      companyId = request.company.id;
    }

    if (inviteId) {
      const invite: Invitation =
        await this.invitationService.getInviteById(inviteId);
      companyId = invite.company.id;
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

    const hasRole = await this.roleService.checkUserRole(
      userEmail,
      companyId,
      requiredRoles,
    );
    if (hasRole) {
      throw new ForbiddenException('Access denied');
    }

    return true;
  }
}
