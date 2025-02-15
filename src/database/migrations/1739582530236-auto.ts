import { MigrationInterface, QueryRunner } from 'typeorm';

export class Auto1739582530236 implements MigrationInterface {
  name = 'Auto1739582530236';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "company" DROP CONSTRAINT "FK_b257b2f2ab0eda7c487d7a0bd47"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company" RENAME COLUMN "userEmailLogin" TO "userId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company" ADD CONSTRAINT "FK_c41a1d36702f2cd0403ce58d33a" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "company" DROP CONSTRAINT "FK_c41a1d36702f2cd0403ce58d33a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company" RENAME COLUMN "userId" TO "userEmailLogin"`,
    );
    await queryRunner.query(
      `ALTER TABLE "company" ADD CONSTRAINT "FK_b257b2f2ab0eda7c487d7a0bd47" FOREIGN KEY ("userEmailLogin") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }
}
