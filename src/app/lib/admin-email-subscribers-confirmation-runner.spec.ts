import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runEmailSubscriberConfirmationAction } from './admin-email-subscribers-confirmation-runner';

vi.mock('./admin-email-subscribers-confirmation-apply', () => ({
  applyEmailSubscriberConfirmation: vi.fn(),
  emailSubscriberConfirmationApplyErrorFeedback: vi.fn(),
}));

import {
  applyEmailSubscriberConfirmation,
  emailSubscriberConfirmationApplyErrorFeedback,
} from './admin-email-subscribers-confirmation-apply';

describe('runEmailSubscriberConfirmationAction', () => {
  const client = {} as never;
  const applyInput = {
    allSubscribers: [],
    totalActiveCount: 0,
    totalItems: 0,
    currentPage: 1,
    pageSize: 10,
    csvSuccess: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies result and loads page when needed', async () => {
    vi.mocked(applyEmailSubscriberConfirmation).mockResolvedValue({
      allSubscribers: [],
      totalActiveCount: 0,
      totalItems: 0,
      currentPage: 1,
      csvSuccess: null,
      toastSuccess: 'done',
      needsLoadPageData: true,
    });

    const applyResult = vi.fn();
    const loadPageData = vi.fn();

    await runEmailSubscriberConfirmationAction(
      { kind: 'toggleActive', id: '1', currentActive: true },
      {
        getClient: () => client,
        getApplyInput: () => applyInput,
        applyResult,
        onApplyError: vi.fn(),
        loadPageData,
      },
    );

    expect(applyResult).toHaveBeenCalled();
    expect(loadPageData).toHaveBeenCalled();
  });

  it('routes apply errors through onApplyError', async () => {
    vi.mocked(applyEmailSubscriberConfirmation).mockRejectedValue(
      new Error('fail'),
    );
    vi.mocked(emailSubscriberConfirmationApplyErrorFeedback).mockReturnValue({
      toastError: 'Failed to update subscriber status',
    });

    const onApplyError = vi.fn();

    await runEmailSubscriberConfirmationAction(
      { kind: 'toggleActive', id: '1', currentActive: true },
      {
        getClient: () => client,
        getApplyInput: () => applyInput,
        applyResult: vi.fn(),
        onApplyError,
        loadPageData: vi.fn(),
      },
    );

    expect(onApplyError).toHaveBeenCalledWith({
      toastError: 'Failed to update subscriber status',
    });
  });
});
