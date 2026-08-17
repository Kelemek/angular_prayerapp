import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EmailSubscriberRow } from './admin-email-subscribers';
import {
  applyEmailSubscriberConfirmation,
  emailSubscriberConfirmationApplyErrorFeedback,
} from './admin-email-subscribers-confirmation-apply';

vi.mock('./admin-email-subscribers-commands', () => ({
  commandSetEmailSubscriberActive: vi.fn().mockResolvedValue(undefined),
  commandSetEmailSubscriberReceivePush: vi.fn().mockResolvedValue(undefined),
  commandSetEmailSubscriberBlocked: vi.fn().mockResolvedValue(undefined),
  commandDeleteEmailSubscriber: vi.fn().mockResolvedValue(undefined),
  commandUnsubscribeAdminEmailSubscriber: vi.fn().mockResolvedValue(undefined),
}));

const baseRow: EmailSubscriberRow = {
  id: '1',
  name: 'Test',
  email: 'test@example.com',
  is_active: true,
  is_blocked: false,
  is_admin: false,
  receive_push: true,
  created_at: '2024-01-01',
};

describe('applyEmailSubscriberConfirmation', () => {
  const client = {} as never;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deactivates subscriber and patches list', async () => {
    const result = await applyEmailSubscriberConfirmation(
      client,
      { kind: 'toggleActive', id: '1', currentActive: true },
      {
        allSubscribers: [baseRow],
        totalActiveCount: 1,
        totalItems: 1,
        currentPage: 1,
        pageSize: 10,
        csvSuccess: null,
      },
    );

    expect(result.allSubscribers[0].is_active).toBe(false);
    expect(result.totalActiveCount).toBe(0);
    expect(result.toastSuccess).toBe('Subscriber deactivated');
    expect(result.needsLoadPageData).toBe(false);
  });

  it('removes non-admin subscriber and updates pagination', async () => {
    const result = await applyEmailSubscriberConfirmation(
      client,
      { kind: 'delete', id: '1', email: 'test@example.com', isAdmin: false },
      {
        allSubscribers: [baseRow],
        totalActiveCount: 1,
        totalItems: 1,
        currentPage: 1,
        pageSize: 10,
        csvSuccess: null,
      },
    );

    expect(result.allSubscribers).toEqual([]);
    expect(result.totalItems).toBe(0);
    expect(result.toastSuccess).toBe('Subscriber removed');
    expect(result.needsLoadPageData).toBe(true);
  });

  it('unsubscribes admin without removing row', async () => {
    const result = await applyEmailSubscriberConfirmation(
      client,
      {
        kind: 'delete',
        id: '1',
        email: 'admin@example.com',
        isAdmin: true,
      },
      {
        allSubscribers: [{ ...baseRow, is_admin: true, email: 'admin@example.com' }],
        totalActiveCount: 1,
        totalItems: 1,
        currentPage: 1,
        pageSize: 10,
        csvSuccess: null,
      },
    );

    expect(result.allSubscribers[0].is_active).toBe(false);
    expect(result.csvSuccess).toContain('admin@example.com');
    expect(result.needsLoadPageData).toBe(true);
    expect(result.toastSuccess).toBeUndefined();
  });
});

describe('emailSubscriberConfirmationApplyErrorFeedback', () => {
  it('maps delete errors to banner message', () => {
    const feedback = emailSubscriberConfirmationApplyErrorFeedback(
      { kind: 'delete', id: '1', email: 'a@b.com', isAdmin: false },
      new Error('nope'),
    );
    expect(feedback.error).toBe('nope');
  });

  it('maps toggle errors to toast messages', () => {
    expect(
      emailSubscriberConfirmationApplyErrorFeedback(
        { kind: 'toggleActive', id: '1', currentActive: true },
        new Error('nope'),
      ).toastError,
    ).toBe('Failed to update subscriber status');
  });
});
