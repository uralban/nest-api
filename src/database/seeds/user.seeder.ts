import {Seeder, SeederFactoryManager} from "typeorm-extension";
import {DataSource} from "typeorm";
import {Role} from "../../user/entities/role.entity";
import {User} from "../../user/entities/user.entity";

export default class UserSeeder implements Seeder {
    track: boolean = false;

    public async run(
        dataSource: DataSource,
        factoryManager: SeederFactoryManager
    ): Promise<void> {
        const roleRepository = dataSource.getRepository(Role);
        const userRepository = dataSource.getRepository(User);

        const adminRole = await roleRepository.findOneBy({ roleName: 'admin' });

        const users = [
            {
                id: (await (await factoryManager.get(User)).make()).id,
                firstName: (await (await factoryManager.get(User)).make()).firstName,
                lastName: (await (await factoryManager.get(User)).make()).lastName,
                emailLogin: (await (await factoryManager.get(User)).make()).emailLogin,
                passHash: 'password',
                token: '',
                createdAt: (await (await factoryManager.get(User)).make()).createdAt,
                role: adminRole.id,
            }
        ];
        //@ts-ignore
        await userRepository.save(users);
    }
}