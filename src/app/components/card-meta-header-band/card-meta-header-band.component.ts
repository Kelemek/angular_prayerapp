import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-card-meta-header-band',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      [class]="
        layout === 'two-column'
          ? 'grid grid-cols-[minmax(0,1fr)_auto] items-center -mx-6 mb-4 overflow-hidden rounded-t-lg border-b border-gray-200 dark:border-gray-700 min-h-9'
          : 'grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center -mx-6 mb-4 overflow-hidden rounded-t-lg border-b border-gray-200 dark:border-gray-700 min-h-9'
      "
    >
      <div class="flex min-h-9 min-w-0 items-center overflow-hidden">
        <ng-content select="[cardMetaLeft]" />
      </div>
      @if (layout === 'three-column' && center !== null) {
      <span [class]="centerClass">{{ center }}</span>
      }
      <div
        class="flex items-center justify-end gap-2 px-6 flex-shrink-0 min-w-0"
        [class.col-start-2]="layout === 'two-column'"
        [class.row-start-1]="layout === 'two-column'"
      >
        <ng-content select="[cardMetaRight]" />
      </div>
    </div>
  `,
})
export class CardMetaHeaderBandComponent {
  /** `three-column` — left | center | right. `two-column` — left | right only. */
  @Input() layout: 'three-column' | 'two-column' = 'three-column';
  @Input() center: string | null = null;
  @Input() centerSize: 'sm' | 'md' = 'sm';

  get centerClass(): string {
    const size =
      this.centerSize === 'md'
        ? 'text-xs md:text-sm'
        : 'text-xs';
    return `px-2 text-center ${size} text-gray-500 dark:text-gray-400 whitespace-nowrap`;
  }
}
