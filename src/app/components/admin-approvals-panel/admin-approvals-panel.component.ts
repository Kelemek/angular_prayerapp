import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { ConsolidatedPrayerApprovalComponent } from '../consolidated-prayer-approval/consolidated-prayer-approval.component';
import type { ConsolidatedApproval } from '../../lib/admin-pending-queues';
import { AdminEmptyStateComponent } from '../admin-empty-state/admin-empty-state.component';

@Component({
  selector: 'app-admin-approvals-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConsolidatedPrayerApprovalComponent, AdminEmptyStateComponent],
  template: `
    <div>
      @if (approvals.length === 0) {
        <app-admin-empty-state
          title="No pending approvals"
          message="All prayer requests and updates have been reviewed."
        ></app-admin-empty-state>
      }

      <div class="space-y-6">
        @for (item of approvals; track trackByPrayerId($index, item.prayer)) {
          <app-consolidated-prayer-approval
            [prayer]="item.prayer"
            [pendingUpdates]="item.pendingUpdates"
            (onApprovePrayer)="approvePrayer.emit($event)"
            (onDenyPrayer)="denyPrayer.emit($event)"
            (onApproveUpdate)="approveUpdate.emit($event)"
            (onDenyUpdate)="denyUpdate.emit($event)"
            (onPrayerEdited)="prayerEdited.emit()"
            (onUpdateEdited)="updateEdited.emit()"
          ></app-consolidated-prayer-approval>
        }
      </div>
    </div>
  `,
})
export class AdminApprovalsPanelComponent {
  @Input({ required: true }) approvals!: ConsolidatedApproval[];

  @Output() approvePrayer = new EventEmitter<string>();
  @Output() denyPrayer = new EventEmitter<{ id: string; reason: string | null }>();
  @Output() approveUpdate = new EventEmitter<string>();
  @Output() denyUpdate = new EventEmitter<{ id: string; reason: string | null }>();
  @Output() prayerEdited = new EventEmitter<void>();
  @Output() updateEdited = new EventEmitter<void>();

  trackByPrayerId(_index: number, prayer: { id: string }): string {
    return prayer.id;
  }
}
