import {
  ApplicationRef,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BiblePassagePickerModalComponent } from '../bible-passage-picker-modal/bible-passage-picker-modal.component';
import { ScriptureHoverPreviewComponent } from '../scripture-hover-preview/scripture-hover-preview.component';
import { MemorizationService } from '../../services/memorization.service';
import { ToastService } from '../../services/toast.service';
import { VerseMemorizationPrayerService } from '../../services/verse-memorization-prayer.service';
import type { BibleTranslation } from '../../types/memorization';

@Component({
  selector: 'app-verse-memorization-prayer-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    BiblePassagePickerModalComponent,
    ScriptureHoverPreviewComponent,
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
            class="text-[#39704D] dark:text-green-400 shrink-0"
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
            Send a verse memorization prayer to all subscribers. It appears on the Current tab
            for 30 days, then auto-archives. No approval queue — publishing is immediate.
          </p>

          <button
            type="button"
            (click)="openPicker()"
            [disabled]="sending"
            class="flex items-center gap-2 px-4 py-2 bg-[#39704D] text-white rounded-lg hover:bg-[#2d5a3d] text-sm font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Verse Prayer
          </button>

          @if (recent.length > 0) {
            <div>
              <h3 class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                Recent sends
              </h3>
              <ul class="space-y-2 text-sm">
                @for (row of recent; track row.id) {
                  <li class="flex flex-wrap items-center gap-2 text-gray-800 dark:text-gray-200">
                    <span class="font-medium">{{ row.verse_reference }}</span>
                    <span class="text-gray-500 dark:text-gray-400">({{ row.status }})</span>
                    @if (row.approved_at) {
                      <span class="text-gray-400 dark:text-gray-500 text-xs">
                        {{ row.approved_at | date: 'mediumDate' }}
                      </span>
                    }
                  </li>
                }
              </ul>
            </div>
          }
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
        class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="verse-send-title"
      >
        <div
          class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6 border border-gray-200 dark:border-gray-700"
          (click)="$event.stopPropagation()"
        >
          <h2 id="verse-send-title" class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Send verse prayer
          </h2>
          <app-scripture-hover-preview
            class="mb-4"
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

          <div class="flex flex-wrap gap-2 mt-6 justify-end">
            <button
              type="button"
              (click)="cancelSend()"
              class="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              (click)="sendVersePrayer()"
              [disabled]="sending"
              class="px-4 py-2 text-sm rounded-lg bg-[#39704D] text-white hover:bg-[#2d5a3d] font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ sending ? 'Sending…' : 'Send' }}
            </button>
          </div>
        </div>
      </div>
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
  recent: Array<{
    id: string;
    verse_reference: string;
    verse_translation: string | null;
    approved_at: string | null;
    status: string;
  }> = [];

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
    if (this.sectionExpanded) {
      void this.loadRecent();
    }
    this.mark();
  }

  async loadRecent(): Promise<void> {
    this.recent = await this.versePrayerService.listRecent();
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
      const result = await this.versePrayerService.sendVerseMemorizationPrayer({
        reference: this.pendingReference,
        translation: this.pickerTranslation,
        adminMessage: this.adminMessage,
      });

      if (result.ok) {
        this.toast.success('Verse memorization prayer sent to subscribers.');
        this.cancelSend();
        await this.loadRecent();
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

  prepareTourInitialState(): void {
    this.sectionExpanded = true;
    void this.loadRecent();
    this.mark();
  }

  private mark(): void {
    this.cdr.markForCheck();
    this.cdr.detectChanges();
    this.appRef.tick();
  }
}
