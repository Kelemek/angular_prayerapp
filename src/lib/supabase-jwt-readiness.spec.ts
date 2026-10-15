import { describe, expect, it, vi } from 'vitest';
import {
  hasSupabaseJwtSession,
  jwtEmailFromSession,
  supabaseDataAccessReady,
} from './supabase-jwt-readiness';

describe('supabase-jwt-readiness', () => {
  describe('jwtEmailFromSession', () => {
    it('returns normalized email when present', () => {
      expect(
        jwtEmailFromSession({ user: { email: 'User@Example.com' } })
      ).toBe('user@example.com');
    });

    it('returns empty string when session is missing', () => {
      expect(jwtEmailFromSession(null)).toBe('');
      expect(jwtEmailFromSession(undefined)).toBe('');
    });
  });

  describe('supabaseDataAccessReady', () => {
    it('is ready when logged out', () => {
      expect(supabaseDataAccessReady(false, false)).toBe(true);
    });

    it('requires JWT when authenticated', () => {
      expect(supabaseDataAccessReady(true, false)).toBe(false);
      expect(supabaseDataAccessReady(true, true)).toBe(true);
    });
  });

  describe('hasSupabaseJwtSession', () => {
    it('returns true when session has email', async () => {
      const client = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { email: 'a@b.com' } } },
          }),
        },
      };
      await expect(hasSupabaseJwtSession(client as never)).resolves.toBe(true);
    });

    it('returns false when session has no email', async () => {
      const client = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: {} } },
          }),
        },
      };
      await expect(hasSupabaseJwtSession(client as never)).resolves.toBe(false);
    });
  });
});
