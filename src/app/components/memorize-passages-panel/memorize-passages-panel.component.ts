import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  loadMemorizeListView,
  saveMemorizeListView,
  type MemorizeListView,
} from '../../lib/memorization/memorization-list-prefs';
import {
  buildFilteredMemorizedList,
  type MemorizedVerseSection,
} from '../../lib/memorization/memorization-list-sections';
import type { MemorizedItem } from '../../types/memorization';
import { MemorizationActionBarComponent } from '../memorization-action-bar/memorization-action-bar.component';
import { MemorizedVerseCardComponent } from '../memorized-verse-card/memorized-verse-card.component';
import { MemorizedVersesTableComponent } from '../memorized-verses-table/memorized-verses-table.component';

@Component({
  selector: 'app-memorize-passages-panel',
  standalone: true,
  imports: [
    CommonModule,
    MemorizationActionBarComponent,
    MemorizedVerseCardComponent,
    MemorizedVersesTableComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-memorization-action-bar
      [addVersesActive]="addVersesActive"
      [bibleBooksActive]="bibleBooksActive"
      [recommendedActive]="recommendedActive"
      [listView]="listView"
      (addVerses)="addVerses.emit()"
      (addBibleBooks)="addBibleBooks.emit()"
      (openRecommended)="openRecommended.emit()"
      (listViewChange)="onListViewChange($event)"
    />

    @let views = filteredListViews;

    @if (!loading && items.length === 0) {
      <div
        id="tour-memorize-empty-state"
        data-testid="memorize-empty-state"
        class="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-md dark:border-gray-700 dark:bg-gray-800"
      >
        <h3 class="mb-2 text-lg font-medium text-gray-700 dark:text-gray-200">
          No memorized passages yet
        </h3>
        <p class="mx-auto max-w-lg text-gray-500 dark:text-gray-400">
          Use
          <span class="font-medium text-gray-600 dark:text-gray-300">Add Verses</span>
          to pick passages to memorize,
          <span class="font-medium text-gray-600 dark:text-gray-300">Bible Books</span>
          to memorize the names of the books of the Bible, or
          <span class="font-medium text-gray-600 dark:text-gray-300">Recommended</span>
          for curated passages by biblical counseling topics. Your passages will
          appear here—tap one to practice.
        </p>
      </div>
    } @else if (
      !loading &&
      items.length > 0 &&
      views.filtered.length === 0 &&
      hasSearchTerm
    ) {
      <div
        data-testid="memorize-search-empty"
        class="rounded-lg border border-gray-200 bg-white p-8 text-center shadow-md dark:border-gray-700 dark:bg-gray-800"
      >
        <svg
          class="mx-auto mb-4 h-16 w-16 text-gray-400 dark:text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          ></path>
        </svg>
        <h3 class="mb-2 text-lg font-medium text-gray-700 dark:text-gray-200">
          No passages found
        </h3>
        <p class="text-gray-500 dark:text-gray-400">
          Try adjusting your search terms
        </p>
      </div>
    } @else if (listView === 'table' && views.filtered.length > 0) {
      <app-memorized-verses-table
        [items]="views.filtered"
        (practice)="practice.emit($event)"
        (remove)="remove.emit($event)"
      />
    } @else if (listView === 'cards') {
      @for (section of views.sections; track section.title) {
        <p [class]="section.headingClass">
          {{ section.title }}
        </p>
        <div [class]="verseGridClass" role="list">
          @for (item of section.items; track item.id) {
            <app-memorized-verse-card
              [item]="item"
              [tourMemorizeAnchors]="item.id === items[0]?.id"
              (practice)="practice.emit($event)"
              (remove)="remove.emit($event)"
            />
          }
        </div>
      }
    }
  `,
})
export class MemorizePassagesPanelComponent {
  @Input() items: MemorizedItem[] = [];
  @Input() searchTerm = '';
  @Input() loading = false;
  @Input() addVersesActive = false;
  @Input() bibleBooksActive = false;
  @Input() recommendedActive = false;

  @Output() addVerses = new EventEmitter<void>();
  @Output() addBibleBooks = new EventEmitter<void>();
  @Output() openRecommended = new EventEmitter<void>();
  @Output() practice = new EventEmitter<MemorizedItem>();
  @Output() remove = new EventEmitter<MemorizedItem>();

  listView: MemorizeListView = loadMemorizeListView();

  readonly verseGridClass =
    'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3';

  private readonly cdr = inject(ChangeDetectorRef);

  get hasSearchTerm(): boolean {
    return !!this.searchTerm.trim();
  }

  get filteredListViews(): {
    filtered: MemorizedItem[];
    sections: MemorizedVerseSection[];
  } {
    return buildFilteredMemorizedList(this.items, this.searchTerm);
  }

  onListViewChange(view: MemorizeListView): void {
    this.listView = view;
    saveMemorizeListView(view);
    this.cdr.markForCheck();
  }
}
