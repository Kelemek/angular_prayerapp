import { describe, expect, it, vi } from 'vitest';
import { applyVerseMemorizationDeepLink } from './verse-memorization-deep-link';

describe('applyVerseMemorizationDeepLink', () => {
  it('consumes pending reference, strips params, and begins memorization', () => {
    const consumePending = vi.fn(() => ({ reference: 'John 3:16' }));
    const stripQueryParams = vi.fn();
    const beginFromCard = vi.fn();

    applyVerseMemorizationDeepLink({
      consumePending,
      stripQueryParams,
      beginFromCard,
    });

    expect(consumePending).toHaveBeenCalled();
    expect(stripQueryParams).toHaveBeenCalled();
    expect(beginFromCard).toHaveBeenCalledWith('John 3:16');
  });

  it('does nothing when there is no pending reference', () => {
    const stripQueryParams = vi.fn();
    const beginFromCard = vi.fn();

    applyVerseMemorizationDeepLink({
      consumePending: () => null,
      stripQueryParams,
      beginFromCard,
    });

    expect(stripQueryParams).not.toHaveBeenCalled();
    expect(beginFromCard).not.toHaveBeenCalled();
  });
});
