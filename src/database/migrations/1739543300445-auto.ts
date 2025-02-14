import { MigrationInterface, QueryRunner } from "typeorm";

export class Auto1739543300445 implements MigrationInterface {
    name = 'Auto1739543300445'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "company" DROP CONSTRAINT "FK_f7b00aae8078808fd1c4ce429ec"`);
        await queryRunner.query(`ALTER TABLE "company" DROP CONSTRAINT "FK_c41a1d36702f2cd0403ce58d33a"`);
        await queryRunner.query(`ALTER TABLE "company" DROP COLUMN "visibilityId"`);
        await queryRunner.query(`ALTER TABLE "company" DROP COLUMN "userId"`);
        await queryRunner.query(`CREATE TYPE "public"."company_visibility_enum" AS ENUM('visible', 'hidden')`);
        await queryRunner.query(`ALTER TABLE "company" ADD "visibility" "public"."company_visibility_enum" NOT NULL DEFAULT 'hidden'`);
        await queryRunner.query(`ALTER TABLE "company" ADD "userEmailLogin" uuid`);
        await queryRunner.query(`ALTER TABLE "company" ADD CONSTRAINT "FK_b257b2f2ab0eda7c487d7a0bd47" FOREIGN KEY ("userEmailLogin") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "company" DROP CONSTRAINT "FK_b257b2f2ab0eda7c487d7a0bd47"`);
        await queryRunner.query(`ALTER TABLE "company" DROP COLUMN "userEmailLogin"`);
        await queryRunner.query(`ALTER TABLE "company" DROP COLUMN "visibility"`);
        await queryRunner.query(`DROP TYPE "public"."company_visibility_enum"`);
        await queryRunner.query(`ALTER TABLE "company" ADD "userId" uuid`);
        await queryRunner.query(`ALTER TABLE "company" ADD "visibilityId" uuid`);
        await queryRunner.query(`ALTER TABLE "company" ADD CONSTRAINT "FK_c41a1d36702f2cd0403ce58d33a" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "company" ADD CONSTRAINT "FK_f7b00aae8078808fd1c4ce429ec" FOREIGN KEY ("visibilityId") REFERENCES "visibility"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
