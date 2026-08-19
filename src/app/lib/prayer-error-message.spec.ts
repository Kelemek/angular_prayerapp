import { describe, expect, it } from 'vitest';
import { extractSupabaseErrorMessage } from './prayer-error-message';

describe('prayer-error-message', () => {
  it('extracts message from Error', () => {
    expect(extractSupabaseErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('extracts message from Supabase-style object', () => {
    expect(extractSupabaseErrorMessage({ message: 'db fail' })).toBe('db fail');
    expect(extractSupabaseErrorMessage({ error: 'nested' })).toBe('nested');
  });

  it('falls back to JSON.stringify for unknown objects', () => {
    expect(extractSupabaseErrorMessage({ code: 500 })).toBe('{"code":500}');
  });

  it('uses fallback for non-objects', () => {
    expect(extractSupabaseErrorMessage('x', 'fallback')).toBe('fallback');
  });
});
