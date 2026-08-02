import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  bibleBooksCountLabel,
  isBibleBooksMemorizationItem,
} from '../../lib/memorization/bibleBooksMemorization';
import {
  loadMemorizeTableSort,
  saveMemorizeTableSort,
  type MemorizeTableSortBy,
  type MemorizeTableSortDirection,
} from '../../lib/memorization/memorization-list-prefs';
import {
  countCompletedSessions,
  getMasterLevel,
  masterLevelLabel,
} from '../../lib/memorization/memorization-mastery';
import { sortMemorizedItemsForTable } from '../../lib/memorization/memorization-table-sort';
import { splitScriptureReferenceDisplay } from '../../lib/memorization/parse-scripture-reference';
import type { MemorizedItem } from '../../types/memorization';
import { ScriptureHoverPreviewComponent } from '../scripture-hover-preview/scripture-hover-preview.component';

/** Fits phone width: flexible reference + compact sessions/mastery/actions. */
const TABLE_COLS =
  'grid-cols-[minmax(0,1fr)_2.75rem_minmax(0,5.25rem)_2rem] sm:grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,7rem)_2.5rem]';

@Component({
  selector: 'app-memorized-verses-table',
  standalone: true,
  imports: [CommonModule, ScriptureHoverPreviewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      id="tour-memorize-sample-table"
      data-testid="memorized-verses-table"
      class="w-full min-w-0"
    >
      <div
        class="mb-2 grid gap-1 rounded-lg border border-gray-200 bg-white px-2 py-2 text-[11px] font-semibold text-gray-700 shadow-md dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 sm:mb-3 sm:gap-2 sm:px-3 sm:text-xs ${TABLE_COLS}"
      >
        <button
          type="button"
          class="min-w-0 cursor-pointer truncate text-left transition-colors hover:text-gray-900 dark:hover:text-gray-100"
          title="Click to sort by reference"
          (click)="toggleSort('reference')"
        >
          Reference{{ getSortIndicator('reference') }}
        </button>
        <button
          type="button"
          class="cursor-pointer text-left transition-colors hover:text-gray-900 dark:hover:text-gray-100"
          title="Click to sort by sessions"
          (click)="toggleSort('sessions')"
        >
          <span class="sm:hidden">Sess.{{ getSortIndicator('sessions') }}</span>
          <span class="hidden sm:inline">Sessions{{ getSortIndicator('sessions') }}</span>
        </button>
        <button
          type="button"
          class="min-w-0 cursor-pointer truncate text-left transition-colors hover:text-gray-900 dark:hover:text-gray-100"
          title="Click to sort by mastery"
          (click)="toggleSort('mastery')"
        >
          Mastery{{ getSortIndicator('mastery') }}
        </button>
        <span class="sr-only sm:not-sr-only sm:text-left sm:text-gray-700 dark:sm:text-gray-300"
          >Actions</span
        >
      </div>

      <div class="space-y-2" role="list">
        @for (item of sortedItems; track item.id) {
          <div
            role="listitem"
            class="grid items-center gap-1 overflow-hidden rounded-lg border border-gray-200 bg-white px-2 py-2 shadow-md dark:border-gray-700 dark:bg-gray-800 sm:gap-2 sm:p-3 ${TABLE_COLS}"
          >
            <div class="min-w-0">
              <app-scripture-hover-preview
                class="block min-w-0"
                [reference]="item.reference"
                [translation]="item.translation"
                [disabled]="isBibleBooksMemorizationItem(item)"
              >
                <button
                  type="button"
                  data-testid="memorize-table-practice"
                  class="block w-full min-w-0 cursor-pointer text-left transition-colors"
                  [title]="item.reference"
                  (click)="practice.emit(item)"
                >
                  <span
                    class="flex min-w-0 items-baseline gap-1 text-sm font-semibold text-gray-900 hover:text-[#0047AB] dark:text-gray-100 dark:hover:text-blue-300 sm:text-base"
                  >
                    @if (splitReference(item.reference); as parts) {
                      <span class="min-w-0 truncate">{{ parts.book }}</span>
                      @if (parts.citation) {
                        <span class="shrink-0 tabular-nums">{{ ' ' + parts.citation }}</span>
                      }
                    }
                  </span>
                  <span
                    class="mt-0.5 block truncate text-xs text-gray-600 dark:text-gray-400"
                    data-testid="memorize-table-version"
                  >
                    @if (isBibleBooksMemorizationItem(item)) {
                      {{ bibleBooksCountLabel(item.bibleBooksScope!) }}
                    } @else {
                      {{ item.translation.toUpperCase() }}
                    }
                  </span>
                </button>
              </app-scripture-hover-preview>
            </div>

            <div class="min-w-0 tabular-nums">
              <p class="text-xs text-gray-600 dark:text-gray-400 sm:text-sm">
                {{ countCompletedSessions(item) }}
              </p>
            </div>

            <div class="min-w-0">
              <p
                class="truncate text-xs text-gray-600 dark:text-gray-400 sm:text-sm"
                [title]="masterLevelLabel(getMasterLevel(item))"
              >
                {{ masterLevelLabel(getMasterLevel(item)) }}
              </p>
            </div>

            <div class="flex justify-center sm:justify-start">
              <button
                type="button"
                data-testid="memorize-table-remove"
                class="inline-flex cursor-pointer items-center justify-center rounded-md p-1 text-gray-500 transition-colors hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                [attr.aria-label]="'Remove ' + item.reference"
                title="Remove"
                (click)="remove.emit(item)"
              >
                <svg
                  class="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class MemorizedVersesTableComponent implements OnInit {
  @Input({ required: true }) items: MemorizedItem[] = [];
  @Output() practice = new EventEmitter<MemorizedItem>();
  @Output() remove = new EventEmitter<MemorizedItem>();

  sortBy: MemorizeTableSortBy = 'mastery';
  sortDirection: MemorizeTableSortDirection = 'asc';

  readonly isBibleBooksMemorizationItem = isBibleBooksMemorizationItem;
  readonly bibleBooksCountLabel = bibleBooksCountLabel;
  readonly countCompletedSessions = countCompletedSessions;
  readonly getMasterLevel = getMasterLevel;
  readonly masterLevelLabel = masterLevelLabel;
  readonly splitReference = splitScriptureReferenceDisplay;

  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    const prefs = loadMemorizeTableSort();
    this.sortBy = prefs.sortBy;
    this.sortDirection = prefs.sortDirection;
  }

  get sortedItems(): MemorizedItem[] {
    return sortMemorizedItemsForTable(this.items, this.sortBy, this.sortDirection);
  }

  toggleSort(column: MemorizeTableSortBy): void {
    if (this.sortBy === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortDirection = 'asc';
    }
    saveMemorizeTableSort({
      sortBy: this.sortBy,
      sortDirection: this.sortDirection,
    });
    this.cdr.markForCheck();
  }

  getSortIndicator(column: MemorizeTableSortBy): string {
    if (this.sortBy !== column) return '';
    return this.sortDirection === 'asc' ? ' ↑' : ' ↓';
  }
}
