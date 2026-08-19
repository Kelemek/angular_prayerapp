import { describe, expect, it } from 'vitest';
import {
  personalPrayerSessionAction,
  userSessionEmailDistinctEqual,
} from './prayer-service-session-wire';

describe('prayer-service-session-wire', () => {
  it('compares session snapshots by email only', () => {
    expect(
      userSessionEmailDistinctEqual({ email: 'a@test.com' }, { email: 'a@test.com' })
    ).toBe(true);
    expect(
      userSessionEmailDistinctEqual({ email: 'a@test.com' }, { email: 'b@test.com' })
    ).toBe(false);
    expect(userSessionEmailDistinctEqual(null, null)).toBe(true);
  });

  it('plans load vs clear personal prayers on session', () => {
    expect(personalPrayerSessionAction({ email: 'me@test.com' })).toBe('load');
    expect(personalPrayerSessionAction(null)).toBe('clear');
    expect(personalPrayerSessionAction({ email: null })).toBe('clear');
  });
});
