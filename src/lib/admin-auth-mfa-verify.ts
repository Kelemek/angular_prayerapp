import type { SupabaseClient, User } from '@supabase/supabase-js';
import {
  linkAuthSessionAfterVerify,
  resumeMfaSubscriberAuthLink,
  stampSubscriberAuthLink,
} from './auth-session-link';

export type MfaVerifyEdgeSuccess = {
  hashed_token?: string;
  error?: string;
};

export type CompleteMfaVerifyLinkResult =
  | { ok: true; user: User }
  | { ok: false; error: string };

/** Link Supabase JWT after verify-code succeeds; requires matching session email. */
export async function completeMfaVerifySupabaseLink(
  client: SupabaseClient,
  email: string,
  data: MfaVerifyEdgeSuccess
): Promise<CompleteMfaVerifyLinkResult> {
  const normalizedEmail = email.toLowerCase().trim();

  const readLinkedUser = async (): Promise<User | null> => {
    try {
      const {
        data: { session },
      } = await client.auth.getSession();
      const sessionEmail = session?.user?.email?.toLowerCase().trim();
      if (session?.user && sessionEmail === normalizedEmail) {
        return session.user;
      }
    } catch (error) {
      console.warn('[AdminAuth] getSession after MFA link failed:', error);
    }
    return null;
  };

  if (typeof data.hashed_token === 'string' && data.hashed_token.trim()) {
    const linked = await linkAuthSessionAfterVerify(client, data.hashed_token);
    const linkedUser = await readLinkedUser();
    if (!linkedUser) {
      return {
        ok: false,
        error: linked.ok
          ? 'Could not establish a secure session. Please try signing in again.'
          : linked.error ?? 'Could not establish a secure session. Please try signing in again.',
      };
    }
    if (!linked.ok) {
      const stamped = await stampSubscriberAuthLink(client);
      if (!stamped.ok) {
        console.warn(
          '[AdminAuth] Subscriber stamp after verify failed:',
          stamped.error
        );
      }
    }
    return { ok: true, user: linkedUser };
  }

  const resumed = await resumeMfaSubscriberAuthLink(client, email);
  const linkedUser = await readLinkedUser();
  if (!linkedUser) {
    return {
      ok: false,
      error: resumed.ok
        ? 'Could not establish a secure session. Please try signing in again.'
        : resumed.error ?? 'Could not establish a secure session. Please try signing in again.',
    };
  }
  return { ok: true, user: linkedUser };
}
