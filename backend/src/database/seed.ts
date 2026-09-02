import 'reflect-metadata';
import { config } from 'dotenv';
import { hash } from 'bcryptjs';
import { AppDataSource } from './data-source.js';
import { Business } from '../business/entities/business.entity.js';
import { User } from '../users/entities/user.entity.js';

config();

async function seed() {
  const dataSource = await AppDataSource.initialize();

  const businessRepo = dataSource.getRepository(Business);
  const userRepo = dataSource.getRepository(User);

  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'changeme123';

  const existing = await userRepo.findOneBy({ email });
  if (existing) {
    console.log(`User ${email} already exists, skipping seed.`);
    await dataSource.destroy();
    return;
  }

  const business = await businessRepo.save(
    businessRepo.create({ name: 'My Wedding Photography Business' }),
  );

  await userRepo.save(
    userRepo.create({
      businessId: business.id,
      email,
      passwordHash: await hash(password, 10),
    }),
  );

  console.log('Seeded business and admin user:');
  console.log(`  email: ${email}`);
  console.log(`  password: ${password}`);

  await dataSource.destroy();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
