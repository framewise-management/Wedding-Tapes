import { Hono } from 'hono';
import type { AuthedVariables } from '../middleware/auth';
import { authMiddleware } from '../middleware/auth';
import { parseBody } from '../lib/validate';
import {
  googleAuthSchema,
  loginSchema,
  resendVerificationSchema,
  signupSchema,
  updateProfileSchema,
} from '../schemas/auth';
import {
  getProfile,
  login,
  loginWithGoogle,
  resendVerification,
  signup,
  updateProfile,
} from '../services/auth';

export const authRoutes = new Hono<{ Variables: AuthedVariables }>();

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

authRoutes.post('/google', async (c) => {
  const input = await parseBody(c, googleAuthSchema);
  return c.json(await loginWithGoogle(input));
});

authRoutes.post('/logout', (c) => {
  return c.json({ success: true });
});

authRoutes.get('/me', authMiddleware, async (c) => {
  return c.json(await getProfile(c.get('user').sub));
});

authRoutes.put('/me', authMiddleware, async (c) => {
  const input = await parseBody(c, updateProfileSchema);
  return c.json(await updateProfile(c.get('user').sub, input));
});
