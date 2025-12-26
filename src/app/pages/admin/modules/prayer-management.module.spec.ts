import { describe, it, expect } from 'vitest';
import { PRAYER_MANAGEMENT_ROUTES } from './prayer-management.module';

describe('Prayer Management Module', () => {
  it('should export PRAYER_MANAGEMENT_ROUTES', () => {
    expect(PRAYER_MANAGEMENT_ROUTES).toBeDefined();
  });

  it('should have an empty routes array', () => {
    expect(PRAYER_MANAGEMENT_ROUTES).toEqual([]);
  });

  it('should be an array', () => {
    expect(Array.isArray(PRAYER_MANAGEMENT_ROUTES)).toBe(true);
  });
});
