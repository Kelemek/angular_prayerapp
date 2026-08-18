import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  openEmailSubscriberDeleteConfirmation,
  openEmailSubscriberToggleConfirmation,
} from './admin-email-subscribers-confirmation-open';

vi.mock('./admin-email-subscribers-confirmation-prep', () => ({
  prepareEmailSubscriberToggleConfirmation: vi.fn(),
  prepareEmailSubscriberDeleteConfirmation: vi.fn(),
}));

import {
  prepareEmailSubscriberDeleteConfirmation,
  prepareEmailSubscriberToggleConfirmation,
} from './admin-email-subscribers-confirmation-prep';

describe('openEmailSubscriberToggleConfirmation', () => {
  const client = {} as never;
  const host = {
    openConfirmation: vi.fn(),
  };
  const onToastError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens dialog when prep succeeds', async () => {
    vi.mocked(prepareEmailSubscriberToggleConfirmation).mockResolvedValue({
      dialog: { title: 'Toggle', message: 'msg', confirmLabel: 'OK' },
      action: { kind: 'toggleActive', id: '1', currentActive: true },
    });

    await openEmailSubscriberToggleConfirmation(
      client,
      host,
      'toggleActive',
      '1',
      true,
      onToastError,
    );

    expect(host.openConfirmation).toHaveBeenCalled();
    expect(onToastError).not.toHaveBeenCalled();
  });

  it('reports toast error when prep fails', async () => {
    vi.mocked(prepareEmailSubscriberToggleConfirmation).mockRejectedValue(
      new Error('fail'),
    );

    await openEmailSubscriberToggleConfirmation(
      client,
      host,
      'toggleReceivePush',
      '1',
      false,
      onToastError,
    );

    expect(host.openConfirmation).not.toHaveBeenCalled();
    expect(onToastError).toHaveBeenCalledWith(
      'Failed to prepare push toggle action',
    );
  });
});

describe('openEmailSubscriberDeleteConfirmation', () => {
  const client = {} as never;
  const host = {
    openConfirmation: vi.fn(),
  };
  const onError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens delete confirmation when prep succeeds', async () => {
    vi.mocked(prepareEmailSubscriberDeleteConfirmation).mockResolvedValue({
      dialog: { title: 'Delete', message: 'msg', confirmLabel: 'Delete' },
      action: {
        kind: 'delete',
        id: '1',
        email: 'a@b.com',
        isAdmin: false,
      },
    });

    await openEmailSubscriberDeleteConfirmation(
      client,
      host,
      '1',
      'a@b.com',
      onError,
    );

    expect(host.openConfirmation).toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('reports error when delete prep fails', async () => {
    vi.mocked(prepareEmailSubscriberDeleteConfirmation).mockRejectedValue(
      new Error('db'),
    );

    await openEmailSubscriberDeleteConfirmation(
      client,
      host,
      '1',
      'a@b.com',
      onError,
    );

    expect(onError).toHaveBeenCalledWith('db');
  });
});
