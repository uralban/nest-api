import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { AppService } from '../app.service';

@Injectable()
export class RoleService {
  private readonly logger: Logger = new Logger(AppService.name);

  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  public async getAllRoles(): Promise<Role[]> {
    const roles: Role[] = await this.roleRepository.find();
    if (!roles.length) {
      this.logger.error('Roles not found.');
      throw new NotFoundException('Roles not found.');
    }
    this.logger.log('Roles found.');
    return roles;
  }

  public async getRoleById(roleId: string): Promise<Role> {
    const role: Role = await this.roleRepository.findOne({
      where: { id: roleId },
    });
    if (!role) {
      this.logger.error('Roles not found.');
      throw new NotFoundException('Roles not found.');
    }
    this.logger.log('Roles found.');
    return role;
  }

  public async checkUserRole(
    email: string,
    companyId: string,
    roleList: string[],
  ): Promise<boolean> {
    this.logger.log('Check user role');
    return this.roleRepository
      .createQueryBuilder('role')
      .leftJoinAndSelect('role.members', 'members')
      .leftJoinAndSelect('members.user', 'user')
      .leftJoinAndSelect('members.company', 'company')
      .where('company.id = :companyId', { companyId: companyId })
      .andWhere('user.emailLogin = :email', { email: email })
      .andWhere('role.roleName IN (:...roles)', { roles: roleList })
      .getExists();
  }
}
