import { describe, it, expect, beforeEach } from 'vitest';
import { clearUserScopedLocalStorageOnLogout } from './user-local-storage-logout';
import { CLIENT_PREFERENCES_LEGACY_CLAIM_KEY } from './client-preferences-local';
describe('clearUserScopedLocalStorageOnLogout', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('removes client prefs, user profile, session, and per-user caches', () => {
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('textSize', 'largest');
    localStorage.setItem(CLIENT_PREFERENCES_LEGACY_CLAIM_KEY, 'a@example.com');
    localStorage.setItem('userSession', '{}');
    localStorage.setItem('prayerapp_user_first_name', 'Ada');
    localStorage.setItem('prayerapp_user_email', 'a@example.com');
    localStorage.setItem('prayers_cache', '[]');
    localStorage.setItem('read_prayers_data', '{}');
    localStorage.setItem('prayed_for_p1', new Date().toISOString());
    localStorage.setItem(
      'prayerapp_planning_center_list_a@example.com',
      '{}'
    );
    localStorage.setItem('branding_app_title', 'Church Name');

    clearUserScopedLocalStorageOnLogout('a@example.com');

    expect(localStorage.getItem('theme')).toBeNull();
    expect(localStorage.getItem('textSize')).toBeNull();
    expect(localStorage.getItem('userSession')).toBeNull();
    expect(localStorage.getItem('prayerapp_user_first_name')).toBeNull();
    expect(localStorage.getItem('prayerapp_user_email')).toBeNull();
    expect(localStorage.getItem('prayers_cache')).toBeNull();
    expect(localStorage.getItem('read_prayers_data')).toBeNull();
    expect(localStorage.getItem('prayed_for_p1')).toBeNull();
    expect(
      localStorage.getItem('prayerapp_planning_center_list_a@example.com')
    ).toBeNull();
    expect(localStorage.getItem('branding_app_title')).toBe('Church Name');
  });

});
