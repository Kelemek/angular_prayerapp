import { describe, expect, it, vi } from 'vitest';
import {
  MFA_AUTHENTICATED_EMAIL_STORAGE_KEY,
  resolvePrayerServiceUserEmail,
} from './prayer-service-user-email';

describe('prayer-service-user-email', () => {
  it('returns session email when available', async () => {
    const email = await resolvePrayerServiceUserEmail(async () => ({
      data: { session: { user: { email: 'session@test.com' } } },
    }));
    expect(email).toBe('session@test.com');
  });

  it('falls back to MFA localStorage email', async () => {
    const readMfa = vi.fn().mockReturnValue('mfa@test.com');
    const email = await resolvePrayerServiceUserEmail(
      async () => ({ data: { session: null } }),
      readMfa
    );
    expect(email).toBe('mfa@test.com');
    expect(readMfa).toHaveBeenCalled();
  });

  it('returns null when session and MFA missing', async () => {
    const email = await resolvePrayerServiceUserEmail(
      async () => ({ data: { session: null } }),
      () => null
    );
    expect(email).toBeNull();
  });

  it('handles getSession errors and still checks MFA', async () => {
    const readMfa = vi.fn().mockReturnValue('mfa@test.com');
    const email = await resolvePrayerServiceUserEmail(
      async () => {
        throw new Error('session fail');
      },
      readMfa
    );
    expect(email).toBe('mfa@test.com');
  });

  it('exports MFA storage key constant', () => {
    expect(MFA_AUTHENTICATED_EMAIL_STORAGE_KEY).toBe('mfa_authenticated_email');
  });
});
