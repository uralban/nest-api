import { Seeder, SeederFactoryManager } from 'typeorm-extension';
import { DataSource, Repository } from 'typeorm';
import { User } from '../../user/entities/user.entity';

export default class UserSeeder implements Seeder {
  track: boolean = false;

  public async run(
    dataSource: DataSource,
    factoryManager: SeederFactoryManager,
  ): Promise<void> {
    const userRepository: Repository<User> = dataSource.getRepository(User);

    const users: User[] = [
      {
        id: (await (await factoryManager.get(User)).make()).id,
        firstName: (await (await factoryManager.get(User)).make()).firstName,
        lastName: (await (await factoryManager.get(User)).make()).lastName,
        emailLogin: (await (await factoryManager.get(User)).make()).emailLogin,
        passHash: 'password',
        avatarUrl: '',
        createdAt: (await (await factoryManager.get(User)).make()).createdAt,
        updatedAt: new Date(),
      },
      {
        id: (await (await factoryManager.get(User)).make()).id,
        firstName: (await (await factoryManager.get(User)).make()).firstName,
        lastName: (await (await factoryManager.get(User)).make()).lastName,
        emailLogin: (await (await factoryManager.get(User)).make()).emailLogin,
        passHash: 'password',
        avatarUrl: '',
        createdAt: (await (await factoryManager.get(User)).make()).createdAt,
        updatedAt: new Date(),
      },
      {
        id: (await (await factoryManager.get(User)).make()).id,
        firstName: (await (await factoryManager.get(User)).make()).firstName,
        lastName: (await (await factoryManager.get(User)).make()).lastName,
        emailLogin: (await (await factoryManager.get(User)).make()).emailLogin,
        passHash: 'password',
        avatarUrl: '',
        createdAt: (await (await factoryManager.get(User)).make()).createdAt,
        updatedAt: new Date(),
      },
    ];
    await userRepository.save(users);
  }
}
