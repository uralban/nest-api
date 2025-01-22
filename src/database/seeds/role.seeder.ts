import {Seeder, SeederFactoryManager} from "typeorm-extension";
import {DataSource} from "typeorm";
import {Role} from "../../user/entities/role.entity";

export default class RoleSeeder implements Seeder {
    track: boolean = false;

    public async run(
        dataSource: DataSource,
        factoryManager: SeederFactoryManager
    ): Promise<void> {
        const repository = dataSource.getRepository(Role);
        const roles = [
            { id: (await (await factoryManager.get(Role)).make()).id, roleName: "admin" },
            { id: (await (await factoryManager.get(Role)).make()).id, roleName: "user" },
        ];
        await repository.save(roles);
    }
}