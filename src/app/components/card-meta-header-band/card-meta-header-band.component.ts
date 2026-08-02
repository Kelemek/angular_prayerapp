import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragHandle } from '@angular/cdk/drag-drop';
import {
  PRAYER_CARD_HEADER_BLEED_CLASSES,
  PRAYER_CARD_HEADER_INSET_CLASSES,
} from '../../lib/prayer-card-layout';

@Component({
  selector: 'app-card-meta-header-band',
  standalone: true,
  imports: [CommonModule, CdkDragHandle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      [class]="
        layout === 'two-column'
          ? 'grid grid-cols-[minmax(0,1fr)_auto] items-center ' + headerBleedClasses + ' mb-4 overflow-hidden rounded-t-lg border-b border-gray-200 dark:border-gray-700 min-h-9'
          : 'grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center ' + headerBleedClasses + ' mb-4 overflow-hidden rounded-t-lg border-b border-gray-200 dark:border-gray-700 min-h-9'
      "
    >
      <div class="flex min-h-9 min-w-0 items-center overflow-hidden">
        <ng-content select="[cardMetaLeft]" />
      </div>
      @if (layout === 'three-column' && (centerDate || centerTime || center !== null)) {
      @if (centerDragHandle) {
      <span
        cdkDragHandle
        [attr.id]="centerDragHandleId"
        [class]="centerDragHandleClass"
        title="Drag to reorder"
        aria-label="Drag to reorder"
      >
        <ng-container *ngTemplateOutlet="centerDateTime" />
      </span>
      } @else {
      <span [class]="centerClass">
        <ng-container *ngTemplateOutlet="centerDateTime" />
      </span>
      }
      }
      <div
        [class]="'flex items-center justify-end gap-2 flex-shrink-0 min-w-0 ' + headerInsetClasses"
        [class.col-start-2]="layout === 'two-column'"
        [class.row-start-1]="layout === 'two-column'"
      >
        <ng-content select="[cardMetaRight]" />
      </div>
    </div>

    <ng-template #centerDateTime>
      @if (centerDate && centerTime) {
      <span class="flex flex-col leading-tight sm:flex-row sm:whitespace-nowrap">
        <span>{{ centerDate }}</span>
        <span class="hidden sm:inline">, </span>
        <span>{{ centerTime }}</span>
      </span>
      } @else {
      {{ center }}
      }
    </ng-template>
  `,
})
export class CardMetaHeaderBandComponent {
  readonly headerBleedClasses = PRAYER_CARD_HEADER_BLEED_CLASSES;
  readonly headerInsetClasses = PRAYER_CARD_HEADER_INSET_CLASSES;

  /** `three-column` — left | center | right. `two-column` — left | right only. */
  @Input() layout: 'three-column' | 'two-column' = 'three-column';
  @Input() center: string | null = null;
  @Input() centerDate: string | null = null;
  @Input() centerTime: string | null = null;
  @Input() centerSize: 'sm' | 'md' = 'sm';
  /** When true, the center date/time is the CDK drag handle (personal prayer reorder). */
  @Input() centerDragHandle = false;
  @Input() centerDragHandleId: string | null = null;

  get centerClass(): string {
    const size =
      this.centerSize === 'md'
        ? 'text-xs md:text-sm'
        : 'text-xs';
    const nowrap =
      this.centerDate && this.centerTime ? '' : ' whitespace-nowrap';
    return `px-2 text-center ${size} text-gray-500 dark:text-gray-400${nowrap}`;
  }

  get centerDragHandleClass(): string {
    return (
      this.centerClass +
      ' cursor-grab active:cursor-grabbing touch-none select-none hover:text-gray-700 dark:hover:text-gray-300'
    );
  }
}
