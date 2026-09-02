import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateProposals1788240593141 implements MigrationInterface {
  name = 'CreateProposals1788240593141';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'proposals',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'business_id', type: 'uuid' },
          { name: 'customer_id', type: 'uuid' },
          { name: 'proposal_number', type: 'varchar' },
          { name: 'wedding_date', type: 'date' },
          { name: 'wedding_location', type: 'varchar' },
          { name: 'number_of_days', type: 'int', isNullable: true },
          { name: 'status', type: 'varchar', default: "'DRAFT'" },
          { name: 'subtotal', type: 'int', default: 0 },
          { name: 'discount_type', type: 'varchar', isNullable: true },
          { name: 'discount_value', type: 'int', isNullable: true },
          { name: 'discount_amount', type: 'int', default: 0 },
          { name: 'tax_rate', type: 'int', default: 0 },
          { name: 'tax_amount', type: 'int', default: 0 },
          { name: 'total', type: 'int', default: 0 },
          { name: 'valid_until', type: 'date', isNullable: true },
          { name: 'notes', type: 'text', isNullable: true },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
          { name: 'updated_at', type: 'timestamp', default: 'now()' },
        ],
        uniques: [{ columnNames: ['business_id', 'proposal_number'] }],
      }),
    );
    await queryRunner.createForeignKey(
      'proposals',
      new TableForeignKey({
        columnNames: ['business_id'],
        referencedTableName: 'businesses',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'proposals',
      new TableForeignKey({
        columnNames: ['customer_id'],
        referencedTableName: 'customers',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'proposal_packages',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'proposal_id', type: 'uuid' },
          { name: 'package_id', type: 'uuid' },
          { name: 'package_name', type: 'varchar' },
          { name: 'package_description', type: 'text', isNullable: true },
          { name: 'quantity', type: 'int', default: 1 },
          { name: 'unit_price', type: 'int' },
          { name: 'total', type: 'int' },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
        ],
      }),
    );
    await queryRunner.createForeignKey(
      'proposal_packages',
      new TableForeignKey({
        columnNames: ['proposal_id'],
        referencedTableName: 'proposals',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'proposal_packages',
      new TableForeignKey({
        columnNames: ['package_id'],
        referencedTableName: 'packages',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
      }),
    );

    await queryRunner.createTable(
      new Table({
        name: 'proposal_items',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          { name: 'proposal_id', type: 'uuid' },
          { name: 'service_id', type: 'uuid' },
          { name: 'service_name', type: 'varchar' },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'price_type', type: 'varchar' },
          { name: 'quantity', type: 'int', default: 1 },
          { name: 'unit_price', type: 'int' },
          { name: 'total', type: 'int' },
          { name: 'is_optional', type: 'boolean', default: false },
          { name: 'created_at', type: 'timestamp', default: 'now()' },
        ],
      }),
    );
    await queryRunner.createForeignKey(
      'proposal_items',
      new TableForeignKey({
        columnNames: ['proposal_id'],
        referencedTableName: 'proposals',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
    await queryRunner.createForeignKey(
      'proposal_items',
      new TableForeignKey({
        columnNames: ['service_id'],
        referencedTableName: 'services',
        referencedColumnNames: ['id'],
        onDelete: 'NO ACTION',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('proposal_items');
    await queryRunner.dropTable('proposal_packages');
    await queryRunner.dropTable('proposals');
  }
}
