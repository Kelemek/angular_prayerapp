import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => true),
    isPluginAvailable: vi.fn(() => true),
  },
}));

const preferences = {
  get: vi.fn(),
  set: vi.fn(),
  remove: vi.fn(),
};

vi.mock('@capacitor/preferences', () => ({
  Preferences: preferences,
}));

import {
  hydrateLocalStorageFromNativeAuthBridge,
  mfaEmailConflictsWithSession,
  resetNativePreferencesAvailabilityForTests,
  persistNativeAuthBridgeFromLocalStorage,
  syncNativeAuthBridgeBeforeLiveRedirect,
  NATIVE_AUTH_BRIDGE_PREFS_KEY,
  NATIVE_AUTH_BRIDGE_REVOKED_KEY,
} from './native-auth-storage-bridge';

describe('native-auth-storage-bridge', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    resetNativePreferencesAvailabilityForTests();
    vi.useRealTimers();
  });

  it('mfaEmailConflictsWithSession detects mismatched emails', () => {
    expect(
      mfaEmailConflictsWithSession('user@example.com', 'other@example.com')
    ).toBe(true);
    expect(
      mfaEmailConflictsWithSession('User@Example.com', 'user@example.com')
    ).toBe(false);
    expect(mfaEmailConflictsWithSession(null, 'user@example.com')).toBe(false);
  });

  it('overwrites stale local MFA email when bridge has a different account', async () => {
    localStorage.setItem('mfa_authenticated_email', 'stale@example.com');
    localStorage.setItem('mfa_auth_resume_token', 'old-token');
    preferences.get.mockImplementation(async ({ key }: { key: string }) => {
      if (key === NATIVE_AUTH_BRIDGE_REVOKED_KEY) {
        return { value: null };
      }
      return {
        value: JSON.stringify({
          mfaEmail: 'bridged@example.com',
          authResumeToken: 'new-token',
        }),
      };
    });
    await hydrateLocalStorageFromNativeAuthBridge();
    expect(localStorage.getItem('mfa_authenticated_email')).toBe(
      'bridged@example.com'
    );
    expect(localStorage.getItem('mfa_auth_resume_token')).toBe('new-token');
  });

  it('drops stale resume token when bridge switches account without a new token', async () => {
    localStorage.setItem('mfa_authenticated_email', 'stale@example.com');
    localStorage.setItem('mfa_auth_resume_token', 'old-token');
    preferences.get.mockImplementation(async ({ key }: { key: string }) => {
      if (key === NATIVE_AUTH_BRIDGE_REVOKED_KEY) {
        return { value: null };
      }
      return {
        value: JSON.stringify({
          mfaEmail: 'bridged@example.com',
        }),
      };
    });
    await hydrateLocalStorageFromNativeAuthBridge();
    expect(localStorage.getItem('mfa_auth_resume_token')).toBeNull();
  });

  it('finishes hydrate when Preferences.get never settles', async () => {
    vi.useFakeTimers();
    preferences.get.mockImplementation(() => new Promise(() => {}));
    const pending = hydrateLocalStorageFromNativeAuthBridge();
    await vi.advanceTimersByTimeAsync(1000);
    await pending;
    expect(localStorage.getItem('mfa_authenticated_email')).toBeNull();
    vi.useRealTimers();
  });

  it('hydrates MFA email from native preferences when localStorage is empty', async () => {
    preferences.get.mockResolvedValue({
      value: JSON.stringify({
        mfaEmail: 'user@example.com',
        authResumeToken: 'resume-proof',
      }),
    });
    await hydrateLocalStorageFromNativeAuthBridge();
    expect(preferences.get).toHaveBeenCalledWith({
      key: NATIVE_AUTH_BRIDGE_PREFS_KEY,
    });
    expect(localStorage.getItem('mfa_authenticated_email')).toBe(
      'user@example.com'
    );
    expect(localStorage.getItem('mfa_auth_resume_token')).toBe('resume-proof');
  });

  it('hydrate clears local MFA when bridge was revoked on logout', async () => {
    localStorage.setItem('mfa_authenticated_email', 'stale@example.com');
    preferences.get.mockImplementation(async ({ key }: { key: string }) => {
      if (key === NATIVE_AUTH_BRIDGE_REVOKED_KEY) {
        return { value: 'true' };
      }
      return { value: null };
    });
    await hydrateLocalStorageFromNativeAuthBridge();
    expect(localStorage.getItem('mfa_authenticated_email')).toBeNull();
  });

  it('clears stale bundled MFA when bridge was revoked on logout', async () => {
    localStorage.setItem('mfa_authenticated_email', 'stale@example.com');
    localStorage.setItem('mfa_auth_resume_token', 'stale-token');
    preferences.get.mockResolvedValue({ value: 'true' });
    await syncNativeAuthBridgeBeforeLiveRedirect();
    expect(preferences.get).toHaveBeenCalledWith({
      key: NATIVE_AUTH_BRIDGE_REVOKED_KEY,
    });
    expect(localStorage.getItem('mfa_authenticated_email')).toBeNull();
    expect(preferences.set).not.toHaveBeenCalled();
  });

  it('persists local MFA session to native preferences', async () => {
    preferences.get.mockResolvedValue({ value: null });
    localStorage.setItem('mfa_authenticated_email', 'persist@example.com');
    localStorage.setItem('mfa_auth_resume_token', 'token-abc');
    await persistNativeAuthBridgeFromLocalStorage();
    expect(preferences.set).toHaveBeenCalledWith({
      key: NATIVE_AUTH_BRIDGE_PREFS_KEY,
      value: JSON.stringify({
        mfaEmail: 'persist@example.com',
        authResumeToken: 'token-abc',
      }),
    });
  });
});
