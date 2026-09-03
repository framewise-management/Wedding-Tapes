import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { businesses, users } from '../db/schema';
import { isPgError } from '../db/pg-error';
import { BadRequestError, ConflictError, ForbiddenError, UnauthorizedError } from '../lib/http-error';
import { signJwt } from '../lib/jwt';
import { supabase } from '../lib/supabase';
import type { LoginInput, SignupInput } from '../schemas/auth';

export async function login(input: LoginInput): Promise<{ token: string }> {
  const { error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) {
    const isUnconfirmed =
      (error as { code?: string }).code === 'email_not_confirmed' ||
      error.message.toLowerCase().includes('email not confirmed');
    if (isUnconfirmed) {
      throw new ForbiddenError(
        'Please verify your email before logging in — check your inbox for the confirmation link.',
      );
    }
    throw new UnauthorizedError('Invalid email or password');
  }

  const user = await db.query.users.findFirst({ where: eq(users.email, input.email) });
  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  return { token: signJwt({ sub: user.id, businessId: user.businessId, email: user.email }) };
}

export async function signup(input: SignupInput): Promise<{ message: string }> {
  const existing = await db.query.users.findFirst({ where: eq(users.email, input.email) });
  if (existing) {
    throw new ConflictError('An account with this email already exists');
  }

  const frontendUrl = process.env.FRONTEND_URL!;
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { emailRedirectTo: `${frontendUrl}/?verified=true` },
  });

  if (error) {
    if (error.message.toLowerCase().includes('already registered')) {
      throw new ConflictError('An account with this email already exists');
    }
    throw new BadRequestError(error.message);
  }
  if (!data.user) {
    throw new BadRequestError('Signup failed');
  }

  try {
    await db.transaction(async (tx) => {
      const [business] = await tx
        .insert(businesses)
        .values({ name: input.businessName, email: input.email })
        .returning();
      await tx.insert(users).values({
        id: data.user!.id,
        businessId: business.id,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
      });
    });
  } catch (err) {
    if (isPgError(err, '23505')) {
      throw new ConflictError('An account with this email already exists');
    }
    throw err;
  }

  return {
    message: 'Account created — check your email to verify your address before logging in.',
  };
}
