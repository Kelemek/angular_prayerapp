import { describe, it, expect } from 'vitest';
import { TOOLS_ROUTES } from './tools.module';

describe('Tools Module', () => {
  it('should export TOOLS_ROUTES', () => {
    expect(TOOLS_ROUTES).toBeDefined();
  });

  it('should have an empty routes array', () => {
    expect(TOOLS_ROUTES).toEqual([]);
  });

  it('should be an array', () => {
    expect(Array.isArray(TOOLS_ROUTES)).toBe(true);
  });
});
