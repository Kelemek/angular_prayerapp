import { describe, it, expect } from 'vitest';
import { USER_MANAGEMENT_ROUTES } from './user-management.module';

describe('User Management Module', () => {
  it('should export USER_MANAGEMENT_ROUTES', () => {
    expect(USER_MANAGEMENT_ROUTES).toBeDefined();
  });

  it('should have an empty routes array', () => {
    expect(USER_MANAGEMENT_ROUTES).toEqual([]);
  });

  it('should be an array', () => {
    expect(Array.isArray(USER_MANAGEMENT_ROUTES)).toBe(true);
  });
});
