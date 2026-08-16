import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BibleBooksMemorizationListComponent } from '../bible-books-memorization-list/bible-books-memorization-list.component';
import {
  bibleBooksCountLabel,
  bibleBooksAddedSuccessMessage,
  bibleBooksDuplicateErrorMessage,
  type BibleBooksMemorizationScope,
} from '../../lib/memorization/bibleBooksMemorization';
import { MemorizationService } from '../../services/memorization.service';
import { ToastService } from '../../services/toast.service';
import type { BibleTranslation } from '../../types/memorization';

const SCOPE_OPTIONS: {
  value: BibleBooksMemorizationScope;
  label: string;
  detail: string;
}[] = [
  { value: 'all', label: 'All 66 books', detail: 'Old and New Testament' },
  { value: 'ot', label: 'Old Testament', detail: '39 books' },
  { value: 'nt', label: 'New Testament', detail: '27 books' },
];

@Component({
  selector: 'app-add-memorized-bible-books-modal',
  standalone: true,
  imports: [CommonModule, BibleBooksMemorizationListComponent],
  template: `
    @if (isOpen) {
    <div
      class="fixed inset-0 z-[200] flex items-center justify-center bg-gray-900/50 p-2 sm:p-4 safe-area-overlay"
      style="padding-top: max(8px, env(safe-area-inset-top)); padding-bottom: max(8px, env(safe-area-inset-bottom));"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-memorized-bible-books-title"
      (click)="onClose.emit()"
    >
      <div
        class="w-full max-w-lg max-h-[min(92vh,720px)] flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden modal-panel-edge"
        (click)="$event.stopPropagation()"
      >
        <div class="shrink-0 flex items-center justify-between px-4 sm:px-6 py-4 modal-chrome-border-b">
          <h2 id="add-memorized-bible-books-title" class="text-xl font-semibold text-gray-800 dark:text-gray-200">
            Bible Books
          </h2>
          <button
            type="button"
            (click)="onClose.emit()"
            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-1 cursor-pointer"
            aria-label="Close"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="flex-1 min-h-0 flex flex-col px-4 sm:px-6 py-4 overflow-hidden">
          <p class="shrink-0 text-sm text-gray-600 dark:text-gray-400 mb-3">
            Choose which books to memorize in order. Practice uses the same games as verse memorization.
          </p>

          <div class="shrink-0 flex flex-col gap-2 mb-3" role="radiogroup" aria-label="Bible books scope">
            @for (opt of scopeOptions; track opt.value) {
            <label
              class="flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors"
              [class]="scope === opt.value ? 'border-blue-500 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'"
            >
              <input
                type="radio"
                name="bible-books-scope"
                [value]="opt.value"
                [checked]="scope === opt.value"
                (change)="scope = opt.value"
                class="mt-1 shrink-0"
              />
              <span class="min-w-0">
                <span class="block text-sm font-medium text-gray-800 dark:text-gray-100">{{ opt.label }}</span>
                <span class="block text-xs text-gray-500 dark:text-gray-400">{{ opt.detail }}</span>
              </span>
            </label>
            }
          </div>

          <div class="flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y rounded-lg border border-gray-200 dark:border-gray-700 p-2 mb-4">
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-2">{{ bibleBooksCountLabel(scope) }} preview</p>
            <app-bible-books-memorization-list [scope]="scope" [innerScroll]="false" />
          </div>

          <button
            type="button"
            [disabled]="submitting"
            (click)="handleAdd()"
            class="shrink-0 w-full py-2.5 rounded-lg font-medium transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600 disabled:hover:bg-blue-100 dark:disabled:hover:bg-blue-900/40 disabled:hover:border-blue-200 dark:disabled:hover:border-blue-700"
          >
            {{ submitting ? 'Adding…' : 'Add to list' }}
          </button>
        </div>
      </div>
    </div>
    }
  `,
})
export class AddMemorizedBibleBooksModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() translation: BibleTranslation = 'esv';
  @Output() onClose = new EventEmitter<void>();
  @Output() added = new EventEmitter<void>();

  readonly scopeOptions = SCOPE_OPTIONS;
  readonly bibleBooksCountLabel = bibleBooksCountLabel;

  scope: BibleBooksMemorizationScope = 'all';
  submitting = false;

  constructor(
    private memorization: MemorizationService,
    private toast: ToastService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true) {
      this.translation = this.memorization.getPreferredTranslation();
    }
  }

  async handleAdd(): Promise<void> {
    this.submitting = true;
    try {
      const result = await this.memorization.addBibleBooks(this.scope, this.translation);
      if (result.ok) {
        this.toast.success(bibleBooksAddedSuccessMessage(this.scope));
        this.added.emit();
        this.onClose.emit();
      } else if (result.reason === 'duplicate') {
        this.toast.error(bibleBooksDuplicateErrorMessage(this.scope));
      } else {
        this.toast.error('Could not save bible books list.');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to add bible books list.';
      this.toast.error(msg);
    } finally {
      this.submitting = false;
    }
  }
}
