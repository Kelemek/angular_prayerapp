import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { MemorizeListView } from '../../lib/memorization/memorization-list-prefs';

/** Fixed `14px` (not `text-sm` rem) so labels stay the same under Settings text size. */
const ACTION_BTN_BASE =
  'flex flex-1 items-center justify-center whitespace-nowrap rounded-lg border px-2 py-2 text-[14px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer sm:flex-none sm:px-4';

/** Outlined blue — matches active **Memorize** stat tab (`#tour-filter-memorize`). */
const MEMORIZE_TAB_CHIP =
  '!border-[#0047AB] bg-blue-100 text-gray-700 ring ring-[#0047AB] ring-offset-0 dark:!border-[#0047AB] dark:bg-blue-950 dark:text-gray-300 dark:ring-[#0047AB]';

const SOFT_BLUE_BTN = `border ${MEMORIZE_TAB_CHIP}`;

/** Hover/active on inactive buttons — same outlined blue as Verses / active Memorize tab. */
const MEMORIZE_TAB_CHIP_HOVER =
  'hover:border hover:!border-[#0047AB] hover:!bg-blue-100 hover:!text-gray-700 hover:ring hover:ring-[#0047AB] hover:ring-offset-0 dark:hover:!border-[#0047AB] dark:hover:!bg-blue-950 dark:hover:!text-gray-300 dark:hover:ring-[#0047AB]';

const MEMORIZE_TAB_CHIP_ACTIVE =
  'active:border active:!border-[#0047AB] active:!bg-blue-100 active:!text-gray-700 active:ring active:ring-[#0047AB] active:ring-offset-0 dark:active:!border-[#0047AB] dark:active:!bg-blue-950 dark:active:!text-gray-300 dark:active:ring-[#0047AB]';

/**
 * Neutral at rest; hover/active match Verses / active Memorize tab.
 * Dark hover uses `!` because theme `@utility` classes (e.g. bg-gray-800) set `!important`.
 */
const SECONDARY_BTN =
  `border-gray-300 bg-white text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 ${MEMORIZE_TAB_CHIP_HOVER} ${MEMORIZE_TAB_CHIP_ACTIVE}`;

const VIEW_BTN_BASE =
  'box-border px-2.5 py-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 cursor-pointer';

/** Selected segment — fill only; no ring (avoids hover/active size jump). */
const VIEW_BTN_ACTIVE =
  'border-transparent !bg-blue-100 !text-gray-700 dark:!bg-blue-950 dark:!text-gray-300';

/** Unselected segment — color change on hover only. */
const VIEW_BTN_INACTIVE =
  'border-transparent bg-white text-gray-600 hover:!bg-blue-50 hover:!text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:!bg-blue-950 dark:hover:!text-gray-300';

@Component({
  selector: 'app-memorization-action-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div id="tour-memorize-action-bar" class="mb-2 flex w-full flex-col gap-2">
      <div class="flex w-full min-w-0 gap-2">
        <button
          type="button"
          id="tour-memorize-add-verses"
          (click)="addVerses.emit()"
          [attr.aria-pressed]="addVersesActive"
          [class]="actionBtnBase + ' ' + softBlueBtn"
        >
          Add Verses
        </button>
        <button
          type="button"
          (click)="addBibleBooks.emit()"
          [attr.aria-pressed]="bibleBooksActive"
          [class]="actionBtnBase + ' ' + (bibleBooksActive ? softBlueBtn : secondaryBtn)"
        >
          Bible Books
        </button>
        <button
          type="button"
          id="tour-memorize-recommended"
          (click)="openRecommended.emit()"
          [attr.aria-pressed]="recommendedActive"
          [class]="actionBtnBase + ' ' + (recommendedActive ? softBlueBtn : secondaryBtn)"
        >
          Recommended
        </button>
      </div>

      <div
        class="flex items-center gap-2 self-end"
        data-testid="memorize-list-layout-row"
      >
        <span
          id="memorize-list-layout-label"
          class="text-xs font-medium text-gray-600 dark:text-gray-400"
        >
          View
        </span>
        <div
          class="inline-flex overflow-hidden rounded-md border border-gray-300 dark:border-gray-600"
          role="group"
          aria-labelledby="memorize-list-layout-label"
          data-testid="memorize-list-layout-toggle"
        >
          <button
            type="button"
            data-testid="memorize-view-cards"
            [attr.aria-pressed]="listView === 'cards'"
            [class]="
              viewBtnBase +
              ' border-r border-gray-300 dark:border-gray-600 ' +
              (listView === 'cards' ? viewBtnActive : viewBtnInactive)
            "
            (click)="setListView('cards')"
          >
            Cards
          </button>
          <button
            type="button"
            data-testid="memorize-view-table"
            [attr.aria-pressed]="listView === 'table'"
            [class]="
              viewBtnBase +
              ' ' +
              (listView === 'table' ? viewBtnActive : viewBtnInactive)
            "
            (click)="setListView('table')"
          >
            Table
          </button>
        </div>
      </div>
    </div>
  `,
})
export class MemorizationActionBarComponent {
  @Input() addVersesActive = false;
  @Input() bibleBooksActive = false;
  @Input() recommendedActive = false;
  @Input() listView: MemorizeListView = 'cards';

  @Output() addVerses = new EventEmitter<void>();
  @Output() addBibleBooks = new EventEmitter<void>();
  @Output() openRecommended = new EventEmitter<void>();
  @Output() listViewChange = new EventEmitter<MemorizeListView>();

  protected readonly actionBtnBase = ACTION_BTN_BASE;
  protected readonly softBlueBtn = SOFT_BLUE_BTN;
  protected readonly secondaryBtn = SECONDARY_BTN;
  protected readonly viewBtnBase = VIEW_BTN_BASE;
  protected readonly viewBtnActive = VIEW_BTN_ACTIVE;
  protected readonly viewBtnInactive = VIEW_BTN_INACTIVE;

  setListView(view: MemorizeListView): void {
    if (view === this.listView) return;
    this.listViewChange.emit(view);
  }
}
