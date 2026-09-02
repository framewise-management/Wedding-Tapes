import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddUserNames1788241100000 implements MigrationInterface {
  name = 'AddUserNames1788241100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({ name: 'first_name', type: 'varchar', isNullable: true }),
    );
    await queryRunner.addColumn(
      'users',
      new TableColumn({ name: 'last_name', type: 'varchar', isNullable: true }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'last_name');
    await queryRunner.dropColumn('users', 'first_name');
  }
}
