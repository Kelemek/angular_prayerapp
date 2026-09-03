import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MemorizationService } from '../../services/memorization.service';
import {
  computeFixedAnchoredMenuPosition,
  getSafeAreaViewportBounds,
} from '../../lib/fixed-popover-placement';
import {
  BIBLE_TRANSLATION_CODES,
  BIBLE_TRANSLATION_LABELS,
  type BibleTranslation,
} from '../../types/memorization';

const TRANSLATION_OPTION_HEIGHT_PX = 44;
const TRANSLATION_MENU_PADDING_PX = 8;
/** Same 18rem / 40vh cap previously applied via Tailwind on the fixed menu. */
const TRANSLATION_MENU_MAX_REM = 18;
const TRANSLATION_MENU_MAX_VH_FRACTION = 0.4;

const translationMenuCssMaxHeightPx = (
  viewportHeight: number,
  remPx = 16
): number =>
  Math.min(
    TRANSLATION_MENU_MAX_REM * remPx,
    TRANSLATION_MENU_MAX_VH_FRACTION * viewportHeight
  );

@Component({
  selector: 'app-bible-translation-picker',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shrink-0 mb-3">
      <p class="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
        Bible translation
      </p>
      <div class="relative">
        <div
          class="overflow-hidden rounded-lg border bg-white dark:bg-gray-800 transition-all"
          [class.border-blue-500]="showDropdown"
          [class.ring-1]="showDropdown"
          [class.ring-blue-500/30]="showDropdown"
          [class.dark:border-blue-400]="showDropdown"
          [class.border-gray-300]="!showDropdown"
          [class.dark:border-gray-600]="!showDropdown"
        >
          <button
            #triggerButton
            type="button"
            [id]="triggerId"
            (click)="toggleDropdown()"
            [attr.aria-expanded]="showDropdown"
            aria-haspopup="listbox"
            [attr.aria-label]="triggerAriaLabel"
            class="flex w-full min-h-[44px] cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-all touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-800"
          >
            <span class="font-medium text-gray-800 dark:text-gray-100">
              {{ selectedTranslationLabel }}
            </span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="shrink-0 text-gray-500 transition-transform dark:text-gray-400"
              [class.rotate-180]="showDropdown"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>

        @if (showDropdown) {
          <div class="fixed inset-0 z-[201]" (click)="closeDropdown()"></div>
          <div
            role="listbox"
            aria-label="Bible translation options"
            [class]="escapeOverflowContainer
              ? 'fixed z-[202] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800 overflow-y-auto'
              : 'absolute left-0 right-0 z-[202] mt-1 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800'"
            [style.left.px]="escapeOverflowContainer ? fixedMenuPos.left : null"
            [style.top.px]="escapeOverflowContainer ? fixedMenuPos.top : null"
            [style.width.px]="escapeOverflowContainer ? fixedMenuPos.width : null"
            [style.max-height.px]="escapeOverflowContainer ? fixedMenuPos.maxHeight : null"
          >
            @for (code of translationCodes; track code) {
              <button
                type="button"
                role="option"
                [attr.aria-selected]="translation === code"
                (click)="setTranslation(code)"
                class="flex w-full min-h-[44px] cursor-pointer items-center justify-between px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700/60 touch-manipulation"
                [class.bg-blue-50]="translation === code"
                [class.dark:bg-blue-900/30]="translation === code"
              >
                <span>{{ translationLabels[code] }}</span>
                @if (translation === code) {
                  <span class="ml-2 shrink-0 text-blue-600 dark:text-blue-400">✓</span>
                }
              </button>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class BibleTranslationPickerComponent {
  private readonly memorization = inject(MemorizationService);
  private readonly cdr = inject(ChangeDetectorRef);

  @Input() translation: BibleTranslation = 'esv';
  @Input() triggerId = 'bible-translation-picker-trigger';
  @Input() triggerAriaLabel = 'Preferred Bible translation for memorization';
  /** Portals the menu with fixed positioning so it is not clipped by modal overflow. */
  @Input() escapeOverflowContainer = false;
  @Output() translationChange = new EventEmitter<BibleTranslation>();

  @ViewChild('triggerButton') triggerButton?: ElementRef<HTMLButtonElement>;

  readonly translationCodes = BIBLE_TRANSLATION_CODES;
  readonly translationLabels = BIBLE_TRANSLATION_LABELS;

  showDropdown = false;
  fixedMenuPos = { left: 0, top: 0, width: 0, maxHeight: 0 };

  get isDropdownOpen(): boolean {
    return this.showDropdown;
  }

  get selectedTranslationLabel(): string {
    return this.translationLabels[this.translation];
  }

  toggleDropdown(): void {
    const nextOpen = !this.showDropdown;
    if (nextOpen && this.escapeOverflowContainer) {
      this.updateFixedMenuPosition();
    }
    this.showDropdown = nextOpen;
    this.cdr.markForCheck();
  }

  private updateFixedMenuPosition(): void {
    const trigger = this.triggerButton?.nativeElement;
    if (!trigger || typeof window === 'undefined') {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const unconstrainedHeight =
      this.translationCodes.length * TRANSLATION_OPTION_HEIGHT_PX +
      TRANSLATION_MENU_PADDING_PX;
    const viewport = getSafeAreaViewportBounds(trigger);
    const remPx =
      Number.parseFloat(getComputedStyle(document.documentElement).fontSize) ||
      16;
    const position = computeFixedAnchoredMenuPosition(
      rect,
      unconstrainedHeight,
      translationMenuCssMaxHeightPx(viewport.bottom - viewport.top, remPx),
      viewport
    );
    this.fixedMenuPos = {
      left: position.left,
      top: position.top,
      width: position.width,
      maxHeight: position.maxHeight,
    };
  }

  closeDropdown(): void {
    this.showDropdown = false;
  }

  setTranslation(next: BibleTranslation): void {
    this.closeDropdown();
    if (this.translation === next) return;
    this.translation = next;
    this.memorization.setPreferredTranslation(next);
    this.translationChange.emit(next);
  }
}
