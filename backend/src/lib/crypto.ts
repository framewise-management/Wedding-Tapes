import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { BadRequestError } from './http-error';

const ALGORITHM = 'aes-256-gcm';

// Deliberately not JWT_SECRET: this key protects a third-party credential at
// rest, so rotating it must not invalidate every session token.
function key(): Buffer {
  const raw = process.env.CREDENTIAL_ENC_KEY;
  if (!raw) {
    throw new BadRequestError(
      'CREDENTIAL_ENC_KEY is not set on this server — cannot store calendar credentials',
    );
  }
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) {
    throw new BadRequestError('CREDENTIAL_ENC_KEY must be 32 bytes, base64-encoded');
  }
  return buf;
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), body].map((b) => b.toString('base64')).join('.');
}

export function decryptSecret(stored: string): string {
  const parts = stored.split('.');
  if (parts.length !== 3) throw new BadRequestError('Stored credential is malformed');
  const [iv, tag, body] = parts.map((p) => Buffer.from(p, 'base64'));
  const decipher = createDecipheriv(ALGORITHM, key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8');
}
