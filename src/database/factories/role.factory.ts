import { setSeederFactory } from 'typeorm-extension';
import { Role } from '../../user/entities/role.entity';

export default setSeederFactory(Role, faker => {
  const role: Role = new Role();
  role.id = faker.string.uuid();

  return role;
});
