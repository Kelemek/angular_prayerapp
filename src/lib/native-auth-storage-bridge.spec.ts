import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Capacitor } from '@capacitor/core';

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
  clearNativeAuthBridge,
  hydrateLocalStorageFromNativeAuthBridge,
  mfaEmailConflictsWithSession,
  resetNativePreferencesAvailabilityForTests,
  persistNativeAuthBridgeFromLocalStorage,
  syncNativeAuthBridgeBeforeLiveRedirect,
  NATIVE_AUTH_BRIDGE_PREFS_KEY,
  NATIVE_AUTH_BRIDGE_REVOKED_KEY,
  NATIVE_AUTH_LOCAL_SESSION_AT_KEY,
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
    preferences.remove.mockResolvedValue(undefined);
    await persistNativeAuthBridgeFromLocalStorage();
    expect(preferences.set).toHaveBeenCalledWith({
      key: NATIVE_AUTH_BRIDGE_PREFS_KEY,
      value: JSON.stringify({
        mfaEmail: 'persist@example.com',
        authResumeToken: 'token-abc',
      }),
    });
  });

  it('still clears the native bridge after Preferences timed out earlier', async () => {
    vi.useFakeTimers();
    preferences.get.mockImplementation(() => new Promise(() => {}));
    const pending = hydrateLocalStorageFromNativeAuthBridge();
    await vi.advanceTimersByTimeAsync(1000);
    await pending;

    preferences.set.mockResolvedValue(undefined);
    preferences.remove.mockResolvedValue(undefined);
    const cleared = clearNativeAuthBridge();
    await vi.advanceTimersByTimeAsync(0);
    await cleared;

    expect(preferences.set).toHaveBeenCalledWith({
      key: NATIVE_AUTH_BRIDGE_REVOKED_KEY,
      value: expect.stringMatching(/^\d+$/),
    });
    expect(preferences.remove).toHaveBeenCalledWith({
      key: NATIVE_AUTH_BRIDGE_PREFS_KEY,
    });
    expect(localStorage.getItem(NATIVE_AUTH_BRIDGE_REVOKED_KEY)).toEqual(
      expect.stringMatching(/^\d+$/)
    );
    vi.useRealTimers();
  });

  it('does not revoke the native bridge after a newer local login', async () => {
    localStorage.setItem(NATIVE_AUTH_LOCAL_SESSION_AT_KEY, '9999999999999');
    await clearNativeAuthBridge();
    expect(preferences.set).not.toHaveBeenCalled();
    expect(localStorage.getItem(NATIVE_AUTH_BRIDGE_REVOKED_KEY)).toBeNull();
    expect(localStorage.getItem(NATIVE_AUTH_LOCAL_SESSION_AT_KEY)).toBe(
      '9999999999999'
    );
  });

  it('does not stamp logout when a login lands while Preferences is loading', async () => {
    vi.spyOn(Capacitor, 'isPluginAvailable').mockImplementation(() => {
      queueMicrotask(() => {
        localStorage.setItem(NATIVE_AUTH_LOCAL_SESSION_AT_KEY, String(Date.now() + 10));
        localStorage.removeItem(NATIVE_AUTH_BRIDGE_REVOKED_KEY);
      });
      return true;
    });
    preferences.set.mockResolvedValue(undefined);
    await clearNativeAuthBridge();
    expect(preferences.set).not.toHaveBeenCalled();
    expect(localStorage.getItem(NATIVE_AUTH_BRIDGE_REVOKED_KEY)).toBeNull();
    expect(localStorage.getItem(NATIVE_AUTH_LOCAL_SESSION_AT_KEY)).toEqual(
      expect.stringMatching(/^\d+$/)
    );
    vi.mocked(Capacitor.isPluginAvailable).mockRestore();
  });

  it('drops a revoke stamp when a login session appears before the session key is removed', async () => {
    const nativeSetItem = localStorage.setItem.bind(localStorage);
    const setItemSpy = vi
      .spyOn(localStorage, 'setItem')
      .mockImplementation((key: string, value: string) => {
        nativeSetItem(key, value);
        if (key !== NATIVE_AUTH_BRIDGE_REVOKED_KEY) {
          return;
        }
        nativeSetItem(NATIVE_AUTH_LOCAL_SESSION_AT_KEY, String(Number(value) + 5));
        localStorage.removeItem(NATIVE_AUTH_BRIDGE_REVOKED_KEY);
      });
    preferences.set.mockResolvedValue(undefined);
    await clearNativeAuthBridge();
    setItemSpy.mockRestore();
    expect(preferences.set).not.toHaveBeenCalled();
    expect(localStorage.getItem(NATIVE_AUTH_BRIDGE_REVOKED_KEY)).toBeNull();
    expect(localStorage.getItem(NATIVE_AUTH_LOCAL_SESSION_AT_KEY)).toEqual(
      expect.stringMatching(/^\d+$/)
    );
  });

  it('undoes a revoked write when a login wins during the Preferences call', async () => {
    preferences.set.mockImplementation(async () => {
      localStorage.setItem(NATIVE_AUTH_LOCAL_SESSION_AT_KEY, String(Date.now() + 5));
      localStorage.removeItem(NATIVE_AUTH_BRIDGE_REVOKED_KEY);
    });
    preferences.remove.mockResolvedValue(undefined);
    await clearNativeAuthBridge();
    expect(preferences.remove).toHaveBeenCalledWith({
      key: NATIVE_AUTH_BRIDGE_REVOKED_KEY,
    });
    expect(preferences.remove).not.toHaveBeenCalledWith({
      key: NATIVE_AUTH_BRIDGE_PREFS_KEY,
    });
  });

  it('sets the revoked flag when removing the bridge payload fails', async () => {
    preferences.set.mockResolvedValue(undefined);
    preferences.remove.mockRejectedValue(new Error('remove failed'));
    await clearNativeAuthBridge();
    expect(preferences.set).toHaveBeenCalledWith({
      key: NATIVE_AUTH_BRIDGE_REVOKED_KEY,
      value: expect.stringMatching(/^\d+$/),
    });
    expect(localStorage.getItem(NATIVE_AUTH_BRIDGE_REVOKED_KEY)).toEqual(
      expect.stringMatching(/^\d+$/)
    );
  });

  it('does not republish a native session when this origin already revoked the bridge', async () => {
    localStorage.setItem(NATIVE_AUTH_BRIDGE_REVOKED_KEY, 'true');
    localStorage.setItem('mfa_authenticated_email', 'stale@example.com');
    preferences.get.mockResolvedValue({
      value: JSON.stringify({
        mfaEmail: 'stale@example.com',
        authResumeToken: 'tok',
      }),
    });
    await hydrateLocalStorageFromNativeAuthBridge();
    expect(localStorage.getItem('mfa_authenticated_email')).toBeNull();
    expect(preferences.get).not.toHaveBeenCalled();
  });

  it('clears the local revoked flag after persisting a new session', async () => {
    localStorage.setItem(NATIVE_AUTH_BRIDGE_REVOKED_KEY, 'true');
    localStorage.setItem('mfa_authenticated_email', 'persist@example.com');
    preferences.set.mockResolvedValue(undefined);
    preferences.remove.mockResolvedValue(undefined);
    await persistNativeAuthBridgeFromLocalStorage();
    expect(localStorage.getItem(NATIVE_AUTH_BRIDGE_REVOKED_KEY)).toBeNull();
  });

  it('does not republish bundled MFA when a prior timeout hid the revoked flag', async () => {
    vi.useFakeTimers();
    preferences.get.mockImplementation(() => new Promise(() => {}));
    const pending = hydrateLocalStorageFromNativeAuthBridge();
    await vi.advanceTimersByTimeAsync(1000);
    await pending;

    localStorage.setItem('mfa_authenticated_email', 'stale@example.com');
    localStorage.setItem('mfa_auth_resume_token', 'stale-token');
    preferences.get.mockResolvedValue({ value: 'true' });
    preferences.set.mockResolvedValue(undefined);
    preferences.remove.mockResolvedValue(undefined);

    const syncing = syncNativeAuthBridgeBeforeLiveRedirect();
    await vi.advanceTimersByTimeAsync(0);
    await syncing;

    expect(preferences.get).toHaveBeenCalledWith({
      key: NATIVE_AUTH_BRIDGE_REVOKED_KEY,
    });
    expect(preferences.set).not.toHaveBeenCalled();
    expect(preferences.remove).not.toHaveBeenCalled();
    expect(localStorage.getItem('mfa_authenticated_email')).toBeNull();
    vi.useRealTimers();
  });

  it('does not clear the native revoked flag when the revoke read times out before redirect', async () => {
    vi.useFakeTimers();
    preferences.get.mockImplementation(() => new Promise(() => {}));
    const pending = hydrateLocalStorageFromNativeAuthBridge();
    await vi.advanceTimersByTimeAsync(1000);
    await pending;

    localStorage.setItem('mfa_authenticated_email', 'stale@example.com');
    preferences.set.mockResolvedValue(undefined);
    preferences.remove.mockResolvedValue(undefined);

    const syncing = syncNativeAuthBridgeBeforeLiveRedirect();
    await vi.advanceTimersByTimeAsync(1000);
    await syncing;

    expect(preferences.set).not.toHaveBeenCalled();
    expect(preferences.remove).not.toHaveBeenCalled();
    expect(localStorage.getItem('mfa_authenticated_email')).toBe(
      'stale@example.com'
    );
    vi.useRealTimers();
  });

  it('persists bundled MFA before redirect once the revoked flag reads clear', async () => {
    vi.useFakeTimers();
    preferences.get.mockImplementation(() => new Promise(() => {}));
    const pending = hydrateLocalStorageFromNativeAuthBridge();
    await vi.advanceTimersByTimeAsync(1000);
    await pending;

    localStorage.setItem('mfa_authenticated_email', 'persist@example.com');
    localStorage.setItem('mfa_auth_resume_token', 'token-abc');
    preferences.get.mockResolvedValue({ value: null });
    preferences.set.mockResolvedValue(undefined);
    preferences.remove.mockResolvedValue(undefined);

    const syncing = syncNativeAuthBridgeBeforeLiveRedirect();
    await vi.advanceTimersByTimeAsync(0);
    await syncing;

    expect(preferences.set).toHaveBeenCalledWith({
      key: NATIVE_AUTH_BRIDGE_PREFS_KEY,
      value: JSON.stringify({
        mfaEmail: 'persist@example.com',
        authResumeToken: 'token-abc',
      }),
    });
    vi.useRealTimers();
  });

  it('pushes the revoked flag before live redirect when this origin already logged out', async () => {
    localStorage.setItem(NATIVE_AUTH_BRIDGE_REVOKED_KEY, 'true');
    localStorage.setItem('mfa_authenticated_email', 'stale@example.com');
    preferences.set.mockResolvedValue(undefined);
    preferences.remove.mockResolvedValue(undefined);
    await syncNativeAuthBridgeBeforeLiveRedirect();
    expect(localStorage.getItem('mfa_authenticated_email')).toBeNull();
    expect(preferences.set).toHaveBeenCalledWith({
      key: NATIVE_AUTH_BRIDGE_REVOKED_KEY,
      value: expect.stringMatching(/^\d+$/),
    });
    expect(preferences.set).not.toHaveBeenCalledWith(
      expect.objectContaining({ key: NATIVE_AUTH_BRIDGE_PREFS_KEY })
    );
  });

  it('keeps a re-login session while the native revoke flag is still set', async () => {
    localStorage.setItem(NATIVE_AUTH_BRIDGE_REVOKED_KEY, 'true');
    localStorage.setItem('mfa_authenticated_email', 'new@example.com');
    localStorage.setItem('mfa_auth_resume_token', 'new-token');
    let revokedDuringPersist: string | null = 'missing';
    preferences.set.mockImplementation(async () => {
      revokedDuringPersist = localStorage.getItem(NATIVE_AUTH_BRIDGE_REVOKED_KEY);
    });
    preferences.remove.mockResolvedValue(undefined);
    await persistNativeAuthBridgeFromLocalStorage();
    expect(revokedDuringPersist).toBeNull();
    expect(localStorage.getItem(NATIVE_AUTH_LOCAL_SESSION_AT_KEY)).toEqual(
      expect.stringMatching(/^\d+$/)
    );

    preferences.get.mockImplementation(async ({ key }: { key: string }) => {
      if (key === NATIVE_AUTH_BRIDGE_REVOKED_KEY) {
        return { value: '1' };
      }
      return {
        value: JSON.stringify({
          mfaEmail: 'old@example.com',
          authResumeToken: 'old-token',
        }),
      };
    });
    await hydrateLocalStorageFromNativeAuthBridge();
    expect(localStorage.getItem('mfa_authenticated_email')).toBe(
      'new@example.com'
    );

    preferences.set.mockResolvedValue(undefined);
    await syncNativeAuthBridgeBeforeLiveRedirect();
    expect(localStorage.getItem('mfa_authenticated_email')).toBe(
      'new@example.com'
    );
  });

  it('keeps a re-login when the legacy true revoke is still in Preferences', async () => {
    localStorage.setItem('mfa_authenticated_email', 'new@example.com');
    localStorage.setItem('mfa_auth_resume_token', 'new-token');
    preferences.get.mockResolvedValue({ value: 'true' });
    preferences.set.mockImplementation(async () => {
      await hydrateLocalStorageFromNativeAuthBridge();
    });
    preferences.remove.mockRejectedValue(new Error('remove failed'));
    await persistNativeAuthBridgeFromLocalStorage();
    expect(localStorage.getItem('mfa_authenticated_email')).toBe(
      'new@example.com'
    );
    await hydrateLocalStorageFromNativeAuthBridge();
    expect(localStorage.getItem('mfa_authenticated_email')).toBe(
      'new@example.com'
    );
  });

  it('still drops bundled MFA for a legacy true revoke this origin did not supersede', async () => {
    localStorage.setItem(NATIVE_AUTH_LOCAL_SESSION_AT_KEY, String(Date.now()));
    localStorage.setItem('mfa_authenticated_email', 'stale@example.com');
    preferences.get.mockResolvedValue({ value: 'true' });
    await syncNativeAuthBridgeBeforeLiveRedirect();
    expect(localStorage.getItem('mfa_authenticated_email')).toBeNull();
    expect(preferences.set).not.toHaveBeenCalled();
  });

  it('drops bundled MFA when the native revoke is newer than the local session', async () => {
    localStorage.setItem(NATIVE_AUTH_LOCAL_SESSION_AT_KEY, '1000');
    localStorage.setItem('mfa_authenticated_email', 'stale@example.com');
    preferences.get.mockResolvedValue({ value: '2000' });
    await syncNativeAuthBridgeBeforeLiveRedirect();
    expect(localStorage.getItem('mfa_authenticated_email')).toBeNull();
    expect(preferences.set).not.toHaveBeenCalled();
  });
});
