import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import type { PrayerTypeRecord } from '../../types/prayer';
import { formatPrayerTypeDate } from '../../lib/admin-prayer-types-manager';

@Component({
  selector: 'app-admin-prayer-type-row',
  standalone: true,
  imports: [CommonModule, DragDropModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-prayer-type-row.component.html',
})
export class AdminPrayerTypeRowComponent {
  @Input({ required: true }) type!: PrayerTypeRecord;
  @Output() edit = new EventEmitter<void>();
  @Output() delete = new EventEmitter<void>();
  @Output() toggleBooklet = new EventEmitter<void>();
  @Output() toggleActive = new EventEmitter<void>();

  formatDate(dateString: string): string {
    return formatPrayerTypeDate(dateString);
  }
}
