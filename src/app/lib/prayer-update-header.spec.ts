import { describe, it, expect } from 'vitest';
import {
  formatPrayerUpdateDisplayDate,
  formatPrayerCardShortDate,
  getPrayerUpdateAuthorDisplay,
  getPrayerUpdateHeaderLabel,
  getPrayerUpdateHeaderLabelClasses,
} from './prayer-update-header';

describe('prayer-update-header', () => {
  it('getPrayerUpdateHeaderLabel switches on is_answered', () => {
    expect(getPrayerUpdateHeaderLabel({ is_answered: false })).toBe('Update');
    expect(getPrayerUpdateHeaderLabel({ is_answered: true })).toBe('Answered');
  });

  it('getPrayerUpdateHeaderLabelClasses uses green when answered', () => {
    expect(getPrayerUpdateHeaderLabelClasses({ is_answered: false })).toContain(
      'text-gray-600'
    );
    expect(getPrayerUpdateHeaderLabelClasses({ is_answered: true })).toContain(
      'text-[#39704D]'
    );
  });

  it('formatPrayerUpdateDisplayDate prefers updated_at', () => {
    const formatted = formatPrayerUpdateDisplayDate({
      created_at: '2024-01-01T12:00:00Z',
      updated_at: '2024-06-15T12:00:00Z',
    });
    expect(formatted).toContain('2024');
    expect(formatted).toContain('Jun');
  });

  it('formatPrayerCardShortDate returns readable string', () => {
    const out = formatPrayerCardShortDate('2020-01-02T03:04:00Z');
    expect(typeof out).toBe('string');
    expect(out.length).toBeGreaterThan(0);
    expect(out).toContain('2020');
  });

  it('getPrayerUpdateAuthorDisplay respects anonymity', () => {
    expect(
      getPrayerUpdateAuthorDisplay({ author: 'Mark', is_anonymous: true })
    ).toBe('Anonymous');
    expect(
      getPrayerUpdateAuthorDisplay({ author: 'Mark', is_anonymous: false })
    ).toBe('Mark');
  });
});
