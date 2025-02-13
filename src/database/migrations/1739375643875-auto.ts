import { MigrationInterface, QueryRunner } from 'typeorm';

export class Auto1739375643875 implements MigrationInterface {
  name = 'Auto1739375643875';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD "avatarUrl" character varying DEFAULT ''`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "avatarUrl"`);
  }
}
