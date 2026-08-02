import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardMetaHeaderBandComponent } from '../card-meta-header-band/card-meta-header-band.component';
import { RichTextViewComponent } from '../rich-text-view/rich-text-view.component';
import {
  formatPrayerCardShortDateParts,
  getPrayerUpdateAuthorDisplay,
  getPrayerUpdateHeaderLabel,
  getPrayerUpdateHeaderLabelClasses,
  type PrayerUpdateRecord,
} from '../../lib/prayer-update-header';
import { PRAYER_CARD_HEADER_INSET_CLASSES, PRAYER_CARD_SHELL_PADDING_CLASSES } from '../../lib/prayer-card-layout';

@Component({
  selector: 'app-prayer-update-row',
  standalone: true,
  imports: [CommonModule, CardMetaHeaderBandComponent, RichTextViewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'block',
  },
  template: `
    <div
      [class]="
        'bg-inset-surface-muted border border-gray-300 dark:border-gray-600 relative pb-6 pt-0 ' +
        shellPaddingClasses +
        ' ' +
        shellClass
      "
    >
      <app-card-meta-header-band
        [centerDate]="displayDateParts.date"
        [centerTime]="displayDateParts.time"
        [centerSize]="size"
      >
        <div cardMetaLeft [class]="'min-w-0 w-full ' + headerInsetClasses">
          <span [class]="headerLabelClasses">{{ headerLabel }}</span>
        </div>
        <div cardMetaRight>
          <ng-content select="[updateActions]" />
        </div>
      </app-card-meta-header-band>

      @if (showUpdatedBy) {
      <p [class]="updatedByClass">
        Updated by:
        <span class="font-medium text-gray-700 dark:text-gray-300">{{ authorDisplay }}</span>
      </p>
      }

      <ng-content select="[updateCorner]" />

      <app-rich-text-view [class]="contentClass" [text]="update.content" />
    </div>
  `,
})
export class PrayerUpdateRowComponent {
  readonly shellPaddingClasses = PRAYER_CARD_SHELL_PADDING_CLASSES;
  readonly headerInsetClasses = PRAYER_CARD_HEADER_INSET_CLASSES;

  @Input({ required: true }) update!: PrayerUpdateRecord;
  @Input() size: 'sm' | 'md' = 'sm';
  @Input() showUpdatedBy = false;
  @Input() shellClass = 'rounded-lg';
  @Input() contentClass = 'block text-sm text-gray-700 dark:text-gray-300';

  get headerLabel(): string {
    return getPrayerUpdateHeaderLabel(this.update);
  }

  get headerLabelClasses(): string {
    return getPrayerUpdateHeaderLabelClasses(this.update, this.size);
  }

  get displayDateParts(): { date: string; time: string } {
    return formatPrayerCardShortDateParts(
      this.update.updated_at || this.update.created_at
    );
  }

  get authorDisplay(): string {
    return getPrayerUpdateAuthorDisplay(this.update);
  }

  get updatedByClass(): string {
    return this.size === 'md'
      ? 'mb-2 text-sm md:text-base text-gray-600 dark:text-gray-400'
      : 'mb-2 text-sm text-gray-600 dark:text-gray-400';
  }
}
