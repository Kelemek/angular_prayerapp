import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ChangeDetectorRef } from '@angular/core';
import {
  AdminSubscriberEmailBroadcastComponent,
  stripAdminBroadcastHtmlFences,
} from './admin-subscriber-email-broadcast.component';
import { EmailNotificationService } from '../../services/email-notification.service';
import { ToastService } from '../../services/toast.service';

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('AdminSubscriberEmailBroadcastComponent', () => {
  let mockEmail: {
    getManualBroadcastRecipientCount: ReturnType<typeof vi.fn>;
    queueAdminManualBroadcastToSubscribers: ReturnType<typeof vi.fn>;
  };
  let mockToast: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    info: ReturnType<typeof vi.fn>;
  };
  let mockCdr: { markForCheck: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    mockEmail = {
      getManualBroadcastRecipientCount: vi.fn().mockResolvedValue(3),
      queueAdminManualBroadcastToSubscribers: vi.fn().mockResolvedValue({ queued: 2 }),
    };
    mockToast = {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    };
    mockCdr = {
      markForCheck: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createComponent(): AdminSubscriberEmailBroadcastComponent {
    return new AdminSubscriberEmailBroadcastComponent(
      mockEmail as unknown as EmailNotificationService,
      mockToast as unknown as ToastService,
      mockCdr as unknown as ChangeDetectorRef
    );
  }

  it('should create', () => {
    expect(createComponent()).toBeTruthy();
  });

  describe('ngOnInit / loadRecipientCount', () => {
    it('loads recipient count on init', async () => {
      mockEmail.getManualBroadcastRecipientCount.mockResolvedValue(42);
      const component = createComponent();
      component.ngOnInit();
      await flushMicrotasks();

      expect(mockEmail.getManualBroadcastRecipientCount).toHaveBeenCalledTimes(1);
      expect(component.recipientCount).toBe(42);
      expect(component.recipientCountLoading).toBe(false);
      expect(mockToast.error).not.toHaveBeenCalled();
    });

    it('handles load failure with toast and null count', async () => {
      const err = new Error('network');
      mockEmail.getManualBroadcastRecipientCount.mockRejectedValue(err);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const component = createComponent();
      component.ngOnInit();
      await flushMicrotasks();

      expect(component.recipientCount).toBeNull();
      expect(component.recipientCountLoading).toBe(false);
      expect(mockToast.error).toHaveBeenCalledWith('Could not load subscriber count');
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('toggleSection', () => {
    it('toggles expanded state and marks for check', () => {
      const component = createComponent();
      expect(component.sectionExpanded).toBe(false);
      component.toggleSection();
      expect(component.sectionExpanded).toBe(true);
      expect(mockCdr.markForCheck).toHaveBeenCalled();
    });

    it('reloads recipient count when expanding with null count and not loading', async () => {
      mockEmail.getManualBroadcastRecipientCount.mockResolvedValue(7);
      const component = createComponent();
      component.ngOnInit();
      await flushMicrotasks();
      expect(mockEmail.getManualBroadcastRecipientCount).toHaveBeenCalledTimes(1);

      component.sectionExpanded = false;
      component.recipientCount = null;
      component.recipientCountLoading = false;

      component.toggleSection();
      await flushMicrotasks();

      expect(component.sectionExpanded).toBe(true);
      expect(mockEmail.getManualBroadcastRecipientCount).toHaveBeenCalledTimes(2);
      expect(component.recipientCount).toBe(7);
    });

    it('does not reload count when expanding after successful load', async () => {
      mockEmail.getManualBroadcastRecipientCount.mockResolvedValue(5);
      const component = createComponent();
      component.ngOnInit();
      await flushMicrotasks();

      component.sectionExpanded = false;
      component.toggleSection();
      await flushMicrotasks();

      expect(mockEmail.getManualBroadcastRecipientCount).toHaveBeenCalledTimes(1);
    });
  });

  describe('canSend', () => {
    it('is false when subject or body is empty', () => {
      const component = createComponent();
      component.bodyFormat = 'markdown';
      component.subject = '';
      component.bodyMarkdown = 'x';
      expect(component.canSend).toBe(false);

      component.subject = 'Hi';
      component.bodyMarkdown = '   ';
      expect(component.canSend).toBe(false);
    });

    it('is true when subject and Markdown body have non-whitespace content', () => {
      const component = createComponent();
      component.bodyFormat = 'markdown';
      component.subject = ' Hello ';
      component.bodyMarkdown = ' Body ';
      expect(component.canSend).toBe(true);
    });

    it('uses HTML body when format is html', () => {
      const component = createComponent();
      component.bodyFormat = 'html';
      component.subject = 'Hi';
      component.bodyHtml = '';
      component.bodyMarkdown = 'ignored markdown';
      expect(component.canSend).toBe(false);

      component.bodyHtml = '<p>Hello</p>';
      expect(component.canSend).toBe(true);
    });
  });

  describe('setBodyFormat', () => {
    it('switches format and marks for check', () => {
      const component = createComponent();
      expect(component.bodyFormat).toBe('html');
      component.setBodyFormat('markdown');
      expect(component.bodyFormat).toBe('markdown');
      expect(mockCdr.markForCheck).toHaveBeenCalled();
    });
  });

  describe('onSendClick', () => {
    it('does nothing when cannot send', () => {
      const component = createComponent();
      component.subject = '';
      component.bodyHtml = 'x';
      component.recipientCount = 5;

      component.onSendClick();
      expect(component.showConfirmDialog).toBe(false);
    });

    it('does nothing when recipientCount is 0', () => {
      const component = createComponent();
      component.subject = 'Subj';
      component.bodyHtml = '<p>Body</p>';
      component.recipientCount = 0;

      component.onSendClick();
      expect(component.showConfirmDialog).toBe(false);
    });

    it('does nothing while sending', () => {
      const component = createComponent();
      component.subject = 'Subj';
      component.bodyHtml = '<p>Body</p>';
      component.recipientCount = 2;
      component.sending = true;

      component.onSendClick();
      expect(component.showConfirmDialog).toBe(false);
    });

    it('opens confirmation when can send and recipients exist', () => {
      const component = createComponent();
      component.bodyFormat = 'markdown';
      component.subject = 'Subj';
      component.bodyMarkdown = 'Body';
      component.recipientCount = 3;

      component.onSendClick();
      expect(component.showConfirmDialog).toBe(true);
    });

    it('opens confirmation for HTML body', () => {
      const component = createComponent();
      component.bodyFormat = 'html';
      component.subject = 'Subj';
      component.bodyHtml = '<p>Hi</p>';
      component.recipientCount = 3;

      component.onSendClick();
      expect(component.showConfirmDialog).toBe(true);
    });
  });

  describe('onCancelSend', () => {
    it('closes the confirmation dialog', () => {
      const component = createComponent();
      component.showConfirmDialog = true;

      component.onCancelSend();
      expect(component.showConfirmDialog).toBe(false);
    });
  });

  describe('onConfirmSend', () => {
    it('does not queue when canSend becomes false', async () => {
      const component = createComponent();
      component.subject = '';
      component.bodyMarkdown = '';

      await component.onConfirmSend();

      expect(mockEmail.queueAdminManualBroadcastToSubscribers).not.toHaveBeenCalled();
      expect(component.sending).toBe(false);
    });

    it('shows info toast when queued is 0', async () => {
      mockEmail.queueAdminManualBroadcastToSubscribers.mockResolvedValue({ queued: 0 });
      const component = createComponent();
      component.bodyFormat = 'markdown';
      component.subject = 'Hi';
      component.bodyMarkdown = 'There';

      await component.onConfirmSend();

      expect(mockToast.info).toHaveBeenCalledWith(
        'No subscribers to email (non-blocked list is empty).'
      );
      expect(mockToast.success).not.toHaveBeenCalled();
      expect(component.subject).toBe('Hi');
      expect(component.bodyMarkdown).toBe('There');
      expect(mockEmail.getManualBroadcastRecipientCount.mock.calls.length).toBeGreaterThanOrEqual(1);
    });

    it('shows success, clears fields, and refreshes count when queued > 0', async () => {
      mockEmail.queueAdminManualBroadcastToSubscribers.mockResolvedValue({ queued: 5 });
      mockEmail.getManualBroadcastRecipientCount.mockResolvedValue(10);

      const component = createComponent();
      component.ngOnInit();
      await flushMicrotasks();

      component.bodyFormat = 'markdown';
      component.subject = 'News';
      component.bodyMarkdown = 'Update';

      await component.onConfirmSend();

      expect(mockEmail.queueAdminManualBroadcastToSubscribers).toHaveBeenCalledWith({
        subject: 'News',
        bodyMarkdown: 'Update',
      });
      expect(mockToast.success).toHaveBeenCalledWith(
        'Queued 5 email(s). The processor will send them one at a time.'
      );
      expect(component.subject).toBe('');
      expect(component.bodyMarkdown).toBe('');
      expect(component.sending).toBe(false);
      expect(component.recipientCount).toBe(10);
    });

    it('strips a chat preamble and html fence before queueing pasted HTML', async () => {
      mockEmail.queueAdminManualBroadcastToSubscribers.mockResolvedValue({ queued: 2 });
      const component = createComponent();
      component.bodyFormat = 'html';
      component.subject = 'Groups';
      component.bodyHtml =
        'The block below is the whole email.\n```html\n<table><tr><td>Hi</td></tr></table>\n```\n';

      expect(component.showHtmlFenceWarning).toBe(true);
      await component.onConfirmSend();

      expect(mockEmail.queueAdminManualBroadcastToSubscribers).toHaveBeenCalledWith({
        subject: 'Groups',
        bodyHtml: '<table><tr><td>Hi</td></tr></table>',
      });
    });

    it('warns on a bare code fence and still queues the paste', async () => {
      mockEmail.queueAdminManualBroadcastToSubscribers.mockResolvedValue({ queued: 1 });
      const component = createComponent();
      component.bodyFormat = 'html';
      component.subject = 'Note';
      component.bodyHtml = '<p>See ``` this</p>';

      expect(component.showHtmlFenceWarning).toBe(true);
      expect(stripAdminBroadcastHtmlFences(component.bodyHtml)).toBe('<p>See ``` this</p>');
      await component.onConfirmSend();

      expect(mockEmail.queueAdminManualBroadcastToSubscribers).toHaveBeenCalledWith({
        subject: 'Note',
        bodyHtml: '<p>See ``` this</p>',
      });
    });

    it('queues HTML body when format is html', async () => {
      mockEmail.queueAdminManualBroadcastToSubscribers.mockResolvedValue({ queued: 2 });
      const component = createComponent();
      component.bodyFormat = 'html';
      component.subject = 'Promo';
      component.bodyHtml = '<p><strong>Hello</strong></p>';
      component.bodyMarkdown = 'should not send';

      await component.onConfirmSend();

      expect(mockEmail.queueAdminManualBroadcastToSubscribers).toHaveBeenCalledWith({
        subject: 'Promo',
        bodyHtml: '<p><strong>Hello</strong></p>',
      });
      expect(component.bodyHtml).toBe('');
    });

    it('shows error toast on queue failure', async () => {
      mockEmail.queueAdminManualBroadcastToSubscribers.mockRejectedValue(new Error('queue full'));

      const component = createComponent();
      component.bodyFormat = 'html';
      component.subject = 'S';
      component.bodyHtml = '<p>B</p>';

      await component.onConfirmSend();

      expect(mockToast.error).toHaveBeenCalledWith('queue full');
      expect(component.sending).toBe(false);
    });

    it('uses generic message when error is not an Error instance', async () => {
      mockEmail.queueAdminManualBroadcastToSubscribers.mockRejectedValue('bad');

      const component = createComponent();
      component.bodyFormat = 'html';
      component.subject = 'S';
      component.bodyHtml = '<p>B</p>';

      await component.onConfirmSend();

      expect(mockToast.error).toHaveBeenCalledWith('Failed to queue emails');
    });
  });

});
