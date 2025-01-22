import { setSeederFactory } from 'typeorm-extension';
import { User } from '../../user/entities/user.entity';
import { faker } from '@faker-js/faker';

export default setSeederFactory(User, () => {
  const user: User = new User();
  user.id = faker.string.uuid();
  user.firstName = faker.person.firstName('male');
  user.lastName = faker.person.lastName('male');
  user.emailLogin = faker.internet.email();
  user.createdAt = faker.date.between({ from: '2025-01-01', to: '2025-01-02' });

  return user;
});
