import { MigrationInterface, QueryRunner } from 'typeorm';

export class Auto1739492988710 implements MigrationInterface {
  name = 'Auto1739492988710';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "visibility" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "visibilityName" character varying(200) NOT NULL, CONSTRAINT "UQ_33d630f077827e3071dd4d7d31e" UNIQUE ("visibilityName"), CONSTRAINT "PK_8f15c8e8a76e82ac50fb9cbb110" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "company" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "companyName" character varying(200) NOT NULL, "companyDescription" character varying NOT NULL, "logoUrl" character varying NOT NULL, "visibilityId" uuid, "userId" uuid, CONSTRAINT "PK_056f7854a7afdba7cbd6d45fc20" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "company" ADD CONSTRAINT "FK_f7b00aae8078808fd1c4ce429ec" FOREIGN KEY ("visibilityId") REFERENCES "visibility"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
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
      `ALTER TABLE "company" DROP CONSTRAINT "FK_f7b00aae8078808fd1c4ce429ec"`,
    );
    await queryRunner.query(`DROP TABLE "company"`);
    await queryRunner.query(`DROP TABLE "visibility"`);
  }
}
