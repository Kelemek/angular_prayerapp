import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  fetchSubscriberPickRows,
  SUBSCRIBER_PICK_BLUR_MS,
  SUBSCRIBER_PICK_DEBOUNCE_MS,
  SUBSCRIBER_PICK_MIN_CHARS,
  SUBSCRIBER_PICK_RESULT_LIMIT,
  type SubscriberPickRow,
} from '../../lib/admin-subscriber-pick';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

export type AdminSubscriberPickAccent = 'green' | 'blue';

@Component({
  selector: 'app-admin-subscriber-pick',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative" [attr.id]="domId">
      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Find subscriber
      </label>
      <input
        type="search"
        [(ngModel)]="searchQuery"
        [name]="inputName"
        (ngModelChange)="onQueryChange($event)"
        (focus)="onFocus()"
        (blur)="onBlur()"
        autocomplete="off"
        placeholder="Search by name or email (min. 2 characters)…"
        [class]="
          'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 ' +
          focusRingClass
        "
      />
      @if (loading) {
        <div class="pointer-events-none absolute right-3 top-9">
          <div
            [class]="
              'animate-spin rounded-full h-4 w-4 border-2 border-t-transparent ' + spinnerBorderClass
            "
          ></div>
        </div>
      }
      @if (showDropdown && results.length > 0) {
        <ul
          class="absolute z-30 mt-1 w-full max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-lg"
          role="listbox"
        >
          @for (row of results; track row.email) {
            <li>
              <button
                type="button"
                class="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700/80 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                (mousedown)="selectRow(row, $event)"
              >
                <div class="font-medium text-gray-900 dark:text-gray-100">{{ row.name }}</div>
                <div class="text-sm text-gray-600 dark:text-gray-400">{{ row.email }}</div>
              </button>
            </li>
          }
        </ul>
      }
      @if (
        searchQuery.trim().length >= minChars && !loading && hasSearched && results.length === 0
      ) {
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">No matching subscribers</p>
      }
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Debounced search; only name and email are loaded (limited to
        {{ resultLimit }} matches).
      </p>
    </div>
  `,
})
export class AdminSubscriberPickComponent implements OnDestroy {
  @Input() domId?: string;
  @Input() accent: AdminSubscriberPickAccent = 'green';
  @Input() inputName = 'subscriberPickQuery';

  @Output() subscriberSelected = new EventEmitter<SubscriberPickRow>();

  readonly minChars = SUBSCRIBER_PICK_MIN_CHARS;
  readonly resultLimit = SUBSCRIBER_PICK_RESULT_LIMIT;

  searchQuery = '';
  results: SubscriberPickRow[] = [];
  loading = false;
  hasSearched = false;
  showDropdown = false;

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private blurTimer: ReturnType<typeof setTimeout> | null = null;
  private requestSeq = 0;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly toast: ToastService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  get focusRingClass(): string {
    return this.accent === 'green' ? 'focus:ring-green-500' : 'focus:ring-blue-500';
  }

  get spinnerBorderClass(): string {
    return this.accent === 'green' ? 'border-green-600' : 'border-blue-600';
  }

  ngOnDestroy(): void {
    this.clearTimers();
    this.requestSeq++;
  }

  reset(): void {
    this.searchQuery = '';
    this.results = [];
    this.hasSearched = false;
    this.loading = false;
    this.showDropdown = false;
    this.clearTimers();
    this.requestSeq++;
    this.cdr.markForCheck();
  }

  onQueryChange(value: string): void {
    this.searchQuery = value;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    const trimmed = value.trim();
    if (trimmed.length < this.minChars) {
      this.results = [];
      this.hasSearched = false;
      this.loading = false;
      this.showDropdown = false;
      this.cdr.markForCheck();
      return;
    }

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.runSearch(trimmed);
    }, SUBSCRIBER_PICK_DEBOUNCE_MS);
  }

  onFocus(): void {
    if (this.results.length > 0) {
      this.showDropdown = true;
    }
  }

  onBlur(): void {
    if (this.blurTimer) {
      clearTimeout(this.blurTimer);
      this.blurTimer = null;
    }
    this.blurTimer = setTimeout(() => {
      this.blurTimer = null;
      this.showDropdown = false;
      this.cdr.markForCheck();
    }, SUBSCRIBER_PICK_BLUR_MS);
  }

  selectRow(row: SubscriberPickRow, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.subscriberSelected.emit(row);
    this.reset();
  }

  private async runSearch(trimmed: string): Promise<void> {
    const seq = ++this.requestSeq;
    this.loading = true;
    this.hasSearched = false;
    this.cdr.markForCheck();

    try {
      const rows = await fetchSubscriberPickRows(this.supabaseService.getClient(), trimmed);
      if (seq !== this.requestSeq) {
        return;
      }
      this.results = rows;
      this.hasSearched = true;
      this.showDropdown = rows.length > 0;
    } catch (err: unknown) {
      if (seq !== this.requestSeq) {
        return;
      }
      console.error('Subscriber search error:', err);
      this.results = [];
      this.hasSearched = true;
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message?: string }).message)
          : '';
      this.toast.error(msg || 'Failed to search subscribers');
    } finally {
      if (seq === this.requestSeq) {
        this.loading = false;
        this.cdr.markForCheck();
      }
    }
  }

  private clearTimers(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.blurTimer) {
      clearTimeout(this.blurTimer);
      this.blurTimer = null;
    }
  }
}
