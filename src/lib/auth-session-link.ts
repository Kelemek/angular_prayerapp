import type { SupabaseClient } from '@supabase/supabase-js';
import { MFA_AUTH_RESUME_TOKEN_STORAGE_KEY } from './auth-storage-keys';

/** Request body flag for verify-code: mint Supabase session after church MFA code checks out. */
export const VERIFY_CODE_LINK_AUTH_SESSION = 'linkAuthSession';

export { MFA_AUTH_RESUME_TOKEN_STORAGE_KEY };

export function persistAuthResumeTokenFromVerifyResponse(data: {
  auth_resume_token?: unknown;
}): void {
  if (typeof data.auth_resume_token !== 'string') {
    return;
  }
  const token = data.auth_resume_token.trim();
  if (token) {
    localStorage.setItem(MFA_AUTH_RESUME_TOKEN_STORAGE_KEY, token);
  }
}

export type LinkAuthSessionResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Exchange a server-minted magic-link token for a Supabase session and stamp email_subscribers.
 */
export async function linkAuthSessionAfterVerify(
  client: SupabaseClient,
  hashedToken: string
): Promise<LinkAuthSessionResult> {
  const token = hashedToken.trim();
  if (!token) {
    return { ok: false, error: 'missing token' };
  }

  const { error: otpError } = await client.auth.verifyOtp({
    token_hash: token,
    type: 'email',
  });
  if (otpError) {
    return { ok: false, error: otpError.message };
  }

  const { error: rpcError } = await client.rpc('link_email_subscriber_auth');
  if (rpcError) {
    return { ok: false, error: rpcError.message };
  }

  return { ok: true };
}

/** Stamp email_subscribers when the client already holds a Supabase JWT. */
export async function stampSubscriberAuthLink(
  client: SupabaseClient
): Promise<LinkAuthSessionResult> {
  const { error: rpcError } = await client.rpc('link_email_subscriber_auth');
  if (rpcError) {
    return { ok: false, error: rpcError.message };
  }
  return { ok: true };
}

/**
 * MFA-only session on app load: mint auth user + JWT without a new church code.
 * Caller must pass the same email as mfa_authenticated_email.
 */
export async function resumeMfaSubscriberAuthLink(
  client: SupabaseClient,
  email: string
): Promise<LinkAuthSessionResult> {
  const normalized = email.toLowerCase().trim();
  if (!normalized) {
    return { ok: false, error: 'missing email' };
  }

  const {
    data: { session },
  } = await client.auth.getSession();
  if (session?.user?.email?.toLowerCase().trim() === normalized) {
    return stampSubscriberAuthLink(client);
  }

  const authResumeToken = localStorage.getItem(MFA_AUTH_RESUME_TOKEN_STORAGE_KEY)?.trim() ?? '';
  if (!authResumeToken) {
    return { ok: false, error: 'missing resume proof' };
  }

  const { data, error } = await client.functions.invoke('resume-auth-link', {
    body: { email: normalized, auth_resume_token: authResumeToken },
  });

  if (error) {
    return { ok: false, error: error.message };
  }
  if (data?.error) {
    return { ok: false, error: String(data.error) };
  }
  if (typeof data?.hashed_token !== 'string' || !data.hashed_token.trim()) {
    return { ok: false, error: 'missing token' };
  }

  return linkAuthSessionAfterVerify(client, data.hashed_token);
}
