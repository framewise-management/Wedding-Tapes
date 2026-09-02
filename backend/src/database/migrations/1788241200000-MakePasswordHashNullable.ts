import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakePasswordHashNullable1788241200000 implements MigrationInterface {
  name = 'MakePasswordHashNullable1788241200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("UPDATE users SET password_hash = '' WHERE password_hash IS NULL");
    await queryRunner.query('ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL');
  }
}
