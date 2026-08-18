import { describe, it, expect } from 'vitest';
import { adminErrorMessage } from './admin-error-message';

describe('adminErrorMessage', () => {
  it('reads Error.message', () => {
    expect(adminErrorMessage(new Error('boom'), 'fallback')).toBe('boom');
  });

  it('reads object message property', () => {
    expect(adminErrorMessage({ message: 'nope' }, 'fallback')).toBe('nope');
  });

  it('falls back for non-error values', () => {
    expect(adminErrorMessage('x', 'fallback')).toBe('fallback');
  });
});
