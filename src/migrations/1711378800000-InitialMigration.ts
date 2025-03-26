import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialMigration1711378800000 implements MigrationInterface {
  name = 'InitialMigration1711378800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "username" varchar NOT NULL,
        "password" varchar NOT NULL,
        "email" varchar,
        "isAdmin" boolean NOT NULL DEFAULT (0),
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        "updatedAt" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "sessions" (
        "id" varchar PRIMARY KEY NOT NULL,
        "userId" integer NOT NULL,
        "expiresAt" datetime NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "FK_user_session" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "certificates" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "filename" varchar NOT NULL,
        "originalName" varchar,
        "validFrom" datetime NOT NULL,
        "validTo" datetime NOT NULL,
        "issuer" varchar,
        "serialNumber" varchar,
        "commonName" varchar,
        "organization" varchar,
        "organizationalUnit" varchar,
        "fileType" varchar,
        "password" varchar,
        "uploadedAt" datetime NOT NULL DEFAULT (datetime('now')),
        "type" varchar,
        "description" varchar
      )
    `);

    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_username" ON "users" ("username")`);
    await queryRunner.query(`CREATE INDEX "IDX_validTo" ON "certificates" ("validTo")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_validTo"`);
    await queryRunner.query(`DROP INDEX "IDX_username"`);
    await queryRunner.query(`DROP TABLE "certificates"`);
    await queryRunner.query(`DROP TABLE "sessions"`);
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
