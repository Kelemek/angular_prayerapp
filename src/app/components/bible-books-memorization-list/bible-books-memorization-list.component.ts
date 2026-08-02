import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  bibleBooksTestamentsForScope,
  booksForScope,
  type BibleBooksMemorizationScope,
} from '../../lib/memorization/bibleBooksMemorization';
import { resetBibleBooksListScroll } from './bible-books-memorization-list-scroll';

type TestamentTab = 'ot' | 'nt';

@Component({
  selector: 'app-bible-books-memorization-list',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div [class]="rootClass">
      @if (showTabs) {
        <div
          class="flex shrink-0 gap-2 mb-3"
          role="tablist"
          aria-label="Testament"
        >
          <button
            type="button"
            role="tab"
            [attr.aria-selected]="testament === 'ot'"
            (click)="setTestament('ot')"
            class="flex-1 cursor-pointer px-4 py-2.5 text-sm rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-800"
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
            class="flex-1 cursor-pointer px-4 py-2.5 text-sm rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-800"
            [class]="testament === 'nt'
              ? 'bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700 hover:border-blue-300 dark:hover:border-blue-600'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 hover:border-gray-400 dark:hover:border-gray-500'"
          >
            New Testament
          </button>
        </div>
      }

      <div
        #bookListScroll
        [class]="bookListScrollClass"
        data-testid="bible-books-memorization-list"
      >
        <div class="space-y-0 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          @for (book of filteredBooks; track book.id) {
            <div
              [attr.data-bible-books-memorization-book-id]="book.id"
              class="border-b border-gray-200 dark:border-gray-700 last:border-b-0 px-3 py-3 text-sm font-medium text-gray-800 dark:text-gray-100 min-h-[44px] flex items-center"
            >
              {{ book.name }}
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class BibleBooksMemorizationListComponent implements OnInit, OnChanges {
  @Input({ required: true }) scope!: BibleBooksMemorizationScope;
  @Input() className = '';
  /** When false, list grows with content and a parent panel scrolls (add modal). */
  @Input() innerScroll = true;

  @ViewChild('bookListScroll') bookListScrollRef?: ElementRef<HTMLDivElement>;

  testament: TestamentTab = 'ot';
  showTabs = false;
  filteredBooks = booksForScope('all');

  get rootClass(): string {
    return this.className;
  }

  get bookListScrollClass(): string {
    if (!this.innerScroll) {
      return '';
    }
    return 'overflow-y-auto overscroll-y-contain touch-pan-y max-h-[min(50vh,360px)]';
  }

  ngOnInit(): void {
    this.initForScope();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['scope']) {
      this.initForScope();
      this.resetListScroll();
    }
  }

  setTestament(tab: TestamentTab): void {
    this.testament = tab;
    this.updateFilteredBooks();
    this.resetListScroll();
  }

  private resetListScroll(): void {
    resetBibleBooksListScroll(
      this.bookListScrollRef?.nativeElement ?? null,
      this.innerScroll
    );
  }

  private initForScope(): void {
    const testaments = bibleBooksTestamentsForScope(this.scope);
    this.showTabs = testaments.length > 1;
    if (this.scope === 'nt') {
      this.testament = 'nt';
    } else if (this.scope === 'ot') {
      this.testament = 'ot';
    }
    this.updateFilteredBooks();
  }

  private updateFilteredBooks(): void {
    if (!this.showTabs) {
      this.filteredBooks = booksForScope(this.scope);
      return;
    }
    this.filteredBooks = booksForScope(this.scope).filter((b) => b.testament === this.testament);
  }
}
