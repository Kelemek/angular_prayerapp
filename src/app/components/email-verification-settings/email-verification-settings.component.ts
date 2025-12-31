import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-email-verification-settings',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <div class="flex items-center gap-2 mb-4">
        <svg class="text-blue-600 dark:text-blue-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
          <polyline points="22,6 12,13 2,6"></polyline>
        </svg>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Email Verification (2FA)
        </h3>
      </div>

      @if (loading) {
      <div class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
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
                <select
                  [(ngModel)]="verificationCodeLength"
                  id="codeLength"
                  name="codeLength"
                  aria-label="Verification code length"
                  class="w-full appearance-none px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 cursor-pointer"
                >
                  <option [value]="4">4 digits</option>
                  <option [value]="6">6 digits (recommended)</option>
                  <option [value]="8">8 digits</option>
                </select>
                <svg class="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
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
                <select
                  [(ngModel)]="verificationCodeExpiryMinutes"
                  id="codeExpiry"
                  name="codeExpiry"
                  aria-label="Code expiration time in minutes"
                  class="w-full appearance-none px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 cursor-pointer"
                >
                  <option [value]="5">5 minutes</option>
                  <option [value]="10">10 minutes</option>
                  <option [value]="15">15 minutes (recommended)</option>
                  <option [value]="20">20 minutes</option>
                  <option [value]="30">30 minutes</option>
                  <option [value]="45">45 minutes</option>
                  <option [value]="60">60 minutes</option>
                </select>
                <svg class="pointer-events-none absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
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
            <span>Save Verification Settings</span>
            }
          </button>
        </div>
      }
    </div>
  `,
  styles: []
})
export class EmailVerificationSettingsComponent implements OnInit {
  verificationCodeLength = 6;
  verificationCodeExpiryMinutes = 15;
  loading = false;
  saving = false;

  constructor(
    private supabase: SupabaseService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.loadSettings();
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
      this.toast.error('Failed to save email verification settings');
    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }
}
