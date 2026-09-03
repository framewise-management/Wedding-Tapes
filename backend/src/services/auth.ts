import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { businesses, users } from '../db/schema';
import { isPgError } from '../db/pg-error';
import { BadRequestError, ConflictError, ForbiddenError, UnauthorizedError } from '../lib/http-error';
import { signJwt } from '../lib/jwt';
import { supabase } from '../lib/supabase';
import type { GoogleAuthInput, LoginInput, ResendVerificationInput, SignupInput } from '../schemas/auth';

function issueToken(user: { id: string; businessId: string; email: string }) {
  return { token: signJwt({ sub: user.id, businessId: user.businessId, email: user.email }) };
}

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

  return issueToken(user);
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

export async function resendVerification(
  input: ResendVerificationInput,
): Promise<{ message: string }> {
  const frontendUrl = process.env.FRONTEND_URL!;
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: input.email,
    options: { emailRedirectTo: `${frontendUrl}/?verified=true` },
  });

  if (error) {
    throw new BadRequestError(error.message);
  }

  return { message: 'Verification email resent — check your inbox.' };
}

function profileFromGoogleMetadata(meta: Record<string, unknown>, email: string) {
  const given = typeof meta.given_name === 'string' ? meta.given_name.trim() : '';
  const family = typeof meta.family_name === 'string' ? meta.family_name.trim() : '';
  const full =
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta.name === 'string' && meta.name.trim()) ||
    '';
  const parts = full.split(/\s+/).filter(Boolean);
  const firstName = given || parts[0] || email.split('@')[0];
  const lastName = family || parts.slice(1).join(' ') || firstName;
  const businessName = full || firstName;
  return { firstName, lastName, businessName };
}

export async function loginWithGoogle(input: GoogleAuthInput): Promise<{ token: string }> {
  const { data, error } = await supabase.auth.getUser(input.accessToken);
  if (error || !data.user) {
    throw new UnauthorizedError('Google sign-in failed');
  }

  const authUser = data.user;
  const email = authUser.email;
  if (!email) {
    throw new UnauthorizedError('Google sign-in failed');
  }

  const existing =
    (await db.query.users.findFirst({ where: eq(users.id, authUser.id) })) ??
    (await db.query.users.findFirst({ where: eq(users.email, email) }));
  if (existing) {
    return issueToken(existing);
  }

  const profile = profileFromGoogleMetadata(authUser.user_metadata ?? {}, email);

  try {
    const created = await db.transaction(async (tx) => {
      const [business] = await tx
        .insert(businesses)
        .values({ name: profile.businessName, email })
        .returning();
      const [user] = await tx
        .insert(users)
        .values({
          id: authUser.id,
          businessId: business.id,
          firstName: profile.firstName,
          lastName: profile.lastName,
          email,
        })
        .returning();
      return user;
    });
    return issueToken(created);
  } catch (err) {
    if (isPgError(err, '23505')) {
      const raced =
        (await db.query.users.findFirst({ where: eq(users.id, authUser.id) })) ??
        (await db.query.users.findFirst({ where: eq(users.email, email) }));
      if (raced) {
        return issueToken(raced);
      }
    }
    throw err;
  }
}
