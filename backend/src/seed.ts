import 'dotenv/config';
import { eq } from 'drizzle-orm';
import { createClient } from '@supabase/supabase-js';
import { db } from './db/client';
import { businesses, users } from './db/schema';

async function seed() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const password = process.env.SEED_ADMIN_PASSWORD ?? 'changeme123';

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });

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
    return;
  }

  const supabaseUserId = data.user.id;

  if (existing) {
    await db.update(users).set({ id: supabaseUserId }).where(eq(users.email, email));
    console.log(`Re-linked existing user ${email} to Supabase Auth id ${supabaseUserId}`);
  } else {
    const [business] = await db
      .insert(businesses)
      .values({ name: 'My Wedding Photography Business' })
      .returning();

    await db.insert(users).values({
      id: supabaseUserId,
      businessId: business.id,
      email,
    });
    console.log('Seeded business and admin user:');
  }

  console.log(`  email: ${email}`);
  console.log(`  password: ${password}`);
}

seed()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => process.exit(0));
