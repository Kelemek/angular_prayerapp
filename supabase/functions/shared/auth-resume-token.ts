/**
 * HMAC-signed proof that the caller recently passed church MFA (verify-code).
 * Used by resume-auth-link; minted only from verify-code on admin_login success.
 */

const DEFAULT_TTL_SEC = 180 * 24 * 60 * 60; // 180 days

function resumePepper(): string {
  const dedicated = Deno.env.get('AUTH_RESUME_HMAC_SECRET')?.trim();
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.trim();
  if (dedicated) {
    return dedicated;
  }
  if (serviceRole) {
    return serviceRole;
  }
  throw new Error('Missing AUTH_RESUME_HMAC_SECRET or SUPABASE_SERVICE_ROLE_KEY');
}

function toBase64Url(bytes: Uint8Array): string {
  const bin = String.fromCharCode(...bytes);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const mod = padded.length % 4;
  const base64 = mod === 0 ? padded : padded + '='.repeat(4 - mod);
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

async function sign(message: string, pepper: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pepper),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(message)
  );
  return toBase64Url(new Uint8Array(signature));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function mintAuthResumeToken(email: string): Promise<string> {
  const normalized = email.toLowerCase().trim();
  const exp = Math.floor(Date.now() / 1000) + DEFAULT_TTL_SEC;
  const payloadJson = JSON.stringify({ e: normalized, exp });
  const payloadB64 = toBase64Url(new TextEncoder().encode(payloadJson));
  const sig = await sign(payloadB64, resumePepper());
  return `${payloadB64}.${sig}`;
}

export async function verifyAuthResumeToken(
  token: string,
  email: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const normalized = email.toLowerCase().trim();
  const trimmed = token.trim();
  const dot = trimmed.lastIndexOf('.');
  if (dot <= 0) {
    return { ok: false, reason: 'invalid token' };
  }
  const payloadB64 = trimmed.slice(0, dot);
  const sig = trimmed.slice(dot + 1);
  const expected = await sign(payloadB64, resumePepper());
  if (!timingSafeEqual(sig, expected)) {
    return { ok: false, reason: 'invalid token' };
  }

  let payload: { e?: string; exp?: number };
  try {
    payload = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadB64)));
  } catch {
    return { ok: false, reason: 'invalid token' };
  }

  if (payload.e !== normalized) {
    return { ok: false, reason: 'email mismatch' };
  }
  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp < now) {
    return { ok: false, reason: 'token expired' };
  }

  return { ok: true };
}
