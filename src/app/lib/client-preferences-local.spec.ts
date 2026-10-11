import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildClientPreferencesFromLocal,
  buildClientPreferencesFromLocalForPersist,
  CLIENT_PREFERENCES_LEGACY_CLAIM_KEY,
  mayUseLegacyLocalKeysForEmail,
} from './client-preferences-local';
import { PRAY_FOR_MODAL_DO_NOT_SHOW_KEY } from './prayer-card-pray-for-modal';

describe('client-preferences-local', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('mayUseLegacyLocalKeysForEmail blocks another account after claim', () => {
    localStorage.setItem(CLIENT_PREFERENCES_LEGACY_CLAIM_KEY, 'first@example.com');
    localStorage.setItem('theme', 'dark');
    expect(mayUseLegacyLocalKeysForEmail('second@example.com')).toBe(false);
  });

  it('buildClientPreferencesFromLocal uses legacy keys for first claimant', () => {
    localStorage.setItem(PRAY_FOR_MODAL_DO_NOT_SHOW_KEY, 'true');
    localStorage.setItem('theme', 'dark');
    const prefs = buildClientPreferencesFromLocal('user@example.com');
    expect(prefs.skipPrayForExplanationModal).toBe(true);
    expect(prefs.theme).toBe('dark');
    expect(localStorage.getItem(CLIENT_PREFERENCES_LEGACY_CLAIM_KEY)).toBe(
      'user@example.com'
    );
  });

  it('buildClientPreferencesFromLocal does not read unscoped theme for another user', () => {
    localStorage.setItem(CLIENT_PREFERENCES_LEGACY_CLAIM_KEY, 'first@example.com');
    localStorage.setItem('theme', 'dark');
    const prefs = buildClientPreferencesFromLocal('second@example.com', {
      allowLegacyKeys: false,
    });
    expect(prefs.theme).toBe('system');
  });

  it('buildClientPreferencesFromLocalForPersist keeps session baseline on shared device', () => {
    localStorage.setItem(CLIENT_PREFERENCES_LEGACY_CLAIM_KEY, 'first@example.com');
    localStorage.setItem('theme', 'dark');
    const sessionPrefs = {
      theme: 'light' as const,
      textSize: 'large' as const,
    };
    const prefs = buildClientPreferencesFromLocalForPersist(
      'second@example.com',
      sessionPrefs
    );
    expect(prefs?.theme).toBe('dark');
    expect(prefs?.textSize).toBe('large');
  });

  it('buildClientPreferencesFromLocalForPersist returns undefined without session on shared device', () => {
    localStorage.setItem(CLIENT_PREFERENCES_LEGACY_CLAIM_KEY, 'first@example.com');
    expect(
      buildClientPreferencesFromLocalForPersist('second@example.com', undefined)
    ).toBeUndefined();
  });
});
