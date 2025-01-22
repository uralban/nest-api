import { MigrationInterface, QueryRunner } from "typeorm";

export class Auto1737546061764 implements MigrationInterface {
    name = 'Auto1737546061764'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "role" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "roleName" character varying(200) NOT NULL, CONSTRAINT "UQ_a6142dcc61f5f3fb2d6899fa264" UNIQUE ("roleName"), CONSTRAINT "PK_b36bcfe02fc8de3c57a8b2391c2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "firstName" character varying(200) NOT NULL, "lastName" character varying(200) NOT NULL, "emailLogin" character varying(200) NOT NULL, "passHash" character varying(60) NOT NULL, "token" character varying(200) NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "roleId" uuid, CONSTRAINT "UQ_8b382a4be1d8605cddffa4bbaf4" UNIQUE ("emailLogin"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_c28e52f758e7bbc53828db92194" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_c28e52f758e7bbc53828db92194"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TABLE "role"`);
    }

}
