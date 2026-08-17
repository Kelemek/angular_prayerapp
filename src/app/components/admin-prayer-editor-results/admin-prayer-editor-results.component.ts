import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  ViewChildren,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminPrayerEditorCardComponent } from '../admin-prayer-editor-card/admin-prayer-editor-card.component';
import type {
  PrayerEditorCardAction,
  PrayerEditorEditForm,
  PrayerEditorEditUpdateForm,
  PrayerEditorNewUpdate,
  PrayerEditorPrayer,
} from '../../lib/admin-prayer-editor-types';
import {
  prayerEditorShowInitialEmpty,
  prayerEditorShowNoSearchResultsEmpty,
} from '../../lib/admin-prayer-editor-ui-state';

@Component({
  selector: 'app-admin-prayer-editor-results',
  standalone: true,
  imports: [CommonModule, AdminPrayerEditorCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-prayer-editor-results.component.html',
})
export class AdminPrayerEditorResultsComponent {
  @Input() searching = false;
  @Input() displayPrayers: PrayerEditorPrayer[] = [];
  @Input() allPrayersCount = 0;
  @Input() searchTerm = '';
  @Input() statusFilter = '';
  @Input() approvalFilter = '';
  @Input() selectedPrayers!: Set<string>;
  @Input() expandedCards!: Set<string>;
  @Input() editingPrayer: string | null = null;
  @Input() addingUpdate: string | null = null;
  @Input() editForm!: PrayerEditorEditForm;
  @Input() newUpdate!: PrayerEditorNewUpdate;
  @Input() editUpdateForm!: PrayerEditorEditUpdateForm;
  @Input() editingUpdateId: string | null = null;
  @Input() saving = false;
  @Input() savingUpdate = false;
  @Input() savingEditUpdate = false;
  @Input() deleting = false;

  @Output() cardAction = new EventEmitter<{
    prayer: PrayerEditorPrayer;
    action: PrayerEditorCardAction;
  }>();

  @ViewChildren(AdminPrayerEditorCardComponent)
  private cardRefs?: AdminPrayerEditorCardComponent[];

  flushEditDescriptionForPrayer(prayerId: string): void {
    this.cardForPrayer(prayerId)?.flushEditDescriptionEditor();
  }

  resetAddUpdateSubscriberPickForPrayer(prayerId: string): void {
    this.cardForPrayer(prayerId)?.resetAddUpdateSubscriberPick();
  }

  private cardForPrayer(prayerId: string): AdminPrayerEditorCardComponent | undefined {
    return this.cardRefs?.find((card) => card.prayer.id === prayerId);
  }

  get showNoSearchResultsEmpty(): boolean {
    return prayerEditorShowNoSearchResultsEmpty(
      this.searching,
      this.allPrayersCount,
      this.searchTerm,
      this.statusFilter,
      this.approvalFilter,
    );
  }

  get showInitialEmpty(): boolean {
    return prayerEditorShowInitialEmpty(
      this.searching,
      this.allPrayersCount,
      this.searchTerm,
      this.statusFilter,
      this.approvalFilter,
    );
  }
}
