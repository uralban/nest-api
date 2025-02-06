import { MigrationInterface, QueryRunner } from 'typeorm';

export class Auto1738370809323 implements MigrationInterface {
  name = 'Auto1738370809323';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" RENAME COLUMN "token" TO "refreshToken"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" RENAME COLUMN "refreshToken" TO "token"`,
    );
  }
}
