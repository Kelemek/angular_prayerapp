import { describe, it, expect } from 'vitest';
import { escapeEmailSubscriberIlikePattern } from './admin-email-subscribers';

describe('admin-email-subscribers', () => {
  it('escapeEmailSubscriberIlikePattern escapes ilike metacharacters', () => {
    expect(escapeEmailSubscriberIlikePattern('100%')).toBe('100\\%');
    expect(escapeEmailSubscriberIlikePattern('a_b')).toBe('a\\_b');
    expect(escapeEmailSubscriberIlikePattern('a\\b')).toBe('a\\\\b');
  });
});
