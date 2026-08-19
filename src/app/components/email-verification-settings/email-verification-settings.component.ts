import { Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { AdminSectionLoadingComponent } from '../admin-section-loading/admin-section-loading.component';
import { AdminFilterSelectComponent } from '../admin-filter-select/admin-filter-select.component';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

const CODE_LENGTH_OPTIONS = [
  { value: '4', label: '4 digits' },
  { value: '6', label: '6 digits (recommended)' },
  { value: '8', label: '8 digits' },
] as const;

const CODE_EXPIRY_OPTIONS = [
  { value: '5', label: '5 minutes' },
  { value: '10', label: '10 minutes' },
  { value: '15', label: '15 minutes (recommended)' },
  { value: '20', label: '20 minutes' },
  { value: '30', label: '30 minutes' },
  { value: '45', label: '45 minutes' },
  { value: '60', label: '60 minutes' },
] as const;

@Component({
  selector: 'app-email-verification-settings',
  standalone: true,
  imports: [AdminSectionLoadingComponent, AdminFilterSelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 transition-colors dark:hover:bg-gray-700/40" [class.cursor-pointer]="!sectionExpanded" (click)="!sectionExpanded && onSectionToggle()">
      <button
        type="button"
        id="email-verification-settings-trigger"
        class="admin-settings-collapsible-trigger cursor-pointer w-full flex min-h-12 items-center justify-between gap-2 text-left rounded-lg -mx-1 px-1 py-0.5 -my-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800"
        (click)="onSectionToggle(); $event.stopPropagation()"
        [attr.aria-expanded]="sectionExpanded"
        aria-controls="email-verification-settings-panel"
      >
        <span class="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 min-w-0">
          <svg class="text-blue-600 dark:text-blue-400 shrink-0" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          Email Verification (2FA)
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
        id="email-verification-settings-panel"
        role="region"
        aria-labelledby="email-verification-settings-trigger"
        class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
      >
      @if (loading) {
      <app-admin-section-loading message="Loading email verification settings…" />
      }

      @if (!loading) {
        <!-- Email Verification Settings (Always Enabled) -->
        <div class="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-md p-4">
          <!-- Verification Code Settings -->
          <div class="space-y-4">
            <!-- Code Length -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Verification Code Length
              </label>
              <div class="relative">
                <app-admin-filter-select
                  triggerId="codeLength"
                  [value]="verificationCodeLength.toString()"
                  (valueChange)="onCodeLengthChange($event)"
                  [options]="codeLengthOptions"
                  ariaLabel="Verification code length"
                />
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Length of verification code sent to users
              </p>
            </div>

            <!-- Code Expiry -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Code Expiration Time
              </label>
              <div class="relative">
                <app-admin-filter-select
                  triggerId="codeExpiry"
                  [value]="verificationCodeExpiryMinutes.toString()"
                  (valueChange)="onCodeExpiryChange($event)"
                  [options]="codeExpiryOptions"
                  ariaLabel="Code expiration time in minutes"
                />
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                How long verification codes remain valid
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
            <span>Save Verification Settings</span>
            }
          </button>
        </div>
      }
      </div>
      }
    </div>
  `,
  styles: []
})
export class EmailVerificationSettingsComponent {
  sectionExpanded = false;
  private sectionInitialLoadDone = false;
  verificationCodeLength = 6;
  verificationCodeExpiryMinutes = 15;
  loading = false;
  saving = false;
  readonly codeLengthOptions = CODE_LENGTH_OPTIONS;
  readonly codeExpiryOptions = CODE_EXPIRY_OPTIONS;

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

  onCodeLengthChange(value: string): void {
    this.verificationCodeLength = Number(value);
    this.cdr.markForCheck();
  }

  onCodeExpiryChange(value: string): void {
    this.verificationCodeExpiryMinutes = Number(value);
    this.cdr.markForCheck();
  }

  async loadSettings() {
    this.loading = true;
    this.cdr.markForCheck();

    try {
      const { data, error } = await this.supabase.client
        .from('admin_settings')
        .select('verification_code_length, verification_code_expiry_minutes')
        .eq('id', 1)
        .single();

      if (error) throw error;

      if (data) {
        this.verificationCodeLength = data.verification_code_length ?? 6;
        this.verificationCodeExpiryMinutes = data.verification_code_expiry_minutes ?? 15;
      }
    } catch (error: any) {
      console.error('Error loading email verification settings:', error);
      this.sectionExpanded = true;
      this.toast.error('Failed to load email verification settings');
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  async save() {
    this.saving = true;
    this.cdr.markForCheck();

    try {
      const { error } = await this.supabase.client
        .from('admin_settings')
        .upsert({
          id: 1,
          require_email_verification: true,
          verification_code_length: this.verificationCodeLength,
          verification_code_expiry_minutes: this.verificationCodeExpiryMinutes
        })
        .select();

      if (error) throw error;

      this.toast.success('Email verification settings saved successfully');
    } catch (error: any) {
      console.error('Error saving email verification settings:', error);
      this.sectionExpanded = true;
      this.toast.error('Failed to save email verification settings');
    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }
}
