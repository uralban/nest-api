import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { DataSource, Repository } from 'typeorm';
import { Role } from '../../role/entities/role.entity';

export default class RoleSeeder implements Seeder {
  track: boolean = false;

  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager,
  ): Promise<void> {
    const repository: Repository<Role> = dataSource.getRepository(Role);
    const roles: Role[] = [
      {
        id: (await (await factoryManager.get(Role)).make()).id,
        roleName: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: (await (await factoryManager.get(Role)).make()).id,
        roleName: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    await repository.save(roles);
  }
}
