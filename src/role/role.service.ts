import { Injectable, Logger } from '@nestjs/common';
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
      throw new Error('Roles not found.');
    }
    this.logger.log('Roles found.');
    return roles;
  }
}
