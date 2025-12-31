import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';
import { AdminAuthService } from '../../services/admin-auth.service';

@Component({
  selector: 'app-site-protection-settings',
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
          Site-Wide Access Protection
        </h3>
      </div>

      @if (loading) {
        <div class="flex items-center justify-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }

      @if (!loading) {
      <div>
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <label for="requireSiteLogin" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Site-Wide Password Protection
            </label>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              When enabled, users must login before accessing any page
            </p>
          </div>
          <label class="relative inline-flex items-center cursor-pointer ml-4">
            <input
              type="checkbox"
              id="requireSiteLogin"
              [(ngModel)]="requireSiteLogin"
              class="sr-only peer"
            >
            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
          </label>
        </div>
        
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-3">
          <strong class="text-gray-700 dark:text-gray-300">Enabled:</strong> All site visitors must login with their admin email before viewing any content. Non-admin pages remain accessible after login.
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
          <strong class="text-gray-700 dark:text-gray-300">Disabled:</strong> Site is publicly accessible without authentication (default).
        </p>
        
        <div class="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-md">
          <p class="text-xs text-yellow-800 dark:text-yellow-200">
            <strong>⚠️ Warning:</strong> When enabled, only admin users can login to view the site. Make sure at least one admin email is configured.
          </p>
        </div>

        <div class="flex justify-end mt-6">
          <button
            (click)="save()"
            [disabled]="saving"
            class="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            @if (saving) {
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Saving...
            }
            @if (!saving) {
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
              Save Protection Settings
            }
          </button>
        </div>
      </div>
      }
    </div>
  `,
  styles: []
})
export class SiteProtectionSettingsComponent implements OnInit {
  requireSiteLogin = false;
  loading = false;
  saving = false;

  constructor(
    private supabase: SupabaseService,
    private toastService: ToastService,
    private adminAuthService: AdminAuthService,
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
        .select('require_site_login')
        .eq('id', 1)
        .single();

      if (error) throw error;

      if (data) {
        this.requireSiteLogin = data.require_site_login || false;
      }
    } catch (error: any) {
      console.error('Error loading site protection settings:', error);
      this.toastService.error('Failed to load site protection settings');
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
        .update({ 
          require_site_login: this.requireSiteLogin 
        })
        .eq('id', 1);

      if (error) throw error;

      // Reload the AdminAuthService observable
      await this.adminAuthService.reloadSiteProtectionSetting();

      this.toastService.success('Site protection settings saved successfully');
    } catch (error: any) {
      console.error('Error saving site protection settings:', error);
      this.toastService.error('Failed to save site protection settings');
    } finally {
      this.saving = false;
      this.cdr.markForCheck();
    }
  }
}
