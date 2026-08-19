import { Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { AdminSectionLoadingComponent } from '../admin-section-loading/admin-section-loading.component';
import { AdminFilterSelectComponent } from '../admin-filter-select/admin-filter-select.component';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

type AllowanceLevel = 'everyone' | 'original-requestor' | 'admin-only';

const ALLOWANCE_LEVEL_OPTIONS = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'original-requestor', label: 'Original Requestor Only' },
  { value: 'admin-only', label: 'Admin Only' },
] as const;

@Component({
  selector: 'app-security-policy-settings',
  standalone: true,
  imports: [AdminSectionLoadingComponent, AdminFilterSelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 transition-colors dark:hover:bg-gray-700/40" [class.cursor-pointer]="!sectionExpanded" (click)="!sectionExpanded && onSectionToggle()">
      <button
        type="button"
        id="security-policy-settings-trigger"
        class="admin-settings-collapsible-trigger cursor-pointer w-full flex min-h-12 items-center justify-between gap-2 text-left rounded-lg -mx-1 px-1 py-0.5 -my-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800"
        (click)="onSectionToggle(); $event.stopPropagation()"
        [attr.aria-expanded]="sectionExpanded"
        aria-controls="security-policy-settings-panel"
      >
        <span class="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 min-w-0">
          <svg class="text-blue-600 dark:text-blue-400 shrink-0" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
          Security & Access Policies
        </span>
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="shrink-0 text-gray-500 dark:text-gray-400 transition-transform duration-200"
          [class.rotate-180]="sectionExpanded"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      @if (sectionExpanded) {
      <div
        id="security-policy-settings-panel"
        role="region"
        aria-labelledby="security-policy-settings-trigger"
        class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
      >
      @if (loading) {
      <app-admin-section-loading message="Loading security policy settings…" />
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
                <app-admin-filter-select
                  triggerId="deletionsAllowed"
                  [value]="deletionsAllowed"
                  (valueChange)="onDeletionsAllowedChange($event)"
                  [options]="allowanceLevelOptions"
                  ariaLabel="Policy for prayer and update deletions"
                />
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
                <app-admin-filter-select
                  triggerId="updatesAllowed"
                  [value]="updatesAllowed"
                  (valueChange)="onUpdatesAllowedChange($event)"
                  [options]="allowanceLevelOptions"
                  ariaLabel="Policy for prayer updates"
                />
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
            class="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class SecurityPolicySettingsComponent {
  sectionExpanded = false;
  private sectionInitialLoadDone = false;
  deletionsAllowed: AllowanceLevel = 'everyone';
  updatesAllowed: AllowanceLevel = 'everyone';
  loading = false;
  saving = false;
  error: string | null = null;
  readonly allowanceLevelOptions = ALLOWANCE_LEVEL_OPTIONS;

  constructor(
    private supabase: SupabaseService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  onSectionToggle(): void {
    this.sectionExpanded = !this.sectionExpanded;
    if (this.sectionExpanded && !this.sectionInitialLoadDone) {
      this.sectionInitialLoadDone = true;
      void this.loadSettings();
    }
    this.cdr.markForCheck();
  }

  onDeletionsAllowedChange(value: string): void {
    this.deletionsAllowed = value as AllowanceLevel;
    this.cdr.markForCheck();
  }

  onUpdatesAllowedChange(value: string): void {
    this.updatesAllowed = value as AllowanceLevel;
    this.cdr.markForCheck();
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
      this.sectionExpanded = true;
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
      this.sectionExpanded = true;
      this.toast.error('Failed to save settings');
      this.cdr.markForCheck();
    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }
}
