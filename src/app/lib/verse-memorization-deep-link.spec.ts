import { describe, expect, it, vi } from 'vitest';
import { applyVerseMemorizationDeepLink } from './verse-memorization-deep-link';

describe('applyVerseMemorizationDeepLink', () => {
  it('consumes pending reference and translation, strips params, and begins memorization', () => {
    const consumePending = vi.fn(() => ({
      reference: 'John 3:16',
      translation: 'esv',
    }));
    const stripQueryParams = vi.fn();
    const beginFromCard = vi.fn();

    applyVerseMemorizationDeepLink({
      consumePending,
      stripQueryParams,
      beginFromCard,
    });

    expect(consumePending).toHaveBeenCalled();
    expect(stripQueryParams).toHaveBeenCalled();
    expect(beginFromCard).toHaveBeenCalledWith('John 3:16', 'esv');
  });

  it('consumes pending reference without translation', () => {
    const beginFromCard = vi.fn();

    applyVerseMemorizationDeepLink({
      consumePending: () => ({ reference: 'John 3:16' }),
      stripQueryParams: vi.fn(),
      beginFromCard,
    });

    expect(beginFromCard).toHaveBeenCalledWith('John 3:16', undefined);
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
