import { MigrationInterface, QueryRunner } from 'typeorm';

export class Auto1738497605097 implements MigrationInterface {
  name = 'Auto1738497605097';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "auth" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "refreshToken" character varying(200) NOT NULL, "userEmail" character varying(200), CONSTRAINT "REL_92166973ef9ba8b6ae4b858e44" UNIQUE ("userEmail"), CONSTRAINT "PK_7e416cf6172bc5aec04244f6459" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "refreshToken"`);
    await queryRunner.query(
      `ALTER TABLE "auth" ADD CONSTRAINT "FK_92166973ef9ba8b6ae4b858e447" FOREIGN KEY ("userEmail") REFERENCES "user"("emailLogin") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "auth" DROP CONSTRAINT "FK_92166973ef9ba8b6ae4b858e447"`,
    );
    await queryRunner.query(
      `ALTER TABLE "user" ADD "refreshToken" character varying(200) NOT NULL`,
    );
    await queryRunner.query(`DROP TABLE "auth"`);
  }
}
