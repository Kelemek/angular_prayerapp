import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import {
  AdminPrayerTypeFormComponent,
  type PrayerTypeFormSavedEvent,
} from '../admin-prayer-type-form/admin-prayer-type-form.component';
import { AdminPrayerTypeRowComponent } from '../admin-prayer-type-row/admin-prayer-type-row.component';
import type { PrayerTypeRecord } from '../../types/prayer';

@Component({
  selector: 'app-admin-prayer-types-panel',
  standalone: true,
  imports: [
    CommonModule,
    DragDropModule,
    AdminPrayerTypeFormComponent,
    AdminPrayerTypeRowComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-prayer-types-panel.component.html',
})
export class AdminPrayerTypesPanelComponent {
  @Input() showAddForm = false;
  @Input() error: string | null = null;
  @Input() success: string | null = null;
  @Input() editingType: PrayerTypeRecord | null = null;
  @Input() loading = false;
  @Input() types: PrayerTypeRecord[] = [];
  @Input() activeCount = 0;

  @Output() toggleAdd = new EventEmitter<void>();
  @Output() typeSaved = new EventEmitter<PrayerTypeFormSavedEvent>();
  @Output() closeForm = new EventEmitter<void>();
  @Output() formError = new EventEmitter<string>();
  @Output() editType = new EventEmitter<PrayerTypeRecord>();
  @Output() deleteType = new EventEmitter<{ id: string; name: string }>();
  @Output() toggleBooklet = new EventEmitter<PrayerTypeRecord>();
  @Output() toggleActive = new EventEmitter<PrayerTypeRecord>();
  @Output() drop = new EventEmitter<CdkDragDrop<PrayerTypeRecord[]>>();

  @ViewChild('typeFormRef')
  typeFormRef?: AdminPrayerTypeFormComponent;

  resetTypeFormForAdd(): void {
    this.typeFormRef?.resetForAdd();
  }
}
