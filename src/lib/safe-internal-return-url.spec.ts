import { describe, it, expect } from 'vitest';
import { groupOnlyLoginDestination, safeInternalReturnUrl } from './safe-internal-return-url';

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

describe('groupOnlyLoginDestination', () => {
  it('uses a safe group deep link when groups are enabled', () => {
    expect(
      groupOnlyLoginDestination('/?filter=groups&groupId=abc', true),
    ).toBe('/?filter=groups&groupId=abc');
  });

  it('defaults to the Group tab when returnUrl is not a group deep link', () => {
    expect(groupOnlyLoginDestination('/', true)).toBe('/?filter=groups');
  });

  it('sends users without the flag to Personal', () => {
    expect(groupOnlyLoginDestination('/?filter=groups', false)).toBe(
      '/?filter=personal',
    );
  });
});
