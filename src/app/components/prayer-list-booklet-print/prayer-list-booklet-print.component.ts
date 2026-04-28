import { ChangeDetectionStrategy, Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PrintService, type BookletTimeRange } from '../../services/print.service';

@Component({
  selector: 'app-prayer-list-booklet-print',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div
  class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40"
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
    class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4"
  >
    <p class="text-sm text-gray-600 dark:text-gray-400 max-w-2xl">
      Opens a <strong>pre-imposed</strong> print layout: US Letter <strong>landscape</strong>, two half-letter panels per
      side, in <strong>saddle-stitch</strong> order (fold in the middle, staple at the fold). In the print dialog,
      choose <strong>double-sided</strong> and <strong>flip on short edge</strong>.
    </p>

    <div class="flex flex-col gap-2">
      <span class="text-sm font-medium text-gray-800 dark:text-gray-200">Time range</span>
      <div class="flex flex-wrap gap-2">
        @for (opt of rangeOptions; track opt.value) {
        <label
          class="inline-flex items-center gap-2 cursor-pointer rounded-lg border border-gray-200 dark:border-gray-600 px-3 py-2 text-sm has-[:checked]:bg-blue-50 has-[:checked]:border-blue-500 dark:has-[:checked]:bg-blue-900/20 dark:has-[:checked]:border-blue-400"
        >
          <input
            type="radio"
            name="booklet-range"
            [value]="opt.value"
            [ngModel]="bookletRange"
            (ngModelChange)="bookletRange = $event; cdr.markForCheck()"
            class="h-4 w-4"
          />
          <span class="text-gray-800 dark:text-gray-200">{{ opt.label }}</span>
        </label>
        }
      </div>
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
  isPrinting = false;
  bookletRange: BookletTimeRange = 'month';

  readonly rangeOptions: Array<{ value: BookletTimeRange; label: string }> = [
    { value: 'week', label: '1 week' },
    { value: 'twoweeks', label: '2 weeks' },
    { value: 'month', label: '1 month' },
    { value: 'twomonths', label: '2 months' }
  ];

  constructor(
    private readonly printService: PrintService,
    readonly cdr: ChangeDetectorRef
  ) {}

  onSectionToggle(): void {
    this.sectionExpanded = !this.sectionExpanded;
    this.cdr.markForCheck();
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
