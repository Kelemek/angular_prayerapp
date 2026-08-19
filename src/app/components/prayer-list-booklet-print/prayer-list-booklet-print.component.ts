import { ChangeDetectionStrategy, Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { PrintService, type BookletTimeRange } from '../../services/print.service';
import { SupabaseService } from '../../services/supabase.service';
import { AdminSectionLoadingComponent } from '../admin-section-loading/admin-section-loading.component';
import type { BookletInsertMimeType, BookletInsertPage } from '../../types/booklet-insert-page';

const MAX_INSERT_PAGES = 10;
const MAX_INSERT_FILE_BYTES = 2 * 1024 * 1024;
const ACCEPTED_MIME: BookletInsertMimeType[] = ['image/png', 'image/jpeg'];

@Component({
  selector: 'app-prayer-list-booklet-print',
  standalone: true,
  imports: [CommonModule, DragDropModule, AdminSectionLoadingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div
  class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 transition-colors dark:hover:bg-gray-700/40"
  [class.cursor-pointer]="!sectionExpanded"
  (click)="!sectionExpanded && onSectionToggle()"
>
  <button
    type="button"
    id="prayer-list-booklet-print-trigger"
    class="admin-settings-collapsible-trigger cursor-pointer w-full flex min-h-12 items-center justify-between gap-2 text-left rounded-lg -mx-1 px-1 py-0.5 -my-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800"
    (click)="onSectionToggle(); $event.stopPropagation()"
    [attr.aria-expanded]="sectionExpanded"
    aria-controls="prayer-list-booklet-print-panel"
  >
    <span class="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 min-w-0">
      <svg
        class="text-blue-600 dark:text-blue-400 shrink-0"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        aria-hidden="true"
      >
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        <line x1="8" y1="7" x2="16" y2="7"></line>
        <line x1="8" y1="11" x2="14" y2="11"></line>
      </svg>
      Saddle-stitch prayer booklet
    </span>
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      class="shrink-0 text-gray-500 dark:text-gray-400 transition-transform duration-200"
      [class.rotate-180]="sectionExpanded"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  </button>

  @if (sectionExpanded) {
  <div
    id="prayer-list-booklet-print-panel"
    role="region"
    aria-labelledby="prayer-list-booklet-print-trigger"
    class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-6"
    (click)="$event.stopPropagation()"
  >
    <p class="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
      Opens a <strong>pre-imposed</strong> print layout: US Letter <strong>landscape</strong>, two half-letter panels per
      side, in <strong>saddle-stitch</strong> order (fold in the middle, staple at the fold). In the print dialog,
      choose <strong>double-sided</strong> and <strong>flip on short edge</strong>.
    </p>

    <div class="flex flex-col gap-2">
      <span class="text-sm font-medium text-gray-800 dark:text-gray-200">Time range</span>
      <div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Booklet time range">
        @for (opt of rangeOptions; track opt.value) {
        <button
          type="button"
          role="radio"
          [attr.aria-checked]="bookletRange === opt.value"
          (click)="setBookletRange(opt.value)"
          class="inline-flex items-center gap-2 cursor-pointer rounded-lg border px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800"
          [ngClass]="
            bookletRange === opt.value
              ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/20 dark:border-blue-400'
              : 'border-gray-200 dark:border-gray-600'
          "
        >
          {{ opt.label }}
        </button>
        }
      </div>
    </div>

    <div class="border-t border-gray-200 dark:border-gray-700 pt-6">
      <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Custom insert pages</h3>
      <p class="text-xs text-gray-600 dark:text-gray-400 mb-4 max-w-2xl">
        Each PNG or JPEG is one printed half-letter page, placed <strong>after answered prayers</strong> and
        <strong>before prayer prompts</strong>. Use portrait images sized for 5.5×8.5 in.
      </p>

      @if (insertPagesLoading) {
        <app-admin-section-loading message="Loading custom insert pages…" />
      } @else {
        @if (insertPagesError) {
          <p class="text-sm text-red-600 dark:text-red-400 mb-3" role="alert">{{ insertPagesError }}</p>
        }

        <div class="flex flex-wrap items-center gap-3 mb-4">
          <input
            #insertFileInput
            type="file"
            accept="image/png,image/jpeg"
            class="hidden"
            (change)="onInsertFileSelected($event)"
          />
          <button
            type="button"
            (click)="insertFileInput.click()"
            [disabled]="insertPagesBusy || insertPages.length >= maxInsertPages"
            class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 cursor-pointer"
          >
            Add page (PNG/JPG)
          </button>
          <span class="text-xs text-gray-500 dark:text-gray-400">
            {{ insertPages.length }} / {{ maxInsertPages }} pages · max 2 MB each
          </span>
        </div>

        @if (insertPages.length === 0) {
          <p class="text-sm text-gray-500 dark:text-gray-400 italic">No custom insert pages yet.</p>
        } @else {
          <div
            cdkDropList
            (cdkDropListDropped)="onInsertPageDrop($event)"
            [cdkDropListDisabled]="insertPagesBusy"
            class="space-y-3"
          >
            @for (page of insertPages; track page.id) {
              <div
                cdkDrag
                class="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/30"
              >
                <button
                  type="button"
                  cdkDragHandle
                  class="shrink-0 p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-grab"
                  aria-label="Drag to reorder"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <circle cx="9" cy="6" r="1.5"></circle>
                    <circle cx="15" cy="6" r="1.5"></circle>
                    <circle cx="9" cy="12" r="1.5"></circle>
                    <circle cx="15" cy="12" r="1.5"></circle>
                    <circle cx="9" cy="18" r="1.5"></circle>
                    <circle cx="15" cy="18" r="1.5"></circle>
                  </svg>
                </button>
                <img
                  [src]="page.image_data"
                  [alt]="page.label || 'Insert page thumbnail'"
                  class="w-16 h-20 object-contain rounded border border-gray-300 dark:border-gray-600 bg-white shrink-0"
                />
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {{ page.label || 'Untitled page' }}
                  </p>
                  <p class="text-xs text-gray-500 dark:text-gray-400">Page {{ page.sort_order + 1 }}</p>
                </div>
                <button
                  type="button"
                  (click)="deleteInsertPage(page)"
                  [disabled]="insertPagesBusy"
                  class="shrink-0 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 cursor-pointer"
                >
                  Remove
                </button>
              </div>
            }
          </div>
        }
      }
    </div>

    <div>
      <button
        type="button"
        (click)="openBookletPrint()"
        [disabled]="isPrinting"
        class="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
      >
        @if (isPrinting) {
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        }
        @if (!isPrinting) {
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M6 9V2h12v7"></path>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h2"></path>
          <path d="M18 18h2a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2h-2"></path>
          <rect x="6" y="14" width="12" height="8"></rect>
        </svg>
        }
        {{ isPrinting ? 'Opening…' : 'Open for printing' }}
      </button>
    </div>
  </div>
  }
</div>
  `
})
export class PrayerListBookletPrintComponent {
  sectionExpanded = false;
  private sectionInitialLoadDone = false;
  isPrinting = false;
  bookletRange: BookletTimeRange = 'month';

  readonly maxInsertPages = MAX_INSERT_PAGES;
  insertPages: BookletInsertPage[] = [];
  insertPagesLoading = false;
  insertPagesBusy = false;
  insertPagesError = '';

  readonly rangeOptions: Array<{ value: BookletTimeRange; label: string }> = [
    { value: 'week', label: '1 week' },
    { value: 'twoweeks', label: '2 weeks' },
    { value: 'month', label: '1 month' },
    { value: 'twomonths', label: '2 months' }
  ];

  constructor(
    private readonly printService: PrintService,
    private readonly supabase: SupabaseService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  onSectionToggle(): void {
    this.sectionExpanded = !this.sectionExpanded;
    if (this.sectionExpanded && !this.sectionInitialLoadDone) {
      this.sectionInitialLoadDone = true;
      void this.loadInsertPages();
    }
    this.cdr.markForCheck();
  }

  setBookletRange(value: BookletTimeRange): void {
    this.bookletRange = value;
    this.cdr.markForCheck();
  }

  async loadInsertPages(): Promise<void> {
    this.insertPagesLoading = true;
    this.insertPagesError = '';
    this.cdr.markForCheck();
    try {
      const { data, error } = await this.supabase.client
        .from('booklet_insert_pages')
        .select('id, sort_order, label, mime_type, image_data')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      this.insertPages = (data ?? []) as BookletInsertPage[];
    } catch (err: unknown) {
      console.error('[PrayerListBookletPrint] load insert pages:', err);
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : '';
      this.insertPagesError = message.includes('does not exist')
        ? 'Custom insert pages table is missing. Apply the latest Supabase migrations.'
        : message
          ? `Failed to load custom insert pages: ${message}`
          : 'Failed to load custom insert pages.';
    } finally {
      this.insertPagesLoading = false;
      this.cdr.markForCheck();
    }
  }

  onInsertFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (this.insertPages.length >= MAX_INSERT_PAGES) {
      this.insertPagesError = `Maximum ${MAX_INSERT_PAGES} insert pages allowed.`;
      this.cdr.markForCheck();
      return;
    }

    if (!ACCEPTED_MIME.includes(file.type as BookletInsertMimeType)) {
      this.insertPagesError = 'Only PNG and JPEG images are supported.';
      this.cdr.markForCheck();
      return;
    }

    if (file.size > MAX_INSERT_FILE_BYTES) {
      this.insertPagesError = 'Image must be 2 MB or smaller.';
      this.cdr.markForCheck();
      return;
    }

    this.insertPagesError = '';
    this.insertPagesBusy = true;
    this.cdr.markForCheck();

    const reader = new FileReader();
    reader.onload = () => {
      void this.saveNewInsertPage(file.name, file.type as BookletInsertMimeType, reader.result as string);
    };
    reader.onerror = () => {
      this.insertPagesError = 'Failed to read image file.';
      this.insertPagesBusy = false;
      this.cdr.markForCheck();
    };
    reader.readAsDataURL(file);
  }

  private async saveNewInsertPage(
    fileName: string,
    mimeType: BookletInsertMimeType,
    imageData: string
  ): Promise<void> {
    try {
      const sortOrder = this.insertPages.length;
      const { data, error } = await this.supabase.client
        .from('booklet_insert_pages')
        .insert({
          sort_order: sortOrder,
          label: fileName,
          mime_type: mimeType,
          image_data: imageData,
        })
        .select('id, sort_order, label, mime_type, image_data')
        .single();

      if (error) throw error;
      this.insertPages = [...this.insertPages, data as BookletInsertPage];
    } catch (err) {
      console.error('[PrayerListBookletPrint] save insert page:', err);
      this.insertPagesError = 'Failed to save insert page.';
    } finally {
      this.insertPagesBusy = false;
      this.cdr.markForCheck();
    }
  }

  async onInsertPageDrop(event: CdkDragDrop<BookletInsertPage[]>): Promise<void> {
    if (event.previousIndex === event.currentIndex) return;

    const original = [...this.insertPages];
    moveItemInArray(this.insertPages, event.previousIndex, event.currentIndex);
    this.insertPagesBusy = true;
    this.insertPagesError = '';
    this.cdr.markForCheck();

    try {
      const updates = this.insertPages.map((page, idx) =>
        this.supabase.client.from('booklet_insert_pages').update({ sort_order: idx }).eq('id', page.id)
      );
      const results = await Promise.all(updates);
      const failed = results.find(r => r.error);
      if (failed?.error) throw failed.error;
      this.insertPages = this.insertPages.map((p, idx) => ({ ...p, sort_order: idx }));
    } catch (err) {
      console.error('[PrayerListBookletPrint] reorder insert pages:', err);
      this.insertPages = original;
      this.insertPagesError = 'Failed to reorder pages.';
    } finally {
      this.insertPagesBusy = false;
      this.cdr.markForCheck();
    }
  }

  async deleteInsertPage(page: BookletInsertPage): Promise<void> {
    this.insertPagesBusy = true;
    this.insertPagesError = '';
    this.cdr.markForCheck();
    try {
      const { error } = await this.supabase.client.from('booklet_insert_pages').delete().eq('id', page.id);
      if (error) throw error;
      this.insertPages = this.insertPages.filter(p => p.id !== page.id);
      await this.normalizeInsertPageSortOrders();
    } catch (err) {
      console.error('[PrayerListBookletPrint] delete insert page:', err);
      this.insertPagesError = 'Failed to remove page.';
    } finally {
      this.insertPagesBusy = false;
      this.cdr.markForCheck();
    }
  }

  private async normalizeInsertPageSortOrders(): Promise<void> {
    const updates = this.insertPages.map((page, idx) =>
      this.supabase.client.from('booklet_insert_pages').update({ sort_order: idx }).eq('id', page.id)
    );
    const results = await Promise.all(updates);
    const failed = results.find(r => r.error);
    if (failed?.error) throw failed.error;
    this.insertPages = this.insertPages.map((p, idx) => ({ ...p, sort_order: idx }));
  }

  private isNativeApp(): boolean {
    try {
      const hasCapacitor = typeof (window as unknown as { Capacitor?: unknown }).Capacitor !== 'undefined';
      const platform = hasCapacitor
        ? (window as unknown as { Capacitor?: { getPlatform?: () => string } }).Capacitor?.getPlatform?.()
        : null;
      return hasCapacitor && (platform === 'ios' || platform === 'android');
    } catch {
      return false;
    }
  }

  async openBookletPrint(): Promise<void> {
    this.isPrinting = true;
    this.cdr.markForCheck();
    const isNative = this.isNativeApp();
    const newWindow = !isNative ? window.open('', '_blank') : null;
    try {
      await this.printService.downloadPrintableBookletPrayerList(this.bookletRange, newWindow);
    } catch (e) {
      console.error('Booklet print error', e);
      if (newWindow) {
        newWindow.close();
      }
    } finally {
      this.isPrinting = false;
      this.cdr.markForCheck();
    }
  }
}
