import 'reflect-metadata';
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { AppDataSource } from './data-source';
import { Business } from '../business/entities/business.entity';
import { User } from '../users/entities/user.entity';

config();

async function seed() {
  const dataSource = await AppDataSource.initialize();

  const businessRepo = dataSource.getRepository(Business);
  const userRepo = dataSource.getRepository(User);

  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'changeme123';

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const existing = await userRepo.findOneBy({ email });

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    if (!error.message.toLowerCase().includes('already been registered')) {
      throw error;
    }
    if (!existing) {
      throw new Error(
        `Supabase Auth user ${email} already exists but no local row was found — resolve manually.`,
      );
    }
    console.log(`User ${email} already exists, skipping seed.`);
    await dataSource.destroy();
    return;
  }

  const supabaseUserId = data.user.id;

  if (existing) {
    await dataSource.query('UPDATE users SET id = $1 WHERE email = $2', [
      supabaseUserId,
      email,
    ]);
    console.log(`Re-linked existing user ${email} to Supabase Auth id ${supabaseUserId}`);
  } else {
    const business = await businessRepo.save(
      businessRepo.create({ name: 'My Wedding Photography Business' }),
    );

    await userRepo.save(
      userRepo.create({
        id: supabaseUserId,
        businessId: business.id,
        email,
      }),
    );
    console.log('Seeded business and admin user:');
  }

  console.log(`  email: ${email}`);
  console.log(`  password: ${password}`);

  await dataSource.destroy();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
