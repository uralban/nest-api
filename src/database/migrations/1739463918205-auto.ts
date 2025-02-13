import { MigrationInterface, QueryRunner } from 'typeorm';

export class Auto1739463918205 implements MigrationInterface {
  name = 'Auto1739463918205';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "auth" DROP CONSTRAINT "FK_92166973ef9ba8b6ae4b858e447"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "avatarUrl" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "avatarUrl" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth" ADD CONSTRAINT "FK_92166973ef9ba8b6ae4b858e447" FOREIGN KEY ("userEmail") REFERENCES "user"("emailLogin") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "auth" DROP CONSTRAINT "FK_92166973ef9ba8b6ae4b858e447"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "avatarUrl" SET DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ALTER COLUMN "avatarUrl" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth" ADD CONSTRAINT "FK_92166973ef9ba8b6ae4b858e447" FOREIGN KEY ("userEmail") REFERENCES "user"("emailLogin") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
