import { describe, it, expect } from 'vitest';
import { CONTENT_MANAGEMENT_ROUTES } from './content-management.module';

describe('Content Management Module', () => {
  it('should export CONTENT_MANAGEMENT_ROUTES', () => {
    expect(CONTENT_MANAGEMENT_ROUTES).toBeDefined();
  });

  it('should have an empty routes array', () => {
    expect(CONTENT_MANAGEMENT_ROUTES).toEqual([]);
  });

  it('should be an array', () => {
    expect(Array.isArray(CONTENT_MANAGEMENT_ROUTES)).toBe(true);
  });
});
