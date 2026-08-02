import { Component, ChangeDetectionStrategy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardMetaHeaderBandComponent } from '../card-meta-header-band/card-meta-header-band.component';
import { RichTextViewComponent } from '../rich-text-view/rich-text-view.component';
import {
  formatPrayerUpdateDisplayDate,
  getPrayerUpdateAuthorDisplay,
  getPrayerUpdateHeaderLabel,
  getPrayerUpdateHeaderLabelClasses,
  type PrayerUpdateRecord,
} from '../../lib/prayer-update-header';

@Component({
  selector: 'app-prayer-update-row',
  standalone: true,
  imports: [CommonModule, CardMetaHeaderBandComponent, RichTextViewComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      [class]="
        'bg-inset-surface-muted border border-gray-300 dark:border-gray-600 relative px-6 pb-6 pt-0 ' +
        shellClass
      "
    >
      <app-card-meta-header-band
        [center]="displayDate"
        [centerSize]="size"
      >
        <div cardMetaLeft class="px-6 min-w-0 w-full">
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

  get displayDate(): string {
    return formatPrayerUpdateDisplayDate(this.update);
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
