import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

interface AdminUser {
  email: string;
  name: string;
  created_at: string;
  last_sign_in_at: string | null;
  receive_admin_emails: boolean;
}

@Component({
  selector: 'app-admin-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <svg class="text-red-600 dark:text-red-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="2" y="8" width="20" height="13" rx="2" ry="2"></rect>
            <path d="M12 2v6"></path>
            <path d="M12 8a3 3 0 0 0 3-3V2"></path>
          </svg>
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Admin User Management
            </h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Manage admin users and send invitations
            </p>
          </div>
        </div>
        
        <button
          *ngIf="!showAddForm"
          (click)="showAddForm = true"
          class="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="8.5" cy="7" r="4"></circle>
            <line x1="20" y1="8" x2="20" y2="14"></line>
            <line x1="23" y1="11" x2="17" y2="11"></line>
          </svg>
          Add Admin
        </button>
      </div>

      <!-- Success Message -->
      <div *ngIf="success" class="mb-4 flex items-start gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md" role="status" aria-live="polite" aria-atomic="true">
        <svg class="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <div class="flex-1">
          <p class="text-green-800 dark:text-green-200 text-sm">{{ success }}</p>
        </div>
        <button (click)="success = null" class="text-green-600 dark:text-green-400 focus:outline-none focus:ring-2 focus:ring-green-500 rounded-md p-1" aria-label="Close success message">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- Error Message -->
      <div *ngIf="error" class="mb-4 flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md" role="alert" aria-live="assertive" aria-atomic="true">
        <svg class="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <div class="flex-1">
          <p class="text-red-800 dark:text-red-200 text-sm">{{ error }}</p>
        </div>
        <button (click)="error = null" class="text-red-600 dark:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-md p-1" aria-label="Close error message">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- Add Admin Form -->
      <div *ngIf="showAddForm" class="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-md font-semibold text-gray-900 dark:text-gray-100">
            Add New Admin
          </h4>
          <button
            (click)="cancelAddForm()"
            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label for="adminName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name <span aria-label="required">*</span>
            </label>
            <input
              type="text"
              id="adminName"
              [(ngModel)]="newAdminName"
              placeholder="Admin's full name"
              aria-label="Admin's full name"
              aria-required="true"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <div>
            <label for="adminEmail" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email Address <span aria-label="required">*</span>
            </label>
            <input
              type="email"
              id="adminEmail"
              [(ngModel)]="newAdminEmail"
              placeholder="admin@example.com"
              aria-label="Admin's email address"
              aria-required="true"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500"
            />
          </div>

          <div class="flex gap-3">
            <button
              (click)="addAdmin()"
              [disabled]="adding"
              class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Add new admin user"
            >
              <div *ngIf="adding" class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <svg *ngIf="!adding" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              {{ adding ? 'Adding...' : 'Add & Send Invitation' }}
            </button>
            <button
              (click)="cancelAddForm()"
              [disabled]="adding"
              class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              aria-label="Cancel adding new admin"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <!-- Admin List -->
      <div *ngIf="loading" class="text-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
        <p class="text-gray-500 dark:text-gray-400 text-sm mt-2">Loading admins...</p>
      </div>

      <div *ngIf="!loading && admins.length === 0" class="text-center py-8 text-gray-500 dark:text-gray-400">
        <svg class="mx-auto mb-2 opacity-50" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="8" width="20" height="13" rx="2" ry="2"></rect>
          <path d="M12 2v6"></path>
          <path d="M12 8a3 3 0 0 0 3-3V2"></path>
        </svg>
        <p>No admin users found</p>
      </div>

      <div *ngIf="!loading && admins.length > 0" class="space-y-3">
        <div
          *ngFor="let admin of admins"
          class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
        >
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <svg class="text-red-600 dark:text-red-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="8" width="20" height="13" rx="2" ry="2"></rect>
                <path d="M12 2v6"></path>
                <path d="M12 8a3 3 0 0 0 3-3V2"></path>
              </svg>
              <h4 class="font-medium text-gray-900 dark:text-gray-100">
                {{ admin.name }}
              </h4>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">
              {{ admin.email }}
            </p>
            <div class="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
              <span>
                Added: {{ formatDate(admin.created_at) }}
              </span>
              <span *ngIf="admin.last_sign_in_at">
                Last sign in: {{ formatDate(admin.last_sign_in_at) }}
              </span>
            </div>
          </div>

          <div *ngIf="deletingEmail === admin.email" class="flex items-center gap-2">
            <span class="text-sm text-gray-600 dark:text-gray-400">Remove admin access?</span>
            <button
              (click)="deleteAdmin(admin.email)"
              class="px-3 py-1 bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 text-white text-sm rounded transition-colors"
              aria-label="Confirm deletion of admin access"
            >
              Confirm
            </button>
            <button
              (click)="deletingEmail = null"
              class="px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              aria-label="Cancel deletion"
            >
              Cancel
            </button>
          </div>

          <div *ngIf="deletingEmail !== admin.email" class="flex items-center gap-2">
            <!-- Receive Admin Emails Toggle -->
            <button
              (click)="toggleReceiveEmails(admin.email, admin.receive_admin_emails)"
              [class]="'p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ' + (admin.receive_admin_emails ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 focus:ring-green-500' : 'text-gray-400 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-gray-500')"
              [attr.aria-label]="'Email notifications for ' + admin.name + ' are ' + (admin.receive_admin_emails ? 'enabled' : 'disabled')"
              [attr.aria-pressed]="admin.receive_admin_emails"
            >
              <svg *ngIf="admin.receive_admin_emails" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <svg *ngIf="!admin.receive_admin_emails" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            </button>
            
            <!-- Delete Admin Button -->
            <button
              (click)="deletingEmail = admin.email"
              [disabled]="admins.length === 1"
              class="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
              [attr.aria-label]="admins.length === 1 ? 'Cannot delete, this is the last admin' : 'Remove admin access for ' + admin.name"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>

      <!-- Summary and Notes -->
      <div *ngIf="admins.length > 0" class="mt-4 p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-md">
        <p class="text-sm text-gray-700 dark:text-gray-300">
          <strong>{{ getReceivingEmailsCount() }}</strong> of <strong>{{ admins.length }}</strong> admin{{ admins.length !== 1 ? 's' : '' }} receiving email notifications
        </p>
      </div>

      <div class="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
        <p class="text-xs text-blue-800 dark:text-blue-200">
          <strong>Note:</strong> Admin users can sign in using magic links sent to their email. 
          When you add a new admin, they'll receive an invitation email with instructions. 
          Click the green checkmark to enable/disable admin email notifications.
        </p>
      </div>
    </div>
  `,
  styles: []
})
export class AdminUserManagementComponent implements OnInit {
  @Output() onSave = new EventEmitter<void>();

  admins: AdminUser[] = [];
  loading = false;
  error: string | null = null;
  success: string | null = null;

  showAddForm = false;
  newAdminEmail = '';
  newAdminName = '';
  adding = false;

  deletingEmail: string | null = null;

  constructor(
    private supabase: SupabaseService,
    private toast: ToastService
  ) {}

  ngOnInit() {
    this.loadAdmins();
  }

  async loadAdmins() {
    this.loading = true;
    this.error = null;

    try {
      const { data, error } = await this.supabase.client
        .from('email_subscribers')
        .select('email,name,created_at,last_sign_in_at,receive_admin_emails')
        .eq('is_admin', true)
        .order('created_at', { ascending: true });

      if (error) throw error;

      this.admins = data || [];
    } catch (err: unknown) {
      const errorMsg = err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : String(err);
      console.error('Error loading admins:', err);
      this.error = 'Failed to load admin users';
    } finally {
      this.loading = false;
    }
  }

  async addAdmin() {
    if (!this.newAdminEmail.trim() || !this.newAdminName.trim()) {
      this.error = 'Email and name are required';
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.newAdminEmail)) {
      this.error = 'Please enter a valid email address';
      return;
    }

    this.adding = true;
    this.error = null;
    this.success = null;

    try {
      const email = this.newAdminEmail.toLowerCase().trim();
      const name = this.newAdminName.trim();

      // Check if admin already exists
      const { data: existing } = await this.supabase.client
        .from('email_subscribers')
        .select('email')
        .eq('email', email)
        .eq('is_admin', true)
        .maybeSingle();

      if (existing) {
        this.error = 'This email is already an admin';
        return;
      }

      // Insert or update the admin
      const { error: upsertError } = await this.supabase.client
        .from('email_subscribers')
        .upsert({
          email,
          name,
          is_admin: true,
          is_active: true
        }, {
          onConflict: 'email'
        });

      if (upsertError) throw upsertError;

      // Send invitation email (attempt, but don't fail if it errors)
      try {
        await this.sendInvitationEmail(email, name);
      } catch (emailErr) {
        console.warn('Error sending invitation email:', emailErr);
      }

      this.success = `Admin added successfully! Invitation email sent to ${email}`;
      this.toast.success(`Admin ${name} added successfully`);
      this.newAdminEmail = '';
      this.newAdminName = '';
      this.showAddForm = false;
      this.loadAdmins();
      this.onSave.emit();
    } catch (err: unknown) {
      const errorMsg = err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : String(err);
      console.error('Error adding admin:', err);
      this.error = 'Failed to add admin user';
    } finally {
      this.adding = false;
    }
  }

  async sendInvitationEmail(email: string, name: string) {
    // Call the send-email edge function
    const appUrl = window.location.origin;
    
    const htmlBody = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🙏 Prayer App</h1>
              <p style="margin: 10px 0 0 0;">Admin Access Granted</p>
            </div>
            <div class="content">
              <h2>Welcome, ${name}!</h2>
              <p>You've been granted admin access to the Prayer App. As an admin, you can:</p>
              <ul>
                <li>Review and approve prayer requests</li>
                <li>Manage prayer updates and deletions</li>
                <li>Configure email settings and subscribers</li>
                <li>Manage prayer prompts and types</li>
                <li>Access the full admin portal</li>
              </ul>
              
              <p>To sign in to the admin portal:</p>
              <ol>
                <li>Go to the admin login page link at the bottom of the main site</li>
                <li>Enter your email address: <strong>${email}</strong></li>
                <li>Click "Send Magic Link"</li>
                <li>Check your email for the secure sign-in link</li>
              </ol>
              
              <div style="text-align: center;">
                <a href="${appUrl}/admin" class="button">Go to Admin Portal</a>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                <strong>Note:</strong> Prayer App uses passwordless authentication. You'll receive a magic link via email each time you sign in.
              </p>
            </div>
            <div class="footer">
              <p>Prayer App Admin Portal</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textBody = `
Welcome to Prayer App Admin Portal!

Hi ${name},

You've been granted admin access to the Prayer App.

To sign in:
1. Go to ${appUrl}/admin
2. Enter your email: ${email}
3. Click "Send Magic Link"
4. Check your email for the sign-in link

Prayer App uses passwordless authentication for security.

---
Prayer App Admin Portal
    `;

    const { data, error } = await this.supabase.client.functions.invoke('send-email', {
      body: {
        to: email,
        subject: 'Admin Access Granted - Prayer App',
        htmlBody,
        textBody
      }
    });

    if (error) throw error;
  }

  async deleteAdmin(email: string) {
    // Don't allow deleting the last admin
    if (this.admins.length === 1) {
      this.error = 'Cannot delete the last admin user';
      return;
    }

    this.error = null;
    this.success = null;

    try {
      const { error: deleteError } = await this.supabase.client
        .from('email_subscribers')
        .update({ is_admin: false })
        .eq('email', email);

      if (deleteError) throw deleteError;

      this.success = `Admin access removed for ${email}`;
      this.toast.success(`Admin access removed for ${email}`);
      this.deletingEmail = null;
      this.loadAdmins();
      this.onSave.emit();
    } catch (err: unknown) {
      const errorMsg = err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : String(err);
      console.error('Error deleting admin:', err);
      this.error = 'Failed to remove admin access';
    }
  }

  async toggleReceiveEmails(email: string, currentStatus: boolean) {
    this.error = null;
    this.success = null;

    try {
      const { error: updateError } = await this.supabase.client
        .from('email_subscribers')
        .update({ receive_admin_emails: !currentStatus })
        .eq('email', email);

      if (updateError) throw updateError;

      this.toast.success(`Email notifications ${!currentStatus ? 'enabled' : 'disabled'} for ${email}`);
      this.loadAdmins();
    } catch (err: unknown) {
      const errorMsg = err && typeof err === 'object' && 'message' in err
        ? String(err.message)
        : String(err);
      console.error('Error toggling email preference:', err);
      this.error = 'Failed to update email preference';
    }
  }

  cancelAddForm() {
    this.showAddForm = false;
    this.newAdminEmail = '';
    this.newAdminName = '';
    this.error = null;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  getReceivingEmailsCount(): number {
    return this.admins.filter(a => a.receive_admin_emails).length;
  }
}
