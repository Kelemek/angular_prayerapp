import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import type { AdminData } from '../../services/admin-data.service';
import { PendingAccountApprovalCardComponent } from '../pending-account-approval-card/pending-account-approval-card.component';
import { AdminEmptyStateComponent } from '../admin-empty-state/admin-empty-state.component';

@Component({
  selector: 'app-admin-accounts-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PendingAccountApprovalCardComponent, AdminEmptyStateComponent],
  template: `
    <div>
      @if ((adminData?.pendingAccountRequests?.length || 0) === 0) {
        <app-admin-empty-state
          title="No pending account approval requests"
          message="All account requests have been reviewed."
        ></app-admin-empty-state>
      }

      <div class="space-y-6">
        @for (request of adminData?.pendingAccountRequests; track trackByAccountRequestId($index, request)) {
          <app-pending-account-approval-card
            [request]="request"
            (approve)="approveAccount.emit($event)"
            (deny)="denyAccount.emit($event)"
          ></app-pending-account-approval-card>
        }
      </div>
    </div>
  `,
})
export class AdminAccountsPanelComponent {
  @Input() adminData: AdminData | null = null;

  @Output() approveAccount = new EventEmitter<string>();
  @Output() denyAccount = new EventEmitter<{ id: string; reason: string }>();

  trackByAccountRequestId(_index: number, request: { id: string }): string {
    return request.id;
  }
}
