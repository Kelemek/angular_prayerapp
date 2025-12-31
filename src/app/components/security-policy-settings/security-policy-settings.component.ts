import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

type AllowanceLevel = 'everyone' | 'original-requestor' | 'admin-only';

@Component({
  selector: 'app-security-policy-settings',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <div class="flex items-center gap-2 mb-4">
        <svg class="text-blue-600 dark:text-blue-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Security & Access Policies
        </h3>
      </div>

      @if (loading) {
      <div class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
      }

      @if (!loading) {
        <!-- Info Box -->
        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-4">
          <p class="text-sm text-blue-800 dark:text-blue-200">
            Configure who can submit updates and request deletions for prayer requests.
          </p>
        </div>

        <!-- Error Message -->
        @if (error) {
        <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md p-4 mb-4">
          <p class="text-sm text-red-800 dark:text-red-200">{{ error }}</p>
        </div>
        }

        <!-- Settings Box -->
        <div class="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-md p-4">
          <div class="space-y-6">
            <!-- Deletions Allowed -->
            <div>
              <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                Prayer & Update Deletion Policy
              </h4>
              <div class="relative">
                <select
                  id="deletionsAllowed"
                  [(ngModel)]="deletionsAllowed"
                  name="deletionsAllowed"
                  aria-label="Policy for prayer and update deletions"
                  class="w-full appearance-none px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 cursor-pointer"
                >
                  <option value="everyone">Everyone</option>
                  <option value="original-requestor">Original Requestor Only</option>
                  <option value="admin-only">Admin Only</option>
                </select>
                <svg class="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-3">
                <strong class="text-gray-700 dark:text-gray-300">Everyone:</strong> Users can request to delete any prayer requests and updates. Deletions require admin approval before taking effect.
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                <strong class="text-gray-700 dark:text-gray-300">Original Requestor Only:</strong> Only the prayer creator can request deletion (verified by email). Admins must approve.
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                <strong class="text-gray-700 dark:text-gray-300">Admin Only:</strong> All delete (trash can) icons are hidden from users. Admins can still delete directly.
              </p>
            </div>

            <!-- Updates Allowed -->
            <div>
              <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                Prayer Update Policy
              </h4>
              <div class="relative">
                <select
                  id="updatesAllowed"
                  [(ngModel)]="updatesAllowed"
                  name="updatesAllowed"
                  aria-label="Policy for prayer updates"
                  class="w-full appearance-none px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 cursor-pointer"
                >
                  <option value="everyone">Everyone</option>
                  <option value="original-requestor">Original Requestor Only</option>
                  <option value="admin-only">Admin Only</option>
                </select>
                <svg class="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-3">
                <strong class="text-gray-700 dark:text-gray-300">Everyone:</strong> Users can submit updates to any existing prayer requests. Updates require admin approval before being displayed.
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                <strong class="text-gray-700 dark:text-gray-300">Original Requestor Only:</strong> Only the prayer creator can submit updates (verified by email). Admins must approve.
              </p>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
                <strong class="text-gray-700 dark:text-gray-300">Admin Only:</strong> "Add Update" buttons are hidden from users. Admins can still add updates directly.
              </p>
            </div>
          </div>
        </div>
        <div class="flex justify-end mt-6">
          <button
            (click)="save()"
            [disabled]="saving"
            class="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            @if (saving) {
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Saving...</span>
            }
            @if (!saving) {
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
              <polyline points="17 21 17 13 7 13 7 21"></polyline>
              <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
            <span>Save Policy Settings</span>
            }
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class SecurityPolicySettingsComponent implements OnInit {
  deletionsAllowed: AllowanceLevel = 'everyone';
  updatesAllowed: AllowanceLevel = 'everyone';
  loading = false;
  saving = false;
  error: string | null = null;

  constructor(
    private supabase: SupabaseService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit() {
    await this.loadSettings();
  }

  async loadSettings() {
    try {
      this.loading = true;
      this.error = null;
      this.cdr.markForCheck();

      const { data, error } = await this.supabase.client
        .from('admin_settings')
        .select('deletions_allowed, updates_allowed')
        .eq('id', 1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        this.deletionsAllowed = data.deletions_allowed as AllowanceLevel;
        this.updatesAllowed = data.updates_allowed as AllowanceLevel;
      }

      this.cdr.markForCheck();
    } catch (err: any) {
      console.error('Error loading security policy settings:', err);
      this.error = 'Failed to load settings';
      this.cdr.markForCheck();
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  async save() {
    try {
      this.saving = true;
      this.error = null;
      this.cdr.markForCheck();

      const { error } = await this.supabase.client
        .from('admin_settings')
        .update({
          deletions_allowed: this.deletionsAllowed,
          updates_allowed: this.updatesAllowed,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1);

      if (error) throw error;

      this.toast.success('Security policy settings saved successfully');
      this.cdr.markForCheck();
    } catch (err: any) {
      console.error('Error saving security policy settings:', err);
      this.error = 'Failed to save settings';
      this.toast.error('Failed to save settings');
      this.cdr.markForCheck();
    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }
}
