import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableColumn,
  TableForeignKey,
} from 'typeorm';

export class AddBusinessFieldsAndUsers1756662100000
  implements MigrationInterface
{
  name = 'AddBusinessFieldsAndUsers1756662100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('businesses', [
      new TableColumn({ name: 'logo', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'phone', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'email', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'address', type: 'varchar', isNullable: true }),
      new TableColumn({ name: 'website', type: 'varchar', isNullable: true }),
      new TableColumn({
        name: 'default_validity_days',
        type: 'int',
        isNullable: true,
      }),
      new TableColumn({
        name: 'default_terms',
        type: 'text',
        isNullable: true,
      }),
    ]);

    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'business_id', type: 'uuid' },
          { name: 'email', type: 'varchar', isUnique: true },
          { name: 'password_hash', type: 'varchar' },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
      }),
    );

    await queryRunner.createForeignKey(
      'users',
      new TableForeignKey({
        columnNames: ['business_id'],
        referencedTableName: 'businesses',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('users');
    await queryRunner.dropColumns('businesses', [
      'logo',
      'phone',
      'email',
      'address',
      'website',
      'default_validity_days',
      'default_terms',
    ]);
  }
}
