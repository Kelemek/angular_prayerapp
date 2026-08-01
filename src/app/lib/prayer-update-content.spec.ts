import { describe, it, expect } from 'vitest';
import {
  MARK_AS_ANSWERED_DEFAULT_UPDATE_CONTENT,
  resolvePrayerUpdateContent,
} from './prayer-update-content';

describe('resolvePrayerUpdateContent', () => {
  it('returns trimmed markdown when plain text is present', () => {
    expect(resolvePrayerUpdateContent('  test update  ', false)).toBe('test update');
  });

  it('returns default text when marking answered with empty body', () => {
    expect(resolvePrayerUpdateContent('', true)).toBe(
      MARK_AS_ANSWERED_DEFAULT_UPDATE_CONTENT
    );
  });

  it('returns empty string when body is empty and not marking answered', () => {
    expect(resolvePrayerUpdateContent('   ', false)).toBe('');
  });

  it('returns empty string for markdown-only formatting without plain text', () => {
    expect(resolvePrayerUpdateContent('****', false)).toBe('');
  });

  it('preserves image-only markdown when marking answered', () => {
    expect(
      resolvePrayerUpdateContent('![](https://example.com/a.png)', true)
    ).toBe('![](https://example.com/a.png)');
  });

  it('preserves image-only markdown without marking answered', () => {
    expect(
      resolvePrayerUpdateContent('![](https://example.com/a.png)', false)
    ).toBe('![](https://example.com/a.png)');
  });
});
