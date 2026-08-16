import {
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { BibleTranslationPickerComponent } from '../bible-translation-picker/bible-translation-picker.component';
import { MemorizationRecommendationCardComponent } from '../memorization-recommendation-card/memorization-recommendation-card.component';
import { MemorizationService } from '../../services/memorization.service';
import type {
  BibleTranslation,
  MemorizationRecommendation,
  MemorizationRecommendationCategoryGroup,
} from '../../types/memorization';

@Component({
  selector: 'app-memorization-recommendations-modal',
  standalone: true,
  imports: [CommonModule, MemorizationRecommendationCardComponent, BibleTranslationPickerComponent],
  template: `
    @if (isOpen) {
      <div
        class="fixed inset-0 z-[200] flex items-center justify-center bg-gray-900/50 p-2 sm:p-4 safe-area-overlay overscroll-none touch-none"
        style="padding-top: max(8px, env(safe-area-inset-top)); padding-bottom: max(8px, env(safe-area-inset-bottom));"
        role="dialog"
        aria-modal="true"
        aria-labelledby="memorization-recommendations-title"
        (click)="onClose.emit()"
        (touchmove)="onModalTouchMove($event)"
      >
        <div
          class="w-full max-w-lg max-h-[min(92vh,720px)] flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden modal-panel-edge touch-none"
          (click)="$event.stopPropagation()"
        >
          <div
            class="shrink-0 flex items-center justify-between gap-3 px-4 py-3 modal-chrome-border-b touch-none"
          >
            <h2
              id="memorization-recommendations-title"
              class="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              Recommended verses
            </h2>
            <button
              type="button"
              (click)="onClose.emit()"
              class="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div
            #modalScroller
            class="flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y px-4 py-3"
          >
            @if (loading) {
              <div class="text-center py-8">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            } @else if (groupsWithVerses.length === 0) {
              <p class="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                No recommended verses yet. Check back later.
              </p>
            } @else {
              <p class="text-sm text-gray-600 dark:text-gray-300 mb-3">
                Expand a category, then tap a verse to add it to your memorization list.
              </p>
              <app-bible-translation-picker
                [translation]="translation"
                triggerAriaLabel="Bible translation for recommended verses"
                (translationChange)="onTranslationChanged($event)"
              />
              <div class="space-y-2">
                @for (group of groupsWithVerses; track group.category.id) {
                  <div class="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <button
                      type="button"
                      class="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left bg-gray-50 dark:bg-gray-900/40 hover:bg-inset-surface transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                      [attr.aria-expanded]="isCategoryExpanded(group.category.id)"
                      [attr.aria-controls]="
                        isCategoryExpanded(group.category.id)
                          ? 'rec-cat-panel-' + group.category.id
                          : null
                      "
                      (click)="toggleCategory(group.category.id)"
                    >
                      <span class="min-w-0">
                        <span
                          class="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200"
                        >
                          {{ group.category.name }}
                        </span>
                        <span class="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
                          {{ group.items.length }}
                          {{ group.items.length === 1 ? 'verse' : 'verses' }}
                        </span>
                      </span>
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        class="shrink-0 text-gray-500 dark:text-gray-400 transition-transform duration-200"
                        [class.rotate-180]="isCategoryExpanded(group.category.id)"
                        aria-hidden="true"
                      >
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>
                    @if (isCategoryExpanded(group.category.id)) {
                      <div
                        [id]="'rec-cat-panel-' + group.category.id"
                        class="px-3 pt-2 pb-1 bg-white dark:bg-gray-800"
                      >
                        @for (rec of group.items; track rec.id) {
                          <app-memorization-recommendation-card
                            [recommendation]="rec"
                            [translation]="translation"
                            [alreadyAdded]="isAlreadyAdded(rec)"
                            [busy]="busyId === rec.id"
                            (add)="onAddRecommendation($event)"
                          />
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            }
          </div>
        </div>
      </div>
    }
  `,
})
export class MemorizationRecommendationsModalComponent implements OnChanges, OnDestroy {
  private readonly memorization = inject(MemorizationService);

  private static readonly TOUCH_GUARD_OPTIONS: AddEventListenerOptions = {
    passive: false,
    capture: true,
  };

  private scrollLockEl: HTMLElement | null = null;
  private scrollLockPreviousOverflow = '';
  private scrollLockPreviousTouchAction = '';
  private bodyPreviousOverflow = '';
  private htmlPreviousOverflow = '';

  private readonly blockModalTouchMove = (event: TouchEvent): void => {
    if (!this.isOpen || this.isAllowedScrollTouch(event)) return;
    event.preventDefault();
  };

  @Input() isOpen = false;
  @Input() groups: MemorizationRecommendationCategoryGroup[] = [];
  @Input() alreadyAddedReferences: ReadonlySet<string> = new Set();
  @Input() busyId: string | null = null;
  @Input() loading = false;
  @Input() translation: BibleTranslation = 'esv';
  @Output() onClose = new EventEmitter<void>();
  @Output() add = new EventEmitter<MemorizationRecommendation>();
  @Output() translationChange = new EventEmitter<BibleTranslation>();

  @ViewChild('modalScroller') private modalScroller?: ElementRef<HTMLElement>;

  /** Categories the user has expanded; empty = all collapsed. */
  private expandedCategoryIds = new Set<string>();

  ngOnChanges(changes: SimpleChanges): void {
    if ('isOpen' in changes) {
      if (this.isOpen) {
        this.translation = this.memorization.getPreferredTranslation();
        this.lockBackgroundScroll();
        document.addEventListener(
          'touchmove',
          this.blockModalTouchMove,
          MemorizationRecommendationsModalComponent.TOUCH_GUARD_OPTIONS
        );
      } else {
        document.removeEventListener(
          'touchmove',
          this.blockModalTouchMove,
          MemorizationRecommendationsModalComponent.TOUCH_GUARD_OPTIONS
        );
        this.unlockBackgroundScroll();
        this.expandedCategoryIds.clear();
      }
    }
  }

  ngOnDestroy(): void {
    document.removeEventListener(
      'touchmove',
      this.blockModalTouchMove,
      MemorizationRecommendationsModalComponent.TOUCH_GUARD_OPTIONS
    );
    this.unlockBackgroundScroll();
  }

  onModalTouchMove(event: TouchEvent): void {
    this.blockModalTouchMove(event);
  }

  get groupsWithVerses(): MemorizationRecommendationCategoryGroup[] {
    return this.groups.filter((g) => g.items.length > 0);
  }

  isCategoryExpanded(categoryId: string): boolean {
    return this.expandedCategoryIds.has(categoryId);
  }

  toggleCategory(categoryId: string): void {
    if (this.expandedCategoryIds.has(categoryId)) {
      this.expandedCategoryIds.delete(categoryId);
    } else {
      this.expandedCategoryIds.add(categoryId);
    }
  }

  isAlreadyAdded(rec: MemorizationRecommendation): boolean {
    return this.alreadyAddedReferences.has(`${this.translation}:${rec.reference}`);
  }

  onTranslationChanged(next: BibleTranslation): void {
    this.translation = next;
    this.translationChange.emit(next);
  }

  onAddRecommendation(rec: MemorizationRecommendation): void {
    this.add.emit({ ...rec, translation: this.translation });
  }

  private lockBackgroundScroll(): void {
    this.bodyPreviousOverflow = document.body.style.overflow;
    this.htmlPreviousOverflow = document.documentElement.style.overflow;

    const scroller = this.findPageScrollContainer();
    if (scroller !== document.documentElement && scroller !== document.body) {
      this.scrollLockEl = scroller;
      this.scrollLockPreviousOverflow = scroller.style.overflow;
      this.scrollLockPreviousTouchAction = scroller.style.touchAction;
      scroller.style.overflow = 'hidden';
      scroller.style.touchAction = 'none';
    } else {
      this.scrollLockEl = null;
      this.scrollLockPreviousOverflow = '';
      this.scrollLockPreviousTouchAction = '';
    }

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  }

  private unlockBackgroundScroll(): void {
    if (this.scrollLockEl) {
      this.scrollLockEl.style.overflow = this.scrollLockPreviousOverflow;
      this.scrollLockEl.style.touchAction = this.scrollLockPreviousTouchAction;
      this.scrollLockEl = null;
    }
    document.body.style.overflow = this.bodyPreviousOverflow;
    document.documentElement.style.overflow = this.htmlPreviousOverflow;
  }

  /**
   * Allow scroll inside the modal list or a body-portaled scripture hover preview
   * (long-press popover lives outside `#modalScroller`).
   */
  private isAllowedScrollTouch(event: TouchEvent): boolean {
    if (!(event.target instanceof Node)) return false;
    const scroller = this.modalScroller?.nativeElement;
    if (scroller?.contains(event.target)) return true;
    const el =
      event.target instanceof Element
        ? event.target
        : event.target.parentElement;
    return !!el?.closest('[data-scripture-hover-popover]');
  }

  private findPageScrollContainer(): HTMLElement {
    const viewport = document.querySelector('.safe-area-viewport');
    if (viewport instanceof HTMLElement) return viewport;

    const scroller = this.modalScroller?.nativeElement;
    let node: HTMLElement | null = scroller?.parentElement ?? null;
    while (node && node !== document.body) {
      const overflowY = window.getComputedStyle(node).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') return node;
      node = node.parentElement;
    }
    return document.documentElement;
  }
}
