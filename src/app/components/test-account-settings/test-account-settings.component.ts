import { Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-test-account-settings',
  standalone: true,
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/40">
      <button
        type="button"
        id="test-account-settings-trigger"
        class="w-full flex items-center justify-between gap-2 text-left rounded-lg -mx-1 px-1 py-0.5 -my-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-800"
        (click)="onSectionToggle()"
        [attr.aria-expanded]="sectionExpanded"
        aria-controls="test-account-settings-panel"
      >
        <span class="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 min-w-0">
          <svg class="text-blue-600 dark:text-blue-400 shrink-0" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
            <line x1="12" y1="18" x2="12.01" y2="18"></line>
          </svg>
          Test Account (App Testing)
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
        id="test-account-settings-panel"
        role="region"
        aria-labelledby="test-account-settings-trigger"
        class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
      >
      @if (loading) {
      <div class="flex items-center justify-center py-8">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
      }

      @if (!loading) {
        <!-- Info Box -->
        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mb-4">
          <p class="text-sm text-blue-800 dark:text-blue-200">
            This identifies the account used to test the <strong>Apple and Android apps</strong>. For this account, no verification email is sent; the user signs in with the codes below based on the configured MFA length. <strong>The account must also be set up</strong> (e.g. as an admin in Admin User Management or in the app) as needed for your testing.
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
            <div>
              <label for="testAccountEmail" class="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                Tester email address
              </label>
              <input
                type="email"
                id="testAccountEmail"
                [(ngModel)]="testAccountEmail"
                name="testAccountEmail"
                placeholder="app-testaccount@example.com"
                class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Leave blank to disable test account behavior.
              </p>
            </div>

            <div>
              <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                MFA codes (used when tester email signs in)
              </h4>
              <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Set the fixed code for each MFA length. The code shown to the user depends on the current <strong>Verification code length</strong> in Email Verification Settings above.
              </p>
              <div class="grid gap-4 sm:grid-cols-3">
                <div>
                  <label for="testAccountCode4" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">4-digit code</label>
                  <input
                    type="text"
                    id="testAccountCode4"
                    [(ngModel)]="testAccountCode4"
                    name="testAccountCode4"
                    maxlength="4"
                    pattern="[0-9]*"
                    inputmode="numeric"
                    placeholder="1777"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label for="testAccountCode6" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">6-digit code</label>
                  <input
                    type="text"
                    id="testAccountCode6"
                    [(ngModel)]="testAccountCode6"
                    name="testAccountCode6"
                    maxlength="6"
                    pattern="[0-9]*"
                    inputmode="numeric"
                    placeholder="111777"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label for="testAccountCode8" class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">8-digit code</label>
                  <input
                    type="text"
                    id="testAccountCode8"
                    [(ngModel)]="testAccountCode8"
                    name="testAccountCode8"
                    maxlength="8"
                    pattern="[0-9]*"
                    inputmode="numeric"
                    placeholder="11111777"
                    class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
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
            <span>Save Test Account Settings</span>
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
export class TestAccountSettingsComponent {
  sectionExpanded = false;
  private sectionInitialLoadDone = false;
  testAccountEmail = '';
  testAccountCode4 = '';
  testAccountCode6 = '';
  testAccountCode8 = '';
  loading = false;
  saving = false;
  error: string | null = null;

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

  async loadSettings() {
    try {
      this.loading = true;
      this.error = null;
      this.cdr.markForCheck();

      const { data, error } = await this.supabase.client
        .from('admin_settings')
        .select('test_account_email, test_account_code_4, test_account_code_6, test_account_code_8')
        .eq('id', 1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        this.testAccountEmail = data.test_account_email ?? '';
        this.testAccountCode4 = data.test_account_code_4 ?? '';
        this.testAccountCode6 = data.test_account_code_6 ?? '';
        this.testAccountCode8 = data.test_account_code_8 ?? '';
      }

      this.cdr.markForCheck();
    } catch (err: unknown) {
      console.error('Error loading test account settings:', err);
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
          test_account_email: this.testAccountEmail.trim() || null,
          test_account_code_4: this.testAccountCode4.trim() || null,
          test_account_code_6: this.testAccountCode6.trim() || null,
          test_account_code_8: this.testAccountCode8.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1);

      if (error) throw error;

      this.toast.success('Test account settings saved successfully');
      this.cdr.markForCheck();
    } catch (err: unknown) {
      console.error('Error saving test account settings:', err);
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
