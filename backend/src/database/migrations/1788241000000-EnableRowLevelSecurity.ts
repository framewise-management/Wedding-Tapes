import { MigrationInterface, QueryRunner } from 'typeorm';

const TABLES = [
  'businesses',
  'users',
  'services',
  'packages',
  'package_services',
  'customers',
  'proposals',
  'proposal_packages',
  'proposal_items',
  'migrations',
];

export class EnableRowLevelSecurity1788241000000 implements MigrationInterface {
  name = 'EnableRowLevelSecurity1788241000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of TABLES) {
      await queryRunner.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of TABLES) {
      await queryRunner.query(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY`);
    }
  }
}
