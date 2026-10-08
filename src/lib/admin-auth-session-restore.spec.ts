import { describe, it, expect, vi } from 'vitest';
import {
  buildMfaMockUser,
  completeRestoredAuthSession,
  resolveUserAfterSubscriberAuthLink,
} from './admin-auth-session-restore';
import { ADMIN_SESSION_START_STORAGE_KEY } from './auth-storage-keys';

describe('admin-auth-session-restore', () => {
  it('buildMfaMockUser uses admin session start when present', () => {
    localStorage.setItem(ADMIN_SESSION_START_STORAGE_KEY, String(Date.UTC(2024, 0, 1)));
    const user = buildMfaMockUser('user@example.com');
    expect(user.email).toBe('user@example.com');
    expect(user.id).toContain('mfa-auth-');
  });

  it('resolveUserAfterSubscriberAuthLink prefers Supabase session', async () => {
    const supabaseUser = { email: 'user@example.com', id: 'real' } as never;
    const user = await resolveUserAfterSubscriberAuthLink(
      async () => ({ data: { session: { user: supabaseUser } } }),
      'user@example.com'
    );
    expect(user).toBe(supabaseUser);
  });

  it('completeRestoredAuthSession still authenticates when admin check throws', async () => {
    const setAuthenticated = vi.fn();
    await completeRestoredAuthSession(
      { email: 'user@example.com' } as never,
      {
        setUser: vi.fn(),
        checkAdminStatus: vi.fn().mockRejectedValue(new Error('fail')),
        onAdminCheckFailed: vi.fn(),
        setAuthenticated,
        getPersistedSessionStart: () => null,
        persistSessionStart: vi.fn(),
      }
    );
    expect(setAuthenticated).toHaveBeenCalledWith(true);
  });
});
