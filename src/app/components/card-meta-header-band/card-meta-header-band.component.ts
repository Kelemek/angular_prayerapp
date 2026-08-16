import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragHandle } from '@angular/cdk/drag-drop';
import {
  PRAYER_CARD_HEADER_BLEED_CLASSES,
  PRAYER_CARD_HEADER_INSET_CLASSES,
  PRAYER_CARD_META_HEADER_ACTIONS_INSET_COMPACT_CLASSES,
  getMetaHeaderBandLayoutClasses,
  type MetaHeaderBandSize,
} from '../../lib/prayer-card-layout';
import { META_HEADER_BORDER_BOTTOM_CLASSES } from '../../lib/prayer-status-header';

@Component({
  selector: 'app-card-meta-header-band',
  standalone: true,
  imports: [CommonModule, CdkDragHandle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      [class]="
        layout === 'two-column'
          ? 'grid grid-cols-[minmax(0,1fr)_auto] items-stretch ' + bleedClasses + ' overflow-hidden rounded-t-lg ' + borderBottomClasses + ' ' + bandMarginClasses + ' ' + minHeightClasses
          : 'grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center ' + bleedClasses + ' overflow-hidden rounded-t-lg ' + borderBottomClasses + ' ' + bandMarginClasses + ' ' + minHeightClasses
      "
    >
      <div [class]="'flex h-full min-w-0 w-full items-center self-stretch overflow-hidden ' + minHeightClasses">
        <ng-content select="[cardMetaLeft]" />
      </div>
      @if (layout === 'three-column' && (centerDate || centerTime || center !== null)) {
      @if (centerDragHandle) {
      <span
        cdkDragHandle
        [attr.id]="centerDragHandleId"
        [class]="centerDragHandleClass + ' col-start-2 shrink-0 justify-self-center'"
        title="Drag to reorder"
        aria-label="Drag to reorder"
      >
        <ng-container *ngTemplateOutlet="centerDateTime" />
      </span>
      } @else {
      <span [class]="centerClass + ' col-start-2 shrink-0 justify-self-center'">
        <ng-container *ngTemplateOutlet="centerDateTime" />
      </span>
      }
      }
      <div
        [class]="
          'flex min-w-0 items-center justify-end self-stretch ' +
          resolvedActionsInsetClasses
        "
        [class.col-start-2]="layout === 'two-column'"
        [class.row-start-1]="layout === 'two-column'"
        [class.col-start-3]="layout === 'three-column'"
      >
        <ng-content select="[cardMetaRight]" />
      </div>
    </div>

    <ng-template #centerDateTime>
      @if (centerDate && centerTime) {
      <span class="flex flex-col items-center leading-tight sm:flex-row sm:whitespace-nowrap">
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
  readonly headerInsetClasses = PRAYER_CARD_HEADER_INSET_CLASSES;

  /** Override when the card shell uses non-standard horizontal padding (e.g. presentation p-8). */
  @Input() bleedClasses = PRAYER_CARD_HEADER_BLEED_CLASSES;
  /** Bottom border under the meta header band (card accent or default gray). */
  @Input() borderBottomClasses = META_HEADER_BORDER_BOTTOM_CLASSES;
  /** Controls band height, center date size, and vertical spacing below the band. */
  @Input() bandSize: MetaHeaderBandSize = 'sm';

  /** `three-column` — left | center | right. `two-column` — left | right only. */
  @Input() layout: 'three-column' | 'two-column' = 'three-column';
  @Input() center: string | null = null;
  @Input() centerDate: string | null = null;
  @Input() centerTime: string | null = null;
  /** When true, the center date/time is the CDK drag handle (personal prayer reorder). */
  @Input() centerDragHandle = false;
  @Input() centerDragHandleId: string | null = null;
  /**
   * When true, use tighter horizontal padding on the actions column
   * (cards without corner unread badges, e.g. personal).
   */
  @Input() compactActionsInset = false;
  /** Override actions-column inset when the card shell uses non-standard padding. */
  @Input() actionsInsetClasses: string | null = null;

  get layoutClasses() {
    return getMetaHeaderBandLayoutClasses(this.bandSize);
  }

  get minHeightClasses(): string {
    return this.layoutClasses.minHeightClasses;
  }

  get bandMarginClasses(): string {
    return this.layoutClasses.bandMarginClasses;
  }

  get resolvedActionsInsetClasses(): string {
    if (this.actionsInsetClasses) {
      return this.actionsInsetClasses;
    }
    return this.compactActionsInset
      ? PRAYER_CARD_META_HEADER_ACTIONS_INSET_COMPACT_CLASSES
      : PRAYER_CARD_HEADER_INSET_CLASSES;
  }

  get centerClass(): string {
    const size = this.layoutClasses.centerTextClasses;
    const nowrap =
      this.centerDate && this.centerTime ? '' : ' whitespace-nowrap';
    return `${this.layoutClasses.centerPaddingClasses} text-center ${size} text-gray-500 dark:text-gray-400${nowrap}`;
  }

  get centerDragHandleClass(): string {
    return (
      this.centerClass +
      ' cursor-grab active:cursor-grabbing touch-none select-none hover:text-gray-700 dark:hover:text-gray-300'
    );
  }
}
