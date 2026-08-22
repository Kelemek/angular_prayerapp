import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { BibleTranslationPickerComponent } from '../bible-translation-picker/bible-translation-picker.component';
import { BIBLE_BOOKS_PUBLIC } from '../../lib/memorization/bibleCanonPublic';
import { buildBiblePassageReference } from '../../lib/memorization/buildBiblePassageReference';
import type { BibleBookPublic } from '../../lib/memorization/bible-structure-types';
import { MemorizationService } from '../../services/memorization.service';
import type { BibleTranslation } from '../../types/memorization';

type Testament = 'ot' | 'nt';

const TESTAMENT_KEY = 'prayer_app_memorize_add_testament';

@Component({
  selector: 'app-bible-passage-picker-modal',
  standalone: true,
  imports: [CommonModule, BibleTranslationPickerComponent],
  styles: [
    `
      .picker-book-list {
        scrollbar-width: none;
        -ms-overflow-style: none;
      }
      .picker-book-list::-webkit-scrollbar {
        display: none;
      }
    `,
  ],
  template: `
    @if (isOpen) {
    <div
      class="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-gray-900/50 p-0 sm:p-4 safe-area-overlay overscroll-none touch-none"
      style="padding-top: max(8px, env(safe-area-inset-top)); padding-bottom: max(8px, env(safe-area-inset-bottom));"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bible-passage-picker-title"
      (click)="close.emit()"
      (touchmove)="onModalTouchMove($event)"
    >
      <div
        class="w-full sm:max-w-lg max-h-[min(92vh,720px)] flex flex-col bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-lg shadow-xl modal-panel-edge overflow-hidden touch-none"
        (click)="$event.stopPropagation()"
        (touchmove)="onModalTouchMove($event)"
      >
        <div class="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 modal-chrome-header touch-none">
          <h2 id="bible-passage-picker-title" class="text-lg font-semibold text-gray-800 dark:text-gray-200">
            {{ selectedChapterId ? 'Pick Verse Range' : 'Pick Chapter' }}
          </h2>
          <button
            type="button"
            (click)="close.emit()"
            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md p-1 cursor-pointer"
            aria-label="Close"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div class="shrink-0 px-4 sm:px-6 pt-3 touch-none">
            <app-bible-translation-picker
              [translation]="translation"
              triggerId="bible-translation-picker-trigger"
              (translationChange)="onTranslationChanged($event)"
            />

            <div
              class="shrink-0 flex gap-2 mb-3"
              role="tablist"
              aria-label="Testament"
            >
              <button
                type="button"
                role="tab"
                [attr.aria-selected]="testament === 'ot'"
                (click)="setTestament('ot')"
                class="flex-1 px-4 py-2.5 text-sm rounded-lg font-medium transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-800"
                [class]="testament === 'ot'
                  ? 'bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-400 dark:hover:border-gray-500'"
              >
                Old Testament
              </button>
              <button
                type="button"
                role="tab"
                [attr.aria-selected]="testament === 'nt'"
                (click)="setTestament('nt')"
                class="flex-1 px-4 py-2.5 text-sm rounded-lg font-medium transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-800"
                [class]="testament === 'nt'
                  ? 'bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-400 dark:hover:border-gray-500'"
              >
                New Testament
              </button>
            </div>
          </div>

          <div
            #bookListScroller
            class="picker-book-list flex-1 min-h-0 overflow-y-auto overscroll-y-contain touch-pan-y px-4 sm:px-6 pb-3"
          >
            <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              @for (book of filteredBooks; track book.id) {
              <div
                class="border-b border-gray-100 dark:border-gray-700 last:border-b-0 scroll-mt-3"
                [attr.data-book-id]="book.id"
              >
                <button
                  type="button"
                  (click)="toggleBook(book)"
                  class="w-full flex items-start justify-between gap-2 px-3 py-3 min-h-[48px] text-left text-sm font-medium text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer touch-manipulation"
                >
                  <span class="min-w-0 flex-1 leading-snug">{{ book.name }}</span>
                  <svg
                    class="w-5 h-5 shrink-0 text-gray-400 mt-0.5 transition-transform"
                    [class.rotate-180]="expandedBookId === book.id"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                @if (expandedBookId === book.id) {
                <div class="px-3 pb-3">
                  <p class="text-xs font-medium text-gray-600 dark:text-gray-400 pt-2 pb-1.5">Chapter</p>
                  <div class="grid grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] gap-2">
                    @for (ch of sortedChapters(book); track ch.id) {
                    <button
                      type="button"
                      [attr.data-chapter-id]="ch.id"
                      (click)="onChapterClick(book, ch.id, +ch.number)"
                      class="w-full min-h-[44px] px-2 py-2 text-sm rounded-lg border cursor-pointer transition-colors inline-flex items-center justify-center touch-manipulation"
                      [class]="selectedChapterId === ch.id && selectedBookId === book.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-600 dark:border-blue-500'
                        : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'"
                    >
                      {{ ch.number }}
                    </button>
                    }
                  </div>

                  @if (selectedBookId === book.id && selectedChapterId) {
                  <div #verseSection class="mt-4 scroll-mt-3">
                    <p class="text-xs font-medium text-gray-600 dark:text-gray-400 pb-1.5">Select verse(s)</p>
                    @if (verseNumbers.length > 0) {
                    <div class="grid grid-cols-[repeat(auto-fill,minmax(3.5rem,1fr))] gap-2">
                      @for (n of verseNumbers; track n) {
                      <button
                        type="button"
                        (click)="onVerseClick(n)"
                        class="w-full min-h-[44px] px-2 py-2 text-sm rounded-lg border cursor-pointer transition-colors inline-flex items-center justify-center touch-manipulation"
                        [class]="inRange(n)
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-600 dark:border-blue-500'
                          : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'"
                      >
                        {{ n }}
                      </button>
                      }
                    </div>
                    }
                  </div>
                  }
                </div>
                }
              </div>
              }
            </div>
          </div>

          <div
            class="shrink-0 modal-chrome-footer px-4 sm:px-6 py-3 touch-none"
            style="padding-bottom: max(0.75rem, env(safe-area-inset-bottom));"
            (touchmove)="onModalTouchMove($event)"
          >
            <button
              type="button"
              [disabled]="!canConfirm"
              (click)="confirm()"
              class="w-full min-h-[48px] py-2.5 rounded-lg font-medium transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600 disabled:hover:bg-blue-100 dark:disabled:hover:bg-blue-900/40 disabled:hover:border-blue-200 dark:disabled:hover:border-blue-700"
            >
              {{ busy ? 'Adding…' : confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    </div>
    }
  `,
})
export class BiblePassagePickerModalComponent implements OnChanges, OnDestroy {
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
    if (!this.isOpen || this.isBookListTouch(event)) return;
    event.preventDefault();
  };

  @Input() isOpen = false;
  @Input() confirmLabel = 'Add';
  /** Parent sets true while saving (e.g. scripture fetch + DB insert). */
  @Input() busy = false;
  @Output() close = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<string>();
  @Output() translationChange = new EventEmitter<BibleTranslation>();

  translation: BibleTranslation = 'esv';

  @ViewChild(BibleTranslationPickerComponent)
  private translationPicker?: BibleTranslationPickerComponent;
  @ViewChild('bookListScroller') private bookListScroller?: ElementRef<HTMLElement>;
  @ViewChild('verseSection') private verseSection?: ElementRef<HTMLElement>;

  testament: Testament = 'ot';
  expandedBookId: string | null = null;
  selectedChapterId: string | null = null;
  selectedChapterNum: number | null = null;
  selectedBookId: string | null = null;
  selectedBookName = '';
  verseCount: number | null = null;
  verseStart: number | null = null;
  verseEnd: number | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if ('isOpen' in changes) {
      if (this.isOpen) {
        this.lockBackgroundScroll();
        document.addEventListener(
          'touchmove',
          this.blockModalTouchMove,
          BiblePassagePickerModalComponent.TOUCH_GUARD_OPTIONS
        );
      } else {
        document.removeEventListener(
          'touchmove',
          this.blockModalTouchMove,
          BiblePassagePickerModalComponent.TOUCH_GUARD_OPTIONS
        );
        this.unlockBackgroundScroll();
      }
    }
    if (changes['isOpen']?.currentValue === true) {
      this.translation = this.memorization.getPreferredTranslation();
      this.testament = this.readTestament();
      this.resetSelection();
      this.expandedBookId = null;
    }
  }

  ngOnDestroy(): void {
    document.removeEventListener(
      'touchmove',
      this.blockModalTouchMove,
      BiblePassagePickerModalComponent.TOUCH_GUARD_OPTIONS
    );
    this.unlockBackgroundScroll();
  }

  onModalTouchMove(event: TouchEvent): void {
    this.blockModalTouchMove(event);
  }

  get filteredBooks(): BibleBookPublic[] {
    return BIBLE_BOOKS_PUBLIC.filter((b) => b.testament === this.testament);
  }

  get verseNumbers(): number[] {
    if (!this.verseCount || this.verseCount <= 0) return [];
    return Array.from({ length: this.verseCount }, (_, i) => i + 1);
  }

  get canConfirm(): boolean {
    return (
      this.selectedBookId !== null &&
      this.selectedChapterNum !== null &&
      !this.busy
    );
  }

  sortedChapters(book: BibleBookPublic) {
    return [...book.chapters].sort((a, b) => +a.number - +b.number);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.isOpen) return;
    if (this.translationPicker?.isDropdownOpen) {
      this.translationPicker.closeDropdown();
      return;
    }
    this.close.emit();
  }

  onTranslationChanged(next: BibleTranslation): void {
    this.translation = next;
    this.translationChange.emit(next);
  }

  setTestament(next: Testament): void {
    this.testament = next;
    try {
      localStorage.setItem(TESTAMENT_KEY, next);
    } catch {
      /* ignore */
    }
    this.expandedBookId = null;
    this.selectedBookId = null;
    this.selectedBookName = '';
    this.resetSelection();
    requestAnimationFrame(() => this.resetBookListScroll());
  }

  toggleBook(book: BibleBookPublic): void {
    const wasExpanded = this.expandedBookId === book.id;
    if (wasExpanded) {
      this.expandedBookId = null;
      return;
    }
    this.expandedBookId = book.id;
    if (this.selectedBookId !== book.id) {
      this.resetSelection();
      this.selectedBookId = null;
      this.selectedBookName = '';
    }
    this.scheduleScrollBookRow(book.id);
  }

  onChapterClick(book: BibleBookPublic, chapterId: string, chapterNumber: number): void {
    const ch = book.chapters.find((c) => c.id === chapterId);
    this.selectedBookId = book.id;
    this.selectedBookName = book.name;
    this.selectedChapterId = chapterId;
    this.selectedChapterNum = chapterNumber;
    this.verseStart = null;
    this.verseEnd = null;
    this.verseCount = typeof ch?.verseCount === 'number' ? ch.verseCount : 0;
    this.scheduleScrollVerseSection();
  }

  onVerseClick(v: number): void {
    if (this.verseStart === null) {
      this.verseStart = v;
      this.verseEnd = null;
      return;
    }
    if (this.verseEnd === null) {
      if (v === this.verseStart) {
        this.verseStart = null;
        return;
      }
      const lo = Math.min(v, this.verseStart);
      const hi = Math.max(v, this.verseStart);
      this.verseStart = lo;
      this.verseEnd = hi;
      return;
    }
    this.verseStart = v;
    this.verseEnd = null;
  }

  inRange(n: number): boolean {
    if (this.verseStart === null) return false;
    if (this.verseEnd === null) return n === this.verseStart;
    const lo = Math.min(this.verseStart, this.verseEnd);
    const hi = Math.max(this.verseStart, this.verseEnd);
    return n >= lo && n <= hi;
  }

  confirm(): void {
    if (!this.canConfirm || this.selectedBookId === null || this.selectedChapterNum === null) return;
    const ref = buildBiblePassageReference(
      this.selectedBookId,
      this.selectedBookName,
      this.selectedChapterNum,
      this.verseStart,
      this.verseEnd
    );
    this.confirmed.emit(ref);
  }

  private resetSelection(): void {
    this.selectedChapterId = null;
    this.selectedChapterNum = null;
    this.verseCount = null;
    this.verseStart = null;
    this.verseEnd = null;
  }

  private resetBookListScroll(): void {
    const scroller = this.bookListScroller?.nativeElement;
    if (scroller) scroller.scrollTop = 0;
  }

  private scheduleScrollBookRow(bookId: string): void {
    requestAnimationFrame(() => {
      const scroller = this.bookListScroller?.nativeElement;
      if (!scroller) return;
      const row = scroller.querySelector<HTMLElement>(`[data-book-id="${bookId}"]`);
      if (!row) return;
      this.scrollElementIntoScroller(row);
    });
  }

  private scheduleScrollVerseSection(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = this.verseSection?.nativeElement;
        if (!el) return;
        this.scrollElementIntoScroller(el);
      });
    });
  }

  private scrollElementIntoScroller(element: HTMLElement): void {
    const reducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollIntoView({
      block: 'start',
      behavior: reducedMotion ? 'instant' : 'smooth',
    });
  }

  private readTestament(): Testament {
    try {
      const v = localStorage.getItem(TESTAMENT_KEY);
      if (v === 'ot' || v === 'nt') return v;
    } catch {
      /* ignore */
    }
    return 'ot';
  }

  private lockBackgroundScroll(): void {
    // Capture body/html first. If the page scroller is documentElement (e.g. Admin
    // has no `.safe-area-viewport`), mutating it before this would make unlock restore
    // `hidden` and leave the page unscrollable.
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

  private isBookListTouch(event: TouchEvent): boolean {
    const scroller = this.bookListScroller?.nativeElement;
    return !!(
      scroller &&
      event.target instanceof Node &&
      scroller.contains(event.target)
    );
  }

  private findPageScrollContainer(): HTMLElement {
    const viewport = document.querySelector('.safe-area-viewport');
    if (viewport instanceof HTMLElement) return viewport;

    const scroller = this.bookListScroller?.nativeElement;
    let node: HTMLElement | null = scroller?.parentElement ?? null;
    while (node && node !== document.body) {
      const overflowY = window.getComputedStyle(node).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') return node;
      node = node.parentElement;
    }
    return document.documentElement;
  }
}
