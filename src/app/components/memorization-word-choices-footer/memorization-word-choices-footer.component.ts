import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MEMORIZATION_WORD_CHOICE_COMFORTABLE_MEDIA_QUERY,
  MEMORIZATION_WORD_CHOICE_ROW_COUNT_COMPACT,
  MEMORIZATION_WORD_CHOICE_SM_MIN_WIDTH_PX,
  memorizationWordChoiceRowCount,
  splitMemorizationChoiceRows,
  type MemorizationToken,
} from '../../lib/memorization/memorizationPracticeUtils';

@Component({
  selector: 'app-memorization-word-choices-footer',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="shrink-0 modal-chrome-footer"
      data-testid="memorize-word-choices"
    >
      <div
        class="memorize-word-choices-panel overflow-y-auto overscroll-y-contain px-4 py-3 touch-pan-y"
      >
        <div class="flex w-full max-w-2xl mx-auto flex-col justify-center gap-4">
          @for (row of choiceRows; track $index) {
            <div
              class="memorize-word-choice-row flex justify-center gap-x-4"
              data-testid="memorize-word-choice-row"
            >
              @for (label of row; track label) {
                <button
                  type="button"
                  (click)="guess.emit(label)"
                  class="shrink-0 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 font-medium text-center whitespace-nowrap hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                  [class.min-w-11]="targetKind === 'digit'"
                  [class.px-4]="targetKind === 'digit'"
                  [class.py-2.5]="targetKind === 'digit'"
                  [class.tabular-nums]="targetKind === 'digit'"
                  [class.px-4]="targetKind !== 'digit'"
                  [class.py-3]="targetKind !== 'digit'"
                  [class.text-sm]="targetKind !== 'digit'"
                >
                  {{ label }}
                </button>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      /*
        Reserve word-choice rows so the passage above does not jump when choices
        change. Three rows below Tailwind sm; two rows at sm and wider.
      */
      .memorize-word-choices-panel {
        --memorize-word-choice-row-height: calc(0.75rem * 2 + 1.375 * 0.875rem + 2px);
        min-height: calc(0.75rem * 2 + var(--memorize-word-choice-row-height) * 3 + 2rem);
      }
      @media (min-width: ${MEMORIZATION_WORD_CHOICE_SM_MIN_WIDTH_PX}px) {
        .memorize-word-choices-panel {
          min-height: calc(0.75rem * 2 + var(--memorize-word-choice-row-height) * 2 + 1rem);
        }
      }
      .memorize-word-choice-row {
        flex-wrap: nowrap;
        overflow-x: auto;
        overscroll-behavior-x: contain;
        -webkit-overflow-scrolling: touch;
      }
    `,
  ],
})
export class MemorizationWordChoicesFooterComponent implements OnInit, OnDestroy {
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly ngZone = inject(NgZone);

  @Input({ required: true }) labels!: readonly string[];
  @Input() targetKind: MemorizationToken['kind'] | null = null;
  @Output() readonly guess = new EventEmitter<string>();

  private rowCount = MEMORIZATION_WORD_CHOICE_ROW_COUNT_COMPACT;
  private layoutMediaQuery: MediaQueryList | null = null;
  private layoutMediaListener: ((event: MediaQueryListEvent) => void) | null = null;

  get choiceRows(): readonly string[][] {
    return splitMemorizationChoiceRows(this.labels, this.rowCount);
  }

  ngOnInit(): void {
    this.attachLayoutListener();
  }

  ngOnDestroy(): void {
    this.detachLayoutListener();
  }

  private attachLayoutListener(): void {
    this.detachLayoutListener();
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    this.layoutMediaQuery = window.matchMedia(MEMORIZATION_WORD_CHOICE_COMFORTABLE_MEDIA_QUERY);
    this.applyRowCount(this.layoutMediaQuery.matches);
    this.layoutMediaListener = (event: MediaQueryListEvent) => {
      this.ngZone.run(() => {
        this.applyRowCount(event.matches);
      });
    };
    this.layoutMediaQuery.addEventListener('change', this.layoutMediaListener);
  }

  private detachLayoutListener(): void {
    if (this.layoutMediaQuery && this.layoutMediaListener) {
      this.layoutMediaQuery.removeEventListener('change', this.layoutMediaListener);
    }
    this.layoutMediaQuery = null;
    this.layoutMediaListener = null;
  }

  private applyRowCount(isComfortableWidth: boolean): void {
    const next = memorizationWordChoiceRowCount(isComfortableWidth);
    if (next === this.rowCount) return;
    this.rowCount = next;
    this.cdr.markForCheck();
  }
}
