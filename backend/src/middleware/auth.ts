import type { Context, Next } from 'hono';
import { UnauthorizedError } from '../lib/http-error';
import { verifyJwt, type JwtPayload } from '../lib/jwt';

export type AuthedVariables = { user: JwtPayload };

export async function authMiddleware(c: Context<{ Variables: AuthedVariables }>, next: Next) {
  const header = c.req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    throw new UnauthorizedError();
  }
  try {
    c.set('user', verifyJwt(token));
  } catch {
    throw new UnauthorizedError();
  }
  await next();
}
//ok