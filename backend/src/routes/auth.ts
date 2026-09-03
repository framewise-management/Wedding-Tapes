import { Hono } from 'hono';
import { parseBody } from '../lib/validate';
import { loginSchema, signupSchema } from '../schemas/auth';
import { login, signup } from '../services/auth';

export const authRoutes = new Hono();

authRoutes.post('/login', async (c) => {
  const input = await parseBody(c, loginSchema);
  return c.json(await login(input));
});

authRoutes.post('/signup', async (c) => {
  const input = await parseBody(c, signupSchema);
  return c.json(await signup(input), 201);
});

authRoutes.post('/logout', (c) => {
  return c.json({ success: true });
});
