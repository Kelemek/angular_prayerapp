import { describe, expect, it } from 'vitest';
import { resolveClientPreferencesFromSubscriberRow } from './client-preferences-session';

describe('resolveClientPreferencesFromSubscriberRow', () => {
  it('returns preserved prefs without seeding', () => {
    const preserved = { theme: 'dark' as const };
    const result = resolveClientPreferencesFromSubscriberRow(
      { client_preferences: null },
      'user@example.com',
      preserved
    );
    expect(result).toEqual({ preferences: preserved, seedToDatabase: null });
  });

  it('parses valid json from row', () => {
    const result = resolveClientPreferencesFromSubscriberRow(
      { client_preferences: { theme: 'light' } },
      'user@example.com',
      undefined
    );
    expect(result.seedToDatabase).toBeNull();
    expect(result.preferences?.theme).toBe('light');
  });

  it('seeds from local when column is null', () => {
    localStorage.setItem('theme', 'dark');
    const result = resolveClientPreferencesFromSubscriberRow(
      { client_preferences: null },
      'user@example.com',
      undefined
    );
    expect(result.seedToDatabase).not.toBeNull();
    expect(result.preferences?.theme).toBe('dark');
    localStorage.clear();
  });

  it('returns undefined for invalid json without seeding', () => {
    const result = resolveClientPreferencesFromSubscriberRow(
      { client_preferences: { notAValidShape: true } },
      'user@example.com',
      undefined
    );
    expect(result).toEqual({ preferences: undefined, seedToDatabase: null });
  });
});
