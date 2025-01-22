import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { DataSource, Repository } from 'typeorm';
import { Role } from '../../user/entities/role.entity';
import { User } from '../../user/entities/user.entity';

export default class UserSeeder implements Seeder {
  track: boolean = false;

  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager,
  ): Promise<void> {
    const roleRepository: Repository<Role> = dataSource.getRepository(Role);
    const userRepository: Repository<User> = dataSource.getRepository(User);

    const adminRole: Role = await roleRepository.findOneBy({
      roleName: 'admin',
    });

    const users: User[] = [
      {
        id: (await (await factoryManager.get(User)).make()).id,
        firstName: (await (await factoryManager.get(User)).make()).firstName,
        lastName: (await (await factoryManager.get(User)).make()).lastName,
        emailLogin: (await (await factoryManager.get(User)).make()).emailLogin,
        passHash: 'password',
        token: '',
        createdAt: (await (await factoryManager.get(User)).make()).createdAt,
        role: adminRole.id,
      },
    ];
    await userRepository.save(users);
  }
}
