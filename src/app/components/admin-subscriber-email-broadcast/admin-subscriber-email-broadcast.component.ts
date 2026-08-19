import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnInit,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EmailNotificationService } from '../../services/email-notification.service';
import { ToastService } from '../../services/toast.service';
import { RichTextEditorComponent } from '../rich-text-editor/rich-text-editor.component';
import { ConfirmationDialogComponent } from '../confirmation-dialog/confirmation-dialog.component';

export type AdminBroadcastBodyFormat = 'html' | 'markdown';

@Component({
  selector: 'app-admin-subscriber-email-broadcast',
  standalone: true,
  imports: [FormsModule, RichTextEditorComponent, ConfirmationDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="mb-4 bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 transition-colors dark:hover:bg-gray-700/40"
      [class.cursor-pointer]="!sectionExpanded"
      (click)="!sectionExpanded && toggleSection()"
    >
      <button
        type="button"
        id="admin-subscriber-email-broadcast-trigger"
        class="admin-settings-collapsible-trigger cursor-pointer w-full flex min-h-12 items-center justify-between gap-2 text-left rounded-lg -mx-1 px-1 py-0.5 -my-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800"
        (click)="toggleSection(); $event.stopPropagation()"
        [attr.aria-expanded]="sectionExpanded"
        aria-controls="admin-subscriber-email-broadcast-panel"
      >
        <span class="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 min-w-0">
          <svg
            class="text-blue-600 dark:text-blue-400 shrink-0"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path
              d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"
            ></path>
            <path d="m21.854 2.147-10.94 10.939"></path>
          </svg>
          Send email to all subscribers
        </span>
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="shrink-0 text-gray-500 dark:text-gray-400 transition-transform duration-200"
          [class.rotate-180]="sectionExpanded"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      @if (sectionExpanded) {
        <div
          id="admin-subscriber-email-broadcast-panel"
          role="region"
          aria-labelledby="admin-subscriber-email-broadcast-trigger"
          class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4"
          (click)="$event.stopPropagation()"
        >
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Sends one queued email per address (same pipeline as prayer/update notifications). Recipients are all
            <strong class="font-medium text-gray-800 dark:text-gray-200">non-blocked</strong> rows in Email Subscribers,
            including people who turned off mass-email. The address configured under
            <strong class="font-medium text-gray-800 dark:text-gray-200">Security → Test Account</strong> is excluded
            when set.
          </p>

          @if (recipientCountLoading) {
            <p class="text-sm text-gray-500 dark:text-gray-400">Loading recipient count…</p>
          } @else if (recipientCount !== null) {
            <p class="text-sm text-gray-700 dark:text-gray-300">
              <span class="font-medium">{{ recipientCount }}</span>
              recipient{{ recipientCount === 1 ? '' : 's' }} will be queued.
            </p>
          }

          <div>
            <label for="admin-broadcast-subject" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >Subject</label
            >
            <input
              id="admin-broadcast-subject"
              type="text"
              name="adminBroadcastSubject"
              [(ngModel)]="subject"
              [disabled]="sending"
              maxlength="998"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-inset-surface text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autocomplete="off"
            />
          </div>

          <div>
            <span class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" id="admin-broadcast-format-label"
              >Message format</span
            >
            <div
              class="inline-flex rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden"
              role="group"
              aria-labelledby="admin-broadcast-format-label"
            >
              <button
                type="button"
                class="px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                [class.bg-blue-600]="bodyFormat === 'html'"
                [class.text-white]="bodyFormat === 'html'"
                [class.bg-white]="bodyFormat !== 'html'"
                [class.dark:bg-gray-700/60]="bodyFormat !== 'html'"
                [class.text-gray-800]="bodyFormat !== 'html'"
                [class.dark:text-gray-100]="bodyFormat !== 'html'"
                [disabled]="sending"
                (click)="setBodyFormat('html')"
              >
                HTML paste
              </button>
              <button
                type="button"
                class="px-3 py-1.5 text-sm font-medium border-l border-gray-300 dark:border-gray-600 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                [class.bg-blue-600]="bodyFormat === 'markdown'"
                [class.text-white]="bodyFormat === 'markdown'"
                [class.bg-white]="bodyFormat !== 'markdown'"
                [class.dark:bg-gray-700/60]="bodyFormat !== 'markdown'"
                [class.text-gray-800]="bodyFormat !== 'markdown'"
                [class.dark:text-gray-100]="bodyFormat !== 'markdown'"
                [disabled]="sending"
                (click)="setBodyFormat('markdown')"
              >
                Rich text
              </button>
            </div>
            <p class="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
              @if (bodyFormat === 'html') {
                Paste the companion HTML from a marketing doc (screenshots keep working). Unsafe tags are stripped on send.
              } @else {
                Use the toolbar for short messages. Prefer <strong class="font-medium">HTML paste</strong> for emails with images.
              }
            </p>
          </div>

          <div>
            <label
              class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              [attr.for]="bodyFormat === 'html' ? 'admin-broadcast-body-html' : null"
              >Message</label
            >
            @if (bodyFormat === 'html') {
              <textarea
                id="admin-broadcast-body-html"
                name="adminBroadcastBodyHtml"
                [(ngModel)]="bodyHtml"
                [disabled]="sending"
                rows="16"
                spellcheck="false"
                placeholder="Paste HTML here…"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-inset-surface text-gray-900 dark:text-gray-100 font-mono text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Broadcast message HTML"
              ></textarea>
            } @else {
              <app-rich-text-editor
                [(ngModel)]="bodyMarkdown"
                name="adminBroadcastBody"
                [disabled]="sending"
                placeholder="Write your message…"
                minHeight="12rem"
                ariaLabel="Broadcast message body"
              ></app-rich-text-editor>
            }
          </div>

          <div class="flex flex-wrap items-center gap-3 justify-end pt-2">
            <button
              type="button"
              (click)="onSendClick()"
              [disabled]="!canSend || sending || recipientCount === 0"
              class="inline-flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              @if (sending) {
                <span class="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true"></span>
              }
              {{ sending ? 'Sending…' : 'Send' }}
            </button>
          </div>
        </div>
      }
    </div>

    @if (showConfirmDialog) {
      <app-confirmation-dialog
        title="Send to all non-blocked subscribers?"
        [message]="confirmMessage"
        [details]="confirmDetails"
        [isDangerous]="true"
        confirmText="Queue emails"
        (confirm)="onConfirmSend()"
        (cancel)="onCancelSend()"
      ></app-confirmation-dialog>
    }
  `,
})
export class AdminSubscriberEmailBroadcastComponent implements OnInit {
  @ViewChild(RichTextEditorComponent) richTextEditor?: RichTextEditorComponent;

  sectionExpanded = false;
  subject = '';
  /** Default HTML for marketing / screenshot emails; Rich text still available. */
  bodyFormat: AdminBroadcastBodyFormat = 'html';
  bodyMarkdown = '';
  bodyHtml = '';
  recipientCount: number | null = null;
  recipientCountLoading = true;
  sending = false;
  showConfirmDialog = false;

  confirmMessage =
    'This will queue one email per subscriber address using the normal email queue (processed one at a time).';
  confirmDetails =
    'Includes subscribers who unsubscribed from mass email. Blocked accounts are excluded. The Security → Test Account email is never queued.';

  constructor(
    private emailNotification: EmailNotificationService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    void this.loadRecipientCount();
  }

  get canSend(): boolean {
    if (this.subject.trim().length === 0) {
      return false;
    }
    switch (this.bodyFormat) {
      case 'html':
        return this.bodyHtml.trim().length > 0;
      case 'markdown':
        return this.bodyMarkdown.trim().length > 0;
      default: {
        const _exhaustive: never = this.bodyFormat;
        void _exhaustive;
        return false;
      }
    }
  }

  setBodyFormat(format: AdminBroadcastBodyFormat): void {
    if (this.bodyFormat === format) {
      return;
    }
    this.bodyFormat = format;
    this.cdr.markForCheck();
  }

  toggleSection(): void {
    this.sectionExpanded = !this.sectionExpanded;
    if (this.sectionExpanded && this.recipientCount === null && !this.recipientCountLoading) {
      void this.loadRecipientCount();
    }
    this.cdr.markForCheck();
  }

  private async loadRecipientCount(): Promise<void> {
    this.recipientCountLoading = true;
    this.cdr.markForCheck();
    try {
      this.recipientCount = await this.emailNotification.getManualBroadcastRecipientCount();
    } catch (e) {
      console.error('Failed to load subscriber count', e);
      this.recipientCount = null;
      this.toast.error('Could not load subscriber count');
    } finally {
      this.recipientCountLoading = false;
      this.cdr.markForCheck();
    }
  }

  onSendClick(): void {
    if (!this.canSend || this.sending || this.recipientCount === 0) {
      return;
    }
    this.showConfirmDialog = true;
    this.cdr.markForCheck();
  }

  onCancelSend(): void {
    this.showConfirmDialog = false;
    this.cdr.markForCheck();
  }

  async onConfirmSend(): Promise<void> {
    this.showConfirmDialog = false;
    if (this.bodyFormat === 'markdown') {
      this.richTextEditor?.flushMarkdownToForm();
    }
    if (!this.canSend) {
      this.cdr.markForCheck();
      return;
    }
    this.sending = true;
    this.cdr.markForCheck();
    try {
      const queueOptions =
        this.bodyFormat === 'html'
          ? { subject: this.subject, bodyHtml: this.bodyHtml }
          : { subject: this.subject, bodyMarkdown: this.bodyMarkdown };
      const { queued } = await this.emailNotification.queueAdminManualBroadcastToSubscribers(queueOptions);
      if (queued === 0) {
        this.toast.info('No subscribers to email (non-blocked list is empty).');
      } else {
        this.toast.success(`Queued ${queued} email(s). The processor will send them one at a time.`);
        this.subject = '';
        this.bodyMarkdown = '';
        this.bodyHtml = '';
      }
      await this.loadRecipientCount();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to queue emails';
      this.toast.error(msg);
    } finally {
      this.sending = false;
      this.cdr.markForCheck();
    }
  }
}
