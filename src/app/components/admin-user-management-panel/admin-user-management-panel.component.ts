import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { AdminUser } from '../../lib/admin-user-management';
import { formatAdminUserDate } from '../../lib/admin-user-management-format';

@Component({
  selector: 'app-admin-user-management-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin-user-management-panel.component.html',
})
export class AdminUserManagementPanelComponent {
  @Input() showAddForm = false;
  @Input() success: string | null = null;
  @Input() error: string | null = null;
  @Input() loading = false;
  @Input() admins: AdminUser[] = [];
  @Input() adding = false;
  @Input() newAdminEmail = '';
  @Input() newAdminName = '';
  @Input() receivingEmailsCount = 0;
  @Input() receivingPushCount = 0;

  @Output() showAddFormRequest = new EventEmitter<void>();
  @Output() clearSuccess = new EventEmitter<void>();
  @Output() clearError = new EventEmitter<void>();
  @Output() newAdminEmailChange = new EventEmitter<string>();
  @Output() newAdminNameChange = new EventEmitter<string>();
  @Output() addAdmin = new EventEmitter<void>();
  @Output() cancelAddForm = new EventEmitter<void>();
  @Output() toggleReceiveEmails = new EventEmitter<{
    email: string;
    name: string;
    currentStatus: boolean;
  }>();
  @Output() toggleReceivePush = new EventEmitter<{
    email: string;
    name: string;
    currentStatus: boolean;
  }>();
  @Output() deleteAdmin = new EventEmitter<{ email: string; name: string }>();

  onShowAddForm(): void {
    this.showAddFormRequest.emit();
  }

  onToggleReceiveEmails(
    email: string,
    name: string,
    currentStatus: boolean,
  ): void {
    this.toggleReceiveEmails.emit({ email, name, currentStatus });
  }

  onToggleReceivePush(
    email: string,
    name: string,
    currentStatus: boolean,
  ): void {
    this.toggleReceivePush.emit({ email, name, currentStatus });
  }

  onDeleteAdmin(email: string, name: string): void {
    this.deleteAdmin.emit({ email, name });
  }

  onAddAdminClick(): void {
    this.addAdmin.emit();
  }

  onCancelAddFormClick(): void {
    this.cancelAddForm.emit();
  }

  formatAdminDate(dateString: string): string {
    return formatAdminUserDate(dateString);
  }
}
