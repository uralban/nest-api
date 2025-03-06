import { MigrationInterface, QueryRunner } from 'typeorm';

export class Auto1740354825219 implements MigrationInterface {
  name = 'Auto1740354825219';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "quiz_attempt" DROP COLUMN "answersScore"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_attempt" ADD "answersScore" numeric NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "quiz_attempt" DROP COLUMN "answersScore"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_attempt" ADD "answersScore" integer NOT NULL DEFAULT '0'`,
    );
  }
}
