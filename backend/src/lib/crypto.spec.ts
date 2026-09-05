import { beforeAll, describe, expect, it } from 'vitest';
import { randomBytes } from 'crypto';
import { decryptSecret, encryptSecret } from './crypto';

beforeAll(() => {
  process.env.CREDENTIAL_ENC_KEY = randomBytes(32).toString('base64');
});

describe('credential encryption', () => {
  it('round-trips a secret', () => {
    const secret = 'abcd-efgh-ijkl-mnop';
    expect(decryptSecret(encryptSecret(secret))).toBe(secret);
  });

  it('never stores the plaintext', () => {
    expect(encryptSecret('abcd-efgh-ijkl-mnop')).not.toContain('abcd');
  });

  it('uses a fresh IV per call', () => {
    expect(encryptSecret('same')).not.toBe(encryptSecret('same'));
  });

  it('rejects a tampered payload', () => {
    const [iv, tag, body] = encryptSecret('secret').split('.');
    const flipped = Buffer.from(body, 'base64');
    flipped[0] ^= 0xff;
    expect(() => decryptSecret(`${iv}.${tag}.${flipped.toString('base64')}`)).toThrow();
  });

  it('rejects a malformed payload', () => {
    expect(() => decryptSecret('nope')).toThrow('malformed');
  });
});
