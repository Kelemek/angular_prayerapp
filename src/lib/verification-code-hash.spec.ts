import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { hashVerificationCode, verificationCodesMatch } from './verification-code-hash';

const dir = dirname(fileURLToPath(import.meta.url));

describe('verification code hash', () => {
  it('stores a peppered hash that is not the code', async () => {
    const hash = await hashVerificationCode('123456', 'pepper-a');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toBe('123456');
    expect(await hashVerificationCode('123456', 'pepper-a')).toBe(hash);
    expect(await hashVerificationCode('123457', 'pepper-a')).not.toBe(hash);
    expect(await hashVerificationCode('123456', 'pepper-b')).not.toBe(hash);
  });

  it('rejects a different hash and leftover plaintext', async () => {
    const hash = await hashVerificationCode('123456', 'pepper-a');
    const other = await hashVerificationCode('654321', 'pepper-a');
    expect(verificationCodesMatch(hash, hash)).toBe(true);
    expect(verificationCodesMatch(hash, other)).toBe(false);
    expect(verificationCodesMatch('123456', hash)).toBe(false);
    expect(verificationCodesMatch('', hash)).toBe(false);
  });

  it('keeps the Edge Function copies identical to this module', () => {
    const canonical = readFileSync(resolve(dir, 'verification-code-hash.ts'), 'utf8');
    const sendCopy = readFileSync(
      resolve(dir, '../../supabase/functions/send-verification-code/verification-code-hash.ts'),
      'utf8',
    );
    const verifyCopy = readFileSync(
      resolve(dir, '../../supabase/functions/verify-code/verification-code-hash.ts'),
      'utf8',
    );
    expect(sendCopy).toBe(canonical);
    expect(verifyCopy).toBe(canonical);
  });
});
