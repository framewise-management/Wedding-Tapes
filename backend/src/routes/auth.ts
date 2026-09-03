import { Hono } from 'hono';
import { parseBody } from '../lib/validate';
import { loginSchema, resendVerificationSchema, signupSchema } from '../schemas/auth';
import { login, resendVerification, signup } from '../services/auth';

export const authRoutes = new Hono();

authRoutes.post('/login', async (c) => {
  const input = await parseBody(c, loginSchema);
  return c.json(await login(input));
});

authRoutes.post('/signup', async (c) => {
  const input = await parseBody(c, signupSchema);
  return c.json(await signup(input), 201);
});

authRoutes.post('/resend', async (c) => {
  const input = await parseBody(c, resendVerificationSchema);
  return c.json(await resendVerification(input));
});

authRoutes.post('/logout', (c) => {
  return c.json({ success: true });
});
