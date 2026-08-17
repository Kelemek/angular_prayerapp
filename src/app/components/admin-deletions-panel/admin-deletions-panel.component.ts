import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import type { AdminData } from '../../services/admin-data.service';
import { PendingDeletionCardComponent } from '../pending-deletion-card/pending-deletion-card.component';
import { PendingUpdateDeletionCardComponent } from '../pending-update-deletion-card/pending-update-deletion-card.component';
import { AdminEmptyStateComponent } from '../admin-empty-state/admin-empty-state.component';

@Component({
  selector: 'app-admin-deletions-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PendingDeletionCardComponent, PendingUpdateDeletionCardComponent, AdminEmptyStateComponent],
  template: `
    <div>
      @if (pendingPrayerDeletions === 0 && pendingUpdateDeletions === 0) {
        <app-admin-empty-state
          title="No pending deletion requests"
          message="All deletion requests have been reviewed."
        ></app-admin-empty-state>
      }

      @if (pendingPrayerDeletions > 0 || pendingUpdateDeletions > 0) {
        <div class="space-y-6">
          @if (pendingPrayerDeletions > 0) {
            <div>
              <h3 class="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">
                Prayer Deletions ({{ pendingPrayerDeletions }})
              </h3>
              <div class="space-y-6">
                @for (
                  request of adminData?.pendingDeletionRequests;
                  track trackByDeletionRequestId($index, request)
                ) {
                  <app-pending-deletion-card
                    [deletionRequest]="request"
                    (approve)="approveDeletion.emit($event)"
                    (deny)="denyDeletion.emit($event)"
                  ></app-pending-deletion-card>
                }
              </div>
            </div>
          }

          @if (pendingUpdateDeletions > 0) {
            <div>
              <h3 class="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">
                Update Deletions ({{ pendingUpdateDeletions }})
              </h3>
              <div class="space-y-6">
                @for (
                  request of adminData?.pendingUpdateDeletionRequests;
                  track trackByDeletionRequestId($index, request)
                ) {
                  <app-pending-update-deletion-card
                    [deletionRequest]="request"
                    (approve)="approveUpdateDeletion.emit($event)"
                    (deny)="denyUpdateDeletion.emit($event)"
                  ></app-pending-update-deletion-card>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class AdminDeletionsPanelComponent {
  @Input() adminData: AdminData | null = null;

  @Output() approveDeletion = new EventEmitter<string>();
  @Output() denyDeletion = new EventEmitter<{ id: string; reason: string }>();
  @Output() approveUpdateDeletion = new EventEmitter<string>();
  @Output() denyUpdateDeletion = new EventEmitter<{ id: string; reason: string }>();

  get pendingPrayerDeletions(): number {
    return this.adminData?.pendingDeletionRequests?.length ?? 0;
  }

  get pendingUpdateDeletions(): number {
    return this.adminData?.pendingUpdateDeletionRequests?.length ?? 0;
  }

  trackByDeletionRequestId(_index: number, request: { id: string }): string {
    return request.id;
  }
}
