import { MigrationInterface, QueryRunner } from 'typeorm';

export class Auto1739568042189 implements MigrationInterface {
  name = 'Auto1739568042189';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "company" ALTER COLUMN "companyDescription" SET DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "company" ALTER COLUMN "logoUrl" SET DEFAULT ''`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "company" ALTER COLUMN "logoUrl" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "company" ALTER COLUMN "companyDescription" DROP DEFAULT`,
    );
  }
}
