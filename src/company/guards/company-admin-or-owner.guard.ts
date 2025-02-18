import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { RoleService } from '../../role/role.service';

@Injectable()
export class CompanyAdminOrOwnerGuard implements CanActivate {
  constructor(private readonly roleService: RoleService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userEmail: string =
      request.user['https://www.mental-help.com.ua/email'] ||
      request.user.email;
    const companyId = request.params.requestId || request.body.companyId;

    if (!userEmail || !companyId) {
      throw new BadRequestException('Invalid request parameters');
    }

    const hasAccess = await this.roleService.checkUserRole(
      userEmail,
      companyId,
      ['admin', 'owner'],
    );
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return true;
  }
}
