import { describe, it, expect } from 'vitest';
import { SETTINGS_ROUTES } from './settings.module';

describe('Settings Module', () => {
  it('should export SETTINGS_ROUTES', () => {
    expect(SETTINGS_ROUTES).toBeDefined();
  });

  it('should have an empty routes array', () => {
    expect(SETTINGS_ROUTES).toEqual([]);
  });

  it('should be an array', () => {
    expect(Array.isArray(SETTINGS_ROUTES)).toBe(true);
  });
});
