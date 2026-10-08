import type { User } from '@supabase/supabase-js';
import { ADMIN_SESSION_START_STORAGE_KEY } from './auth-storage-keys';

export function buildMfaMockUser(mfaEmail: string): User {
  const adminStart = localStorage.getItem(ADMIN_SESSION_START_STORAGE_KEY);
  return {
    id: 'mfa-auth-' + mfaEmail.replace(/[^a-zA-Z0-9]/g, ''),
    email: mfaEmail,
    user_metadata: {},
    app_metadata: {},
    aud: 'authenticated',
    created_at: adminStart
      ? new Date(Number(adminStart)).toISOString()
      : new Date().toISOString(),
    updated_at: new Date().toISOString(),
    email_confirmed_at: new Date().toISOString(),
    phone: '',
    confirmed_at: new Date().toISOString(),
  } as User;
}

export type RestoredAuthSessionReader = () => Promise<{
  data: { session: { user: User } | null };
}>;

/** After subscriber auth link on load: prefer Supabase user, else MFA mock. */
export async function resolveUserAfterSubscriberAuthLink(
  getSession: RestoredAuthSessionReader,
  mfaEmail: string
): Promise<User> {
  const {
    data: { session },
  } = await getSession();
  if (session?.user) {
    return session.user;
  }
  return buildMfaMockUser(mfaEmail);
}

export type CompleteRestoredAuthSessionHandlers = {
  setUser: (user: User) => void;
  checkAdminStatus: (user: User) => Promise<void>;
  onAdminCheckFailed: () => void;
  setAuthenticated: (value: boolean) => void;
  getPersistedSessionStart: () => number | null;
  persistSessionStart: (timestamp: number) => void;
};

export async function completeRestoredAuthSession(
  user: User,
  handlers: CompleteRestoredAuthSessionHandlers
): Promise<void> {
  handlers.setUser(user);
  handlers.setAuthenticated(true);
  const sessionStart = handlers.getPersistedSessionStart() || Date.now();
  handlers.persistSessionStart(sessionStart);
  // The home route only needs isAuthenticated. The admin query can take the
  // full directQuery timeout and must not leave the WebView on an empty page.
  void handlers.checkAdminStatus(user).catch((error: unknown) => {
    console.error('[AdminAuth] Error checking admin status during session restore:', error);
    handlers.onAdminCheckFailed();
  });
}
