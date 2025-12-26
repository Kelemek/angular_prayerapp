import { describe, it, expect } from 'vitest';
import { EMAIL_MANAGEMENT_ROUTES } from './email-management.module';

describe('Email Management Module', () => {
  it('should export EMAIL_MANAGEMENT_ROUTES', () => {
    expect(EMAIL_MANAGEMENT_ROUTES).toBeDefined();
  });

  it('should have an empty routes array', () => {
    expect(EMAIL_MANAGEMENT_ROUTES).toEqual([]);
  });

  it('should be an array', () => {
    expect(Array.isArray(EMAIL_MANAGEMENT_ROUTES)).toBe(true);
  });
});
