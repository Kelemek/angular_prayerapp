import { describe, it, expect } from 'vitest';
import {
  countActivePrayerTypes,
  formatPrayerTypeDate,
} from './admin-prayer-types-manager';

describe('admin-prayer-types-manager', () => {
  it('formatPrayerTypeDate returns locale date string', () => {
    expect(formatPrayerTypeDate('2024-06-15T12:00:00.000Z')).toBeTruthy();
  });

  it('countActivePrayerTypes counts active rows', () => {
    const types = [
      { id: '1', name: 'A', display_order: 0, is_active: true, include_in_booklet: false, created_at: '', updated_at: '' },
      { id: '2', name: 'B', display_order: 1, is_active: false, include_in_booklet: false, created_at: '', updated_at: '' },
    ];
    expect(countActivePrayerTypes(types)).toBe(1);
  });
});
