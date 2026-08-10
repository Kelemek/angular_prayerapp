import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragHandle } from '@angular/cdk/drag-drop';
import {
  PRAYER_CARD_HEADER_BLEED_CLASSES,
  PRAYER_CARD_HEADER_INSET_CLASSES,
  PRAYER_CARD_META_HEADER_ACTIONS_INSET_COMPACT_CLASSES,
  PRAYER_CARD_META_HEADER_CENTER_PADDING_CLASSES,
  PRAYER_CARD_META_HEADER_MIN_HEIGHT_CLASSES,
  PRAYER_CARD_META_HEADER_TEXT_XS_CLASSES,
  PRAYER_CARD_META_HEADER_TEXT_XS_MD_CLASSES,
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
          ? 'grid grid-cols-[minmax(0,1fr)_auto] items-center ' + headerBleedClasses + ' mb-4 overflow-hidden rounded-t-lg border-b border-gray-200 dark:border-gray-700 ' + metaHeaderMinHeightClasses
          : 'grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center ' + headerBleedClasses + ' mb-4 overflow-hidden rounded-t-lg border-b border-gray-200 dark:border-gray-700 ' + metaHeaderMinHeightClasses
      "
    >
      <div [class]="'flex min-w-0 items-center overflow-hidden ' + metaHeaderMinHeightClasses">
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
          'flex min-w-0 flex-shrink-0 items-center justify-end ' +
          actionsInsetClasses
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
  readonly metaHeaderMinHeightClasses = PRAYER_CARD_META_HEADER_MIN_HEIGHT_CLASSES;

  /** `three-column` — left | center | right. `two-column` — left | right only. */
  @Input() layout: 'three-column' | 'two-column' = 'three-column';
  @Input() center: string | null = null;
  @Input() centerDate: string | null = null;
  @Input() centerTime: string | null = null;
  @Input() centerSize: 'sm' | 'md' = 'sm';
  /** When true, the center date/time is the CDK drag handle (personal prayer reorder). */
  @Input() centerDragHandle = false;
  @Input() centerDragHandleId: string | null = null;
  /**
   * When true, use tighter horizontal padding on the actions column
   * (cards without corner unread badges, e.g. personal).
   */
  @Input() compactActionsInset = false;

  get actionsInsetClasses(): string {
    return this.compactActionsInset
      ? PRAYER_CARD_META_HEADER_ACTIONS_INSET_COMPACT_CLASSES
      : PRAYER_CARD_HEADER_INSET_CLASSES;
  }

  get centerClass(): string {
    const size =
      this.centerSize === 'md'
        ? PRAYER_CARD_META_HEADER_TEXT_XS_MD_CLASSES
        : PRAYER_CARD_META_HEADER_TEXT_XS_CLASSES;
    const nowrap =
      this.centerDate && this.centerTime ? '' : ' whitespace-nowrap';
    return `${PRAYER_CARD_META_HEADER_CENTER_PADDING_CLASSES} text-center ${size} text-gray-500 dark:text-gray-400${nowrap}`;
  }

  get centerDragHandleClass(): string {
    return (
      this.centerClass +
      ' cursor-grab active:cursor-grabbing touch-none select-none hover:text-gray-700 dark:hover:text-gray-300'
    );
  }
}
