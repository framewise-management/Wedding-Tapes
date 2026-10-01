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
import { authService } from '../services';

export const authRoutes = new Hono<{ Variables: AuthedVariables }>();

authRoutes.post('/login', async (c) => {
  const input = await parseBody(c, loginSchema);
  return c.json(await authService.login(input));
});

authRoutes.post('/signup', async (c) => {
  const input = await parseBody(c, signupSchema);
  return c.json(await authService.signup(input), 201);
});

authRoutes.post('/resend', async (c) => {
  const input = await parseBody(c, resendVerificationSchema);
  return c.json(await authService.resendVerification(input));
});

authRoutes.post('/google', async (c) => {
  const input = await parseBody(c, googleAuthSchema);
  return c.json(await authService.loginWithGoogle(input));
});

authRoutes.post('/logout', (c) => {
  return c.json({ success: true });
});

authRoutes.get('/me', authMiddleware, async (c) => {
  return c.json(await authService.getProfile(c.get('user').sub));
});

authRoutes.put('/me', authMiddleware, async (c) => {
  const input = await parseBody(c, updateProfileSchema);
  return c.json(await authService.updateProfile(c.get('user').sub, input));
});
