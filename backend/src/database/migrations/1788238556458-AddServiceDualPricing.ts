import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddServiceDualPricing1788238556458
  implements MigrationInterface
{
  name = 'AddServiceDualPricing1788238556458';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'UPDATE services SET price = 0 WHERE price IS NULL',
    );
    await queryRunner.renameColumn(
      'services',
      'price',
      new TableColumn({ name: 'per_day_price', type: 'int', isNullable: true }),
    );
    await queryRunner.query(
      'ALTER TABLE services ALTER COLUMN per_day_price DROP NOT NULL',
    );
    await queryRunner.addColumn(
      'services',
      new TableColumn({ name: 'flat_price', type: 'int', isNullable: true }),
    );
    await queryRunner.dropColumn('services', 'unit');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'services',
      new TableColumn({ name: 'unit', type: 'varchar', isNullable: true }),
    );
    await queryRunner.dropColumn('services', 'flat_price');
    await queryRunner.query(
      'UPDATE services SET per_day_price = 0 WHERE per_day_price IS NULL',
    );
    await queryRunner.query(
      'ALTER TABLE services ALTER COLUMN per_day_price SET NOT NULL',
    );
    await queryRunner.renameColumn(
      'services',
      'per_day_price',
      new TableColumn({ name: 'price', type: 'int' }),
    );
  }
}
