/**
 * HMAC-SHA256 of a one-time code. The pepper is the service-role key, so a
 * database copy of the hash cannot be turned back into the code.
 * Keep this file identical to the copies under supabase/functions/.
 */

export async function hashVerificationCode(code: string, pepper: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pepper),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(code),
  );
  return toHex(new Uint8Array(signature));
}

/** Constant-time compare. Different lengths fail closed (legacy plaintext rows). */
export function verificationCodesMatch(storedHash: string, computedHash: string): boolean {
  if (storedHash.length !== computedHash.length || storedHash.length === 0) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < storedHash.length; i++) {
    diff |= storedHash.charCodeAt(i) ^ computedHash.charCodeAt(i);
  }
  return diff === 0;
}

function toHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}
