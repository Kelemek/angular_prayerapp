import { describe, it, expect, vi } from 'vitest';
import { relinkMfaAfterSupabaseSessionCleared } from './admin-auth-on-auth-state-change';

describe('relinkMfaAfterSupabaseSessionCleared', () => {
  it('refreshes data access after subscriber relink', async () => {
    const refreshDataAccessReady = vi.fn().mockResolvedValue(undefined);
    const ensureSubscriberAuthOnLoad = vi.fn().mockResolvedValue(true);
    const hasSupabaseJwt = vi.fn().mockResolvedValue(true);
    const logout = vi.fn();

    await relinkMfaAfterSupabaseSessionCleared({
      mfaEmail: 'user@example.com',
      ensureSubscriberAuthOnLoad,
      refreshDataAccessReady,
      hasSupabaseJwt,
      isUserAuthenticated: () => true,
      logout,
    });

    expect(ensureSubscriberAuthOnLoad).toHaveBeenCalledWith('user@example.com');
    expect(refreshDataAccessReady).toHaveBeenCalled();
    expect(logout).not.toHaveBeenCalled();
  });

  it('logs out when still authenticated without a JWT after relink', async () => {
    const logout = vi.fn().mockResolvedValue(undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await relinkMfaAfterSupabaseSessionCleared({
      mfaEmail: 'user@example.com',
      ensureSubscriberAuthOnLoad: vi.fn().mockResolvedValue(true),
      refreshDataAccessReady: vi.fn().mockResolvedValue(undefined),
      hasSupabaseJwt: vi.fn().mockResolvedValue(false),
      isUserAuthenticated: () => true,
      logout,
    });

    expect(logout).toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      '[AdminAuth] Supabase session ended without JWT; signing out'
    );
    warn.mockRestore();
  });

  it('does not log out when the shell is already signed out', async () => {
    const logout = vi.fn();

    await relinkMfaAfterSupabaseSessionCleared({
      mfaEmail: 'user@example.com',
      ensureSubscriberAuthOnLoad: vi.fn().mockResolvedValue(true),
      refreshDataAccessReady: vi.fn().mockResolvedValue(undefined),
      hasSupabaseJwt: vi.fn().mockResolvedValue(false),
      isUserAuthenticated: () => false,
      logout,
    });

    expect(logout).not.toHaveBeenCalled();
  });
});
