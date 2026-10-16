import { describe, it, expect } from 'vitest';
import { safeInternalReturnUrl } from './safe-internal-return-url';

describe('safeInternalReturnUrl', () => {
  it('allows internal paths', () => {
    expect(safeInternalReturnUrl('/admin')).toBe('/admin');
  });

  it('rejects open redirects and login loops', () => {
    expect(safeInternalReturnUrl('//evil.com')).toBe('/');
    expect(safeInternalReturnUrl('/login')).toBe('/');
    expect(safeInternalReturnUrl('https://evil.com')).toBe('/');
  });
});
