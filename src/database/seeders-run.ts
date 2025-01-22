import { DataSource, DataSourceOptions } from 'typeorm';
import { runSeeders } from 'typeorm-extension';
import { dataSourceOptions } from '../config/app-data-source';

(async () => {
  const options: DataSourceOptions = {
    ...dataSourceOptions,
    //@ts-expect-error: property 'host' is readonly, but needs to be changed, because seeder needs to be running locally and property was set for Docker
    host: 'localhost',
    entities: ['src/**/*.entity.ts'],
  };

  const dataSource = new DataSource(options);
  await dataSource.initialize();

  await runSeeders(dataSource, {
    seeds: ['src/database/seeds/**/*.ts'],
    seedTracking: false,
    factories: ['src/database/factories/**/*.ts'],
  });
})();
