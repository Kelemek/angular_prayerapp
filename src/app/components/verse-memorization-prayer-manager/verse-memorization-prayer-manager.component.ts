import {
  ApplicationRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BiblePassagePickerModalComponent } from '../bible-passage-picker-modal/bible-passage-picker-modal.component';
import { ScriptureHoverPreviewComponent } from '../scripture-hover-preview/scripture-hover-preview.component';
import { SendNotificationDialogComponent } from '../send-notification-dialog/send-notification-dialog.component';
import { MemorizationService } from '../../services/memorization.service';
import { ToastService } from '../../services/toast.service';
import {
  VerseMemorizationPrayerService,
  type VerseMemorizationPrayerBroadcastPayload,
} from '../../services/verse-memorization-prayer.service';
import type { BibleTranslation } from '../../types/memorization';

@Component({
  selector: 'app-verse-memorization-prayer-manager',
  standalone: true,
  imports: [
    FormsModule,
    BiblePassagePickerModalComponent,
    ScriptureHoverPreviewComponent,
    SendNotificationDialogComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 transition-colors dark:hover:bg-gray-700/40"
      [class.cursor-pointer]="!sectionExpanded"
      (click)="!sectionExpanded && onSectionToggle()"
    >
      <button
        type="button"
        id="verse-memorization-prayer-manager-trigger"
        class="admin-settings-collapsible-trigger cursor-pointer w-full flex min-h-12 items-center justify-between gap-2 text-left rounded-lg -mx-1 px-1 py-0.5 -my-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800"
        (click)="onSectionToggle(); $event.stopPropagation()"
        [attr.aria-expanded]="sectionExpanded"
        aria-controls="verse-memorization-prayer-manager-panel"
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
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            <line x1="12" y1="6" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          Verse Memorization of the Week
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
          class="shrink-0 text-gray-500 dark:text-gray-400 transition-transform"
          [class.rotate-180]="sectionExpanded"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      @if (sectionExpanded) {
        <div id="verse-memorization-prayer-manager-panel" class="mt-4 space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Send a verse memorization prayer to the Current tab for 30 days, then auto-archive.
            No approval queue — publishing is immediate. After you post, you can choose whether to
            email and push subscribers (same prompt as approving prayers).
          </p>

          <div class="flex justify-end">
            <button
              type="button"
              (click)="openPicker()"
              [disabled]="sending"
              class="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add Verse Prayer
            </button>
          </div>
        </div>
      }
    </div>

    <app-bible-passage-picker-modal
      [isOpen]="showPicker"
      [busy]="false"
      confirmLabel="Continue"
      (close)="closePicker()"
      (confirmed)="onPassageConfirmed($event)"
      (translationChange)="pickerTranslation = $event"
    />

    @if (showSendPanel && pendingReference) {
      <div
        class="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-gray-900/50 p-0 sm:p-4 safe-area-overlay overscroll-none touch-none"
        style="padding-top: max(8px, env(safe-area-inset-top)); padding-bottom: max(8px, env(safe-area-inset-bottom));"
        role="dialog"
        aria-modal="true"
        aria-labelledby="verse-send-title"
        (click)="cancelSend()"
      >
        <div
          class="w-full sm:max-w-lg flex flex-col bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 modal-panel-edge touch-none"
          (click)="$event.stopPropagation()"
        >
          <div
            class="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-3 modal-chrome-header touch-none"
          >
            <h2
              id="verse-send-title"
              class="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              Post verse prayer
            </h2>
            <button
              type="button"
              (click)="cancelSend()"
              class="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="px-4 sm:px-6 py-3">
            <app-scripture-hover-preview
              class="mb-4 block"
              [reference]="pendingReference"
              [translation]="pickerTranslation"
            >
              <p class="font-medium text-gray-900 dark:text-gray-100">{{ pendingReference }}</p>
            </app-scripture-hover-preview>

            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Optional message
            </label>
            <textarea
              [(ngModel)]="adminMessage"
              rows="4"
              class="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm"
              placeholder="Add an optional note before the verse…"
            ></textarea>
          </div>

          <div
            class="shrink-0 modal-chrome-footer px-4 sm:px-6 py-3 touch-none"
            style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom));"
          >
            <button
              type="button"
              (click)="sendVersePrayer()"
              [disabled]="sending"
              class="w-full min-h-[48px] py-2.5 rounded-lg font-medium transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ sending ? 'Posting…' : 'Post' }}
            </button>
          </div>
        </div>
      </div>
    }

    @if (showSendNotificationDialog) {
      <app-send-notification-dialog
        notificationType="prayer"
        [prayerTitle]="sendDialogPrayerTitle"
        (confirm)="onConfirmSendNotification()"
        (decline)="onDeclineSendNotification()"
      ></app-send-notification-dialog>
    }
  `,
})
export class VerseMemorizationPrayerManagerComponent {
  sectionExpanded = false;
  showPicker = false;
  showSendPanel = false;
  pendingReference: string | null = null;
  pickerTranslation: BibleTranslation = 'esv';
  adminMessage = '';
  sending = false;
  showSendNotificationDialog = false;
  sendDialogPrayerTitle?: string;
  private pendingBroadcast: VerseMemorizationPrayerBroadcastPayload | null = null;

  constructor(
    private readonly versePrayerService: VerseMemorizationPrayerService,
    private readonly memorizationService: MemorizationService,
    private readonly toast: ToastService,
    private readonly cdr: ChangeDetectorRef,
    private readonly appRef: ApplicationRef,
  ) {
    this.pickerTranslation = this.memorizationService.getPreferredTranslation();
  }

  onSectionToggle(): void {
    this.sectionExpanded = !this.sectionExpanded;
    this.mark();
  }

  openPicker(): void {
    this.showPicker = true;
    this.mark();
  }

  closePicker(): void {
    this.showPicker = false;
    this.mark();
  }

  onPassageConfirmed(reference: string): void {
    this.showPicker = false;
    this.pendingReference = reference;
    this.adminMessage = '';
    this.showSendPanel = true;
    this.mark();
  }

  cancelSend(): void {
    this.showSendPanel = false;
    this.pendingReference = null;
    this.adminMessage = '';
    this.mark();
  }

  async sendVersePrayer(): Promise<void> {
    if (!this.pendingReference || this.sending) return;
    this.sending = true;
    this.mark();

    try {
      const result = await this.versePrayerService.createVerseMemorizationPrayer({
        reference: this.pendingReference,
        translation: this.pickerTranslation,
        adminMessage: this.adminMessage,
      });

      if (result.ok) {
        this.toast.success('Verse memorization prayer published on Current.');
        this.pendingBroadcast = {
          prayerId: result.prayerId,
          verseReference: this.pendingReference,
          verseTranslation: this.pickerTranslation,
          verseText: result.verseText,
          adminMessage: this.adminMessage,
        };
        this.sendDialogPrayerTitle = `Memorize: ${this.pendingReference}`;
        this.cancelSend();
        this.showSendNotificationDialog = true;
      } else if (result.reason === 'no_passage') {
        this.toast.error('No text returned for this passage.');
      } else if (result.reason === 'no_admin_email') {
        this.toast.error('Sign in as admin to send verse prayers.');
      } else {
        this.toast.error('Could not send verse memorization prayer.');
      }
    } catch (e) {
      console.error(e);
      this.toast.error('Could not send verse memorization prayer.');
    } finally {
      this.sending = false;
      this.mark();
    }
  }

  async onConfirmSendNotification(): Promise<void> {
    const payload = this.pendingBroadcast;
    if (!payload) {
      this.onDeclineSendNotification();
      return;
    }

    try {
      await this.versePrayerService.broadcastVerseMemorizationPrayerNotifications(
        payload
      );
      this.toast.success('Notification emails sent to subscribers');
    } catch (error) {
      console.error(error);
      this.toast.error('Failed to send notification emails');
    } finally {
      this.onDeclineSendNotification();
    }
  }

  onDeclineSendNotification(): void {
    this.showSendNotificationDialog = false;
    this.sendDialogPrayerTitle = undefined;
    this.pendingBroadcast = null;
    this.mark();
  }

  private mark(): void {
    this.cdr.markForCheck();
    this.cdr.detectChanges();
    this.appRef.tick();
  }
}
