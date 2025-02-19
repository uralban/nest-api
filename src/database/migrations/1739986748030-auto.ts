import { MigrationInterface, QueryRunner } from 'typeorm';

export class Auto1739986748030 implements MigrationInterface {
  name = 'Auto1739986748030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "quiz_attempt" DROP COLUMN "answers"`);
    await queryRunner.query(`ALTER TABLE "quiz_attempt" DROP COLUMN "score"`);
    await queryRunner.query(
      `ALTER TABLE "quiz_attempt" ADD "answersScore" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_attempt" ADD "questionCount" integer NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "quiz_attempt" DROP COLUMN "questionCount"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_attempt" DROP COLUMN "answersScore"`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_attempt" ADD "score" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "quiz_attempt" ADD "answers" json NOT NULL`,
    );
  }
}
