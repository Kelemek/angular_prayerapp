import {
  Component,
  Output,
  EventEmitter,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { EmailNotificationService } from '../../services/email-notification.service';
import { AdminUserManagementSectionComponent } from '../admin-user-management-section/admin-user-management-section.component';
import { AdminUserManagementPanelComponent } from '../admin-user-management-panel/admin-user-management-panel.component';
import {
  AdminUserManagementDialogsComponent,
  type AdminUserConfirmationAction,
} from '../admin-user-management-dialogs/admin-user-management-dialogs.component';
import type { AdminUser } from '../../lib/admin-user-management';
import { fetchAdminUsers } from '../../lib/admin-user-management-fetch';
import {
  adminUsersReceivingEmailsCount,
  adminUsersReceivingPushCount,
} from '../../lib/admin-user-management-format';
import {
  adminUserAlreadyExists,
  removeAdminAccess,
  toggleAdminReceiveEmails,
  toggleAdminReceivePush,
  upsertAdminUser,
  validateAddAdminInput,
} from '../../lib/admin-user-management-commands';
import { sendAdminInvitationEmail } from '../../lib/admin-user-management-invitation';
import {
  buildAdminUserDisableEmailsConfirmation,
  buildAdminUserDisablePushConfirmation,
  buildAdminUserRemoveConfirmation,
} from '../../lib/admin-user-management-confirmations';
import { toggleAdminSectionLazyLoad } from '../../lib/admin-section-lazy-load';

@Component({
  selector: 'app-admin-user-management',
  standalone: true,
  imports: [
    CommonModule,
    AdminUserManagementSectionComponent,
    AdminUserManagementPanelComponent,
    AdminUserManagementDialogsComponent,
  ],
  templateUrl: './admin-user-management.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [],
})
export class AdminUserManagementComponent {
  @Output() onSave = new EventEmitter<void>();

  sectionExpanded = false;
  private sectionInitialLoadDone = false;
  admins: AdminUser[] = [];
  loading = false;
  error: string | null = null;
  success: string | null = null;

  showAddForm = false;
  newAdminEmail = '';
  newAdminName = '';
  adding = false;

  @ViewChild('dialogsRef')
  dialogsRef?: AdminUserManagementDialogsComponent;

  constructor(
    private supabase: SupabaseService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
    private emailService: EmailNotificationService,
  ) {}

  get receivingEmailsCount(): number {
    return adminUsersReceivingEmailsCount(this.admins);
  }

  get receivingPushCount(): number {
    return adminUsersReceivingPushCount(this.admins);
  }

  onSectionToggle(): void {
    const toggled = toggleAdminSectionLazyLoad({
      sectionExpanded: this.sectionExpanded,
      sectionInitialLoadDone: this.sectionInitialLoadDone,
    });
    this.sectionExpanded = toggled.gate.sectionExpanded;
    this.sectionInitialLoadDone = toggled.gate.sectionInitialLoadDone;
    if (toggled.shouldInitialLoad) {
      void this.loadAdmins();
    }
    this.cdr.markForCheck();
  }

  onShowAddForm(): void {
    this.showAddForm = true;
    this.cdr.markForCheck();
  }

  async loadAdmins(): Promise<void> {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    try {
      this.admins = await fetchAdminUsers(this.supabase.getClient());
    } catch (err: unknown) {
      console.error('Error loading admins:', err);
      this.error = 'Failed to load admin users';
      this.sectionExpanded = true;
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  async addAdmin(): Promise<void> {
    const validation = validateAddAdminInput(
      this.newAdminEmail,
      this.newAdminName,
    );
    if (!validation.ok) {
      this.error = validation.error;
      this.sectionExpanded = true;
      this.cdr.markForCheck();
      return;
    }

    this.adding = true;
    this.error = null;
    this.success = null;
    this.cdr.markForCheck();

    try {
      const { email, name } = validation;

      if (await adminUserAlreadyExists(this.supabase.getClient(), email)) {
        this.error = 'This email is already an admin';
        this.sectionExpanded = true;
        return;
      }

      await upsertAdminUser(this.supabase.getClient(), email, name);

      void sendAdminInvitationEmail(this.emailService, email, name).catch(
        (emailErr) => {
          console.warn('Error sending invitation email:', emailErr);
        },
      );

      this.success = `Admin added successfully! Invitation email sent to ${email}`;
      this.toast.success(`Admin ${name} added successfully`);
      this.newAdminEmail = '';
      this.newAdminName = '';
      this.showAddForm = false;

      void this.loadAdmins();
      this.onSave.emit();
    } catch (err: unknown) {
      console.error('Error adding admin:', err);
      this.error = 'Failed to add admin user';
      this.sectionExpanded = true;
    } finally {
      this.adding = false;
      this.cdr.markForCheck();
    }
  }

  cancelAddForm(): void {
    this.showAddForm = false;
    this.newAdminEmail = '';
    this.newAdminName = '';
    this.error = null;
    this.cdr.markForCheck();
  }

  onToggleReceiveEmails(payload: {
    email: string;
    name: string;
    currentStatus: boolean;
  }): void {
    if (!payload.currentStatus) {
      void this.toggleReceiveEmails(payload.email, payload.currentStatus);
      return;
    }
    this.dialogsRef?.openConfirmation(
      buildAdminUserDisableEmailsConfirmation(payload.name),
      {
        kind: 'toggleReceiveEmails',
        email: payload.email,
        name: payload.name,
        currentReceiveEmails: payload.currentStatus,
      },
    );
  }

  onToggleReceivePush(payload: {
    email: string;
    name: string;
    currentStatus: boolean;
  }): void {
    if (!payload.currentStatus) {
      void this.toggleReceivePush(payload.email, payload.currentStatus);
      return;
    }
    this.dialogsRef?.openConfirmation(
      buildAdminUserDisablePushConfirmation(payload.name),
      {
        kind: 'toggleReceivePush',
        email: payload.email,
        name: payload.name,
        currentReceivePush: payload.currentStatus,
      },
    );
  }

  onDeleteAdmin(payload: { email: string; name: string }): void {
    if (this.admins.length === 1) return;
    this.dialogsRef?.openConfirmation(
      buildAdminUserRemoveConfirmation(payload.name),
      {
        kind: 'removeAdmin',
        email: payload.email,
        name: payload.name,
      },
    );
  }

  async onConfirmationConfirmed(
    action: AdminUserConfirmationAction,
  ): Promise<void> {
    switch (action.kind) {
      case 'toggleReceiveEmails':
        await this.toggleReceiveEmails(
          action.email,
          action.currentReceiveEmails ?? false,
        );
        break;
      case 'toggleReceivePush':
        await this.toggleReceivePush(
          action.email,
          action.currentReceivePush ?? false,
        );
        break;
      case 'removeAdmin':
        await this.deleteAdmin(action.email);
        break;
      default: {
        const _exhaustive: never = action.kind;
        throw new Error(`Unhandled confirmation: ${_exhaustive}`);
      }
    }
  }

  async deleteAdmin(email: string): Promise<void> {
    if (this.admins.length === 1) {
      this.error = 'Cannot delete the last admin user';
      this.sectionExpanded = true;
      this.cdr.markForCheck();
      return;
    }

    this.error = null;
    this.success = null;
    this.cdr.markForCheck();

    try {
      await removeAdminAccess(this.supabase.getClient(), email);

      this.success = `Admin access removed for ${email}`;
      this.toast.success(`Admin access removed for ${email}`);
      await this.loadAdmins();
      this.onSave.emit();
    } catch (err: unknown) {
      console.error('Error deleting admin:', err);
      this.error = 'Failed to remove admin access';
      this.sectionExpanded = true;
    } finally {
      this.cdr.markForCheck();
    }
  }

  async toggleReceiveEmails(
    email: string,
    currentStatus: boolean,
  ): Promise<void> {
    this.error = null;
    this.success = null;
    this.cdr.markForCheck();

    try {
      const next = await toggleAdminReceiveEmails(
        this.supabase.getClient(),
        email,
        currentStatus,
      );
      this.toast.success(
        `Email notifications ${next ? 'enabled' : 'disabled'} for ${email}`,
      );
      void this.loadAdmins();
    } catch (err: unknown) {
      console.error('Error toggling email preference:', err);
      this.error = 'Failed to update email preference';
      this.sectionExpanded = true;
    } finally {
      this.cdr.markForCheck();
    }
  }

  async toggleReceivePush(
    email: string,
    currentStatus: boolean,
  ): Promise<void> {
    this.error = null;
    this.success = null;
    this.cdr.markForCheck();

    try {
      const next = await toggleAdminReceivePush(
        this.supabase.getClient(),
        email,
        currentStatus,
      );
      this.toast.success(
        `Push notifications ${next ? 'enabled' : 'disabled'} for ${email}`,
      );
      void this.loadAdmins();
    } catch (err: unknown) {
      console.error('Error toggling push preference:', err);
      this.error = 'Failed to update push preference';
      this.sectionExpanded = true;
    } finally {
      this.cdr.markForCheck();
    }
  }
}
