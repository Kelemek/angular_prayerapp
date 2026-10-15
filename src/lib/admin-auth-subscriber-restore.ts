import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import {
  resumeMfaSubscriberAuthLink,
  savedMfaRequiresSupabaseLogin,
  stampSubscriberAuthLink,
} from './auth-session-link';

/** Deduped subscriber JWT link on cold start / restore (per normalized email). */
export async function runDedupedSubscriberAuthLinkOnLoad(
  email: string,
  inFlightByEmail: Map<string, Promise<boolean>>,
  client: SupabaseClient
): Promise<boolean> {
  const normalized = email.toLowerCase().trim();
  if (!normalized) {
    return false;
  }

  const existing = inFlightByEmail.get(normalized);
  if (existing) {
    return existing;
  }

  const run = async (): Promise<boolean> => {
    const {
      data: { session },
    } = await client.auth.getSession();
    const result =
      session?.user?.email?.toLowerCase().trim() === normalized
        ? await stampSubscriberAuthLink(client)
        : await resumeMfaSubscriberAuthLink(client, normalized);

    if (!result.ok) {
      console.warn(
        '[AdminAuth] Subscriber auth link on load failed:',
        result.error
      );
      return false;
    }
    return true;
  };

  const pending = run().finally(() => {
    inFlightByEmail.delete(normalized);
  });
  inFlightByEmail.set(normalized, pending);
  return pending;
}

export type FinishSubscriberLinkRestoreDeps = {
  getSessionEpoch: () => number;
  logoutBlocksSessionRestore: () => boolean;
  signOutBounded: (label: string) => Promise<void>;
  getSession: () => Promise<Session | null>;
  logout: () => Promise<void>;
  completeRestoredAuthSession: (user: User) => Promise<void>;
};

/**
 * After subscriber link settles: require a matching Supabase JWT or send user to login.
 */
export async function finishSubscriberLinkRestore(
  session: Session | null,
  mfaEmail: string,
  restoreEpoch: number,
  linkSucceeded: boolean,
  deps: FinishSubscriberLinkRestoreDeps
): Promise<void> {
  if (deps.getSessionEpoch() !== restoreEpoch) {
    if (deps.logoutBlocksSessionRestore()) {
      await deps.signOutBounded('signOut after logout during restore');
    }
    return;
  }

  let afterLink: Session | null = null;
  try {
    afterLink = await deps.getSession();
  } catch (error) {
    console.warn('[AdminAuth] getSession after link failed:', error);
  }
  if (deps.getSessionEpoch() !== restoreEpoch) {
    if (deps.logoutBlocksSessionRestore()) {
      await deps.signOutBounded('signOut after logout during restore');
    }
    return;
  }
  if (deps.logoutBlocksSessionRestore()) {
    await deps.signOutBounded('signOut after logout during restore');
    return;
  }

  let jwtUser = afterLink?.user ?? session?.user ?? null;
  if (!jwtUser && linkSucceeded) {
    try {
      jwtUser = (await deps.getSession())?.user ?? null;
    } catch (error) {
      console.warn('[AdminAuth] getSession retry after link failed:', error);
    }
  }
  const supabaseEmail = jwtUser?.email;
  if (savedMfaRequiresSupabaseLogin(mfaEmail, supabaseEmail)) {
    console.warn(
      '[AdminAuth] Saved church login has no Supabase user; requiring church code'
    );
    await deps.logout();
    return;
  }
  if (!jwtUser) {
    console.warn(
      '[AdminAuth] Saved church login has no Supabase JWT; requiring church code'
    );
    await deps.logout();
    return;
  }
  await deps.completeRestoredAuthSession(jwtUser);
}
