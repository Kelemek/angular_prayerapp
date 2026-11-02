import { describe, expect, it, vi } from 'vitest';
import {
  addAdminManualEmailSubscriberIfNew,
  buildAdminManualEmailSubscriberInsertRow,
  ensureAdminManualEmailSubscriber,
  isUniqueEmailSubscriberViolation,
  normalizeAdminManualSubscriberEmail,
  validateAdminManualSubscriberEmail,
} from './admin-email-subscriber-manual-add';

describe('admin-email-subscriber-manual-add', () => {
  it('normalizes email case-insensitively', () => {
    expect(normalizeAdminManualSubscriberEmail('  Jane@Example.COM ')).toBe('jane@example.com');
  });

  it('validates email format', () => {
    expect(validateAdminManualSubscriberEmail('bad')).toBe(
      'Please enter a valid email address',
    );
    expect(validateAdminManualSubscriberEmail('ok@example.com')).toBeNull();
  });

  it('builds insert row matching admin manual add defaults', () => {
    expect(
      buildAdminManualEmailSubscriberInsertRow('Jane Doe', 'jane@example.com', {
        inPlanningCenter: true,
        planningCenterCheckedAt: '2026-01-01T00:00:00.000Z',
      }),
    ).toEqual({
      name: 'Jane Doe',
      email: 'jane@example.com',
      is_active: true,
      is_admin: false,
      receive_admin_emails: false,
      in_planning_center: true,
      planning_center_checked_at: '2026-01-01T00:00:00.000Z',
    });
  });

  it('ensureAdminManualEmailSubscriber inserts when missing', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
        insert,
      })),
    };

    const result = await ensureAdminManualEmailSubscriber(
      client as never,
      'Jane Doe',
      'Jane@Example.com',
      vi.fn().mockResolvedValue({ inPlanningCenter: false, planningCenterCheckedAt: null }),
    );

    expect(result).toEqual({ ok: true, created: true, normalizedEmail: 'jane@example.com' });
    expect(insert).toHaveBeenCalled();
  });

  it('ensureAdminManualEmailSubscriber skips insert when subscriber exists', async () => {
    const insert = vi.fn();
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'sub-1' }, error: null }),
          })),
        })),
        insert,
      })),
    };

    const result = await ensureAdminManualEmailSubscriber(
      client as never,
      'Jane Doe',
      'jane@example.com',
      vi.fn(),
    );

    expect(result).toEqual({ ok: true, created: false, normalizedEmail: 'jane@example.com' });
    expect(insert).not.toHaveBeenCalled();
  });

  it('ensureAdminManualEmailSubscriber treats unique violation as existing', async () => {
    const insert = vi.fn().mockResolvedValue({ error: { code: '23505' } });
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
        insert,
      })),
    };

    const result = await ensureAdminManualEmailSubscriber(
      client as never,
      'Jane Doe',
      'jane@example.com',
      vi.fn().mockResolvedValue({ inPlanningCenter: null, planningCenterCheckedAt: null }),
    );

    expect(result).toEqual({ ok: true, created: false, normalizedEmail: 'jane@example.com' });
  });

  it('addAdminManualEmailSubscriberIfNew rejects duplicate', async () => {
    const client = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn().mockResolvedValue({ data: { id: 'sub-1' }, error: null }),
          })),
        })),
        insert: vi.fn(),
      })),
    };

    const result = await addAdminManualEmailSubscriberIfNew(
      client as never,
      'Jane',
      'jane@example.com',
      vi.fn(),
    );

    expect(result).toEqual({ ok: false, error: 'This email address is already subscribed' });
  });

  it('isUniqueEmailSubscriberViolation detects postgres unique errors', () => {
    expect(isUniqueEmailSubscriberViolation({ code: '23505' })).toBe(true);
    expect(isUniqueEmailSubscriberViolation({ code: '42P01' })).toBe(false);
  });
});
