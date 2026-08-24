import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { BibleTranslationPickerComponent } from '../bible-translation-picker/bible-translation-picker.component';
import { MemorizationService } from '../../services/memorization.service';
import type { BibleTranslation } from '../../types/memorization';

@Component({
  selector: 'app-verse-memorization-translation-modal',
  standalone: true,
  imports: [CommonModule, BibleTranslationPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (isOpen) {
      <div
        class="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-gray-900/50 p-0 sm:p-4 safe-area-overlay overscroll-none touch-none"
        style="padding-top: max(8px, env(safe-area-inset-top)); padding-bottom: max(8px, env(safe-area-inset-bottom));"
        role="dialog"
        aria-modal="true"
        aria-labelledby="verse-memorization-translation-title"
        (click)="onCancel.emit()"
      >
        <div
          class="w-full sm:max-w-md flex flex-col bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-lg shadow-xl modal-panel-edge touch-none"
          (click)="$event.stopPropagation()"
        >
          <div
            class="shrink-0 flex items-center justify-between gap-3 px-4 sm:px-6 py-3 modal-chrome-header touch-none"
          >
            <h2
              id="verse-memorization-translation-title"
              class="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              Choose Bible translation
            </h2>
            <button
              type="button"
              (click)="onCancel.emit()"
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
            <p class="text-sm font-medium text-gray-900 dark:text-gray-100">
              Memorize: {{ reference }}
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Pick the version you want to practice.
            </p>
            <app-bible-translation-picker
              [translation]="selectedTranslation"
              [escapeOverflowContainer]="true"
              triggerId="verse-memorization-translation-picker-trigger"
              triggerAriaLabel="Bible translation for verse memorization"
              (translationChange)="onTranslationChanged($event)"
            />
          </div>

          <div
            class="shrink-0 modal-chrome-footer px-4 sm:px-6 py-3 touch-none"
            style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom));"
          >
            <button
              type="button"
              (click)="onConfirm.emit(selectedTranslation)"
              class="w-full min-h-[48px] py-2.5 rounded-lg font-medium transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600"
            >
              Start memorizing
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class VerseMemorizationTranslationModalComponent implements OnChanges {
  private readonly memorization = inject(MemorizationService);

  @Input() isOpen = false;
  @Input() reference = '';

  @Output() onConfirm = new EventEmitter<BibleTranslation>();
  @Output() onCancel = new EventEmitter<void>();

  selectedTranslation: BibleTranslation = 'esv';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true) {
      this.selectedTranslation = this.memorization.getPreferredTranslation();
    }
  }

  onTranslationChanged(translation: BibleTranslation): void {
    this.selectedTranslation = translation;
  }
}
