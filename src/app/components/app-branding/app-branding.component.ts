import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';

type AllowanceLevel = 'everyone' | 'original-requestor' | 'admin-only';

interface BrandingSettings {
  appTitle: string;
  appSubtitle: string;
  useLogo: boolean;
  lightModeLogoUrl: string;
  darkModeLogoUrl: string;
  deletionsAllowed: AllowanceLevel;
  updatesAllowed: AllowanceLevel;
}

@Component({
  selector: 'app-branding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <div class="flex items-center gap-2 mb-4">
        <svg class="text-purple-600 dark:text-purple-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          App Branding
        </h3>
      </div>

      <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Customize the title and tagline displayed at the top of your app.
      </p>

      <div *ngIf="loading" class="text-center py-4">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>

      <div *ngIf="!loading" class="space-y-4">
        <!-- Error Message -->
        <div *ngIf="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-md p-4 mb-4">
          <p class="text-sm text-red-800 dark:text-red-200">{{ error }}</p>
        </div>
        <!-- App Title -->
        <div>
          <label for="appTitle" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            App Title
          </label>
          <input
            type="text"
            id="appTitle"
            [(ngModel)]="appTitle"
            name="appTitle"
            aria-label="Application title"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Church Prayer Manager"
          />
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Main heading displayed in the app header
          </p>
        </div>

        <!-- App Subtitle -->
        <div>
          <label for="appSubtitle" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            App Subtitle/Tagline
          </label>
          <input
            type="text"
            id="appSubtitle"
            [(ngModel)]="appSubtitle"
            name="appSubtitle"
            aria-label="Application subtitle or tagline"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="Keeping our community connected in prayer"
          />
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Subheading or tagline displayed in the app header
          </p>
        </div>

        <!-- Logo Settings -->
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <input
              type="checkbox"
              id="useLogo"
              [(ngModel)]="useLogo"
              name="useLogo"
              aria-label="Use custom logo instead of app title"
              class="h-4 w-4 text-blue-600 border-gray-300 bg-white dark:bg-gray-800 rounded focus:ring-blue-500 cursor-pointer focus:ring-2"
            />
            <label for="useLogo" class="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
              Use custom logo instead of app title
            </label>
          </div>

          <div *ngIf="useLogo" class="space-y-4 pl-7">
            <!-- Light Mode Logo -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Light Mode Logo
              </label>
              <div class="flex items-start gap-3">
                <input
                  type="file"
                  #lightLogoInput
                  accept="image/*"
                  (change)="onLogoUpload($event, 'light')"
                  class="hidden"
                />
                <button
                  (click)="lightLogoInput.click()"
                  [disabled]="uploading"
                  class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                  aria-label="Upload light mode logo"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  Upload
                </button>
                <button
                  *ngIf="lightModeLogoUrl"
                  (click)="lightModeLogoUrl = ''"
                  class="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
                  aria-label="Remove light mode logo"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  Remove
                </button>
              </div>
              <div *ngIf="lightModeLogoUrl" class="mt-3 p-3 rounded-lg border border-gray-300 bg-white">
                <p class="text-xs font-medium text-gray-700 mb-2">Preview (Light Mode):</p>
                <img
                  [src]="lightModeLogoUrl"
                  alt="Light mode logo preview"
                  class="h-16 w-auto max-w-xs"
                />
              </div>
            </div>

            <!-- Dark Mode Logo -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Dark Mode Logo
              </label>
              <div class="flex items-start gap-3">
                <input
                  type="file"
                  #darkLogoInput
                  accept="image/*"
                  (change)="onLogoUpload($event, 'dark')"
                  class="hidden"
                />
                <button
                  (click)="darkLogoInput.click()"
                  [disabled]="uploading"
                  class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors"
                  aria-label="Upload dark mode logo"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                  Upload
                </button>
                <button
                  *ngIf="darkModeLogoUrl"
                  (click)="darkModeLogoUrl = ''"
                  class="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
                  aria-label="Remove dark mode logo"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  Remove
                </button>
              </div>
              <div *ngIf="darkModeLogoUrl" class="mt-3 p-3 rounded-lg border border-gray-700" style="background-color: #1f2937;">
                <p class="text-xs font-medium text-gray-300 mb-2">Preview (Dark Mode):</p>
                <img
                  [src]="darkModeLogoUrl"
                  alt="Dark mode logo preview"
                  class="h-16 w-auto max-w-xs"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Deletions Allowed -->
          <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
            <label for="deletionsAllowed" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Prayer & Update Deletion Policy
            </label>
            <div class="relative">
              <select
                id="deletionsAllowed"
                [(ngModel)]="deletionsAllowed"                name="deletionsAllowed"
                aria-label="Policy for prayer and update deletions"                class="w-full appearance-none px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 cursor-pointer"
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
          <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
            <label for="updatesAllowed" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Prayer Update Policy
            </label>
            <div class="relative">
              <select
                id="updatesAllowed"
                [(ngModel)]="updatesAllowed"
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

        <!-- Save Button -->
        <div class="flex justify-end gap-3 mt-6">
          <button
            (click)="save()"
            [disabled]="saving"
            class="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ng-container *ngIf="saving">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Saving...
            </ng-container>
            <ng-container *ngIf="!saving">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
              Save Branding Settings
            </ng-container>
          </button>
        </div>

        <!-- Success Message -->
        <div *ngIf="success" class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md p-4 mt-4">
          <p class="text-sm text-green-800 dark:text-green-200">
            Branding settings saved successfully!
          </p>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class AppBrandingComponent implements OnInit {
  @Output() onSave = new EventEmitter<void>();

  appTitle = 'Church Prayer Manager';
  appSubtitle = 'Keeping our community connected in prayer';
  useLogo = false;
  lightModeLogoUrl = '';
  darkModeLogoUrl = '';
  deletionsAllowed: AllowanceLevel = 'everyone';
  updatesAllowed: AllowanceLevel = 'everyone';
  loading = false;
  saving = false;
  uploading = false;
  error: string | null = null;
  success = false;

  constructor(private supabase: SupabaseService) {}

  ngOnInit() {
    this.loadSettings();
  }

  async loadSettings() {
    this.loading = true;
    this.error = null;

    try {
      const { data, error } = await this.supabase.client
        .from('admin_settings')
        .select('app_title, app_subtitle, use_logo, light_mode_logo_blob, dark_mode_logo_blob, deletions_allowed, updates_allowed')
        .eq('id', 1)
        .single();

      if (error) throw error;

      if (data) {
        if (data.app_title) this.appTitle = data.app_title;
        if (data.app_subtitle) this.appSubtitle = data.app_subtitle;
        if (data.use_logo !== null) this.useLogo = data.use_logo;
        if (data.light_mode_logo_blob) this.lightModeLogoUrl = data.light_mode_logo_blob;
        if (data.dark_mode_logo_blob) this.darkModeLogoUrl = data.dark_mode_logo_blob;
        if (data.deletions_allowed) this.deletionsAllowed = data.deletions_allowed;
        if (data.updates_allowed) this.updatesAllowed = data.updates_allowed;
      }
    } catch (err: any) {
      console.error('Error loading branding settings:', err);
      this.error = 'Failed to load branding settings';
    } finally {
      this.loading = false;
    }
  }

  onLogoUpload(event: Event, mode: 'light' | 'dark') {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploading = true;
    this.error = null;

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target?.result as string;
      if (mode === 'light') {
        this.lightModeLogoUrl = base64String;
      } else {
        this.darkModeLogoUrl = base64String;
      }
      this.uploading = false;
    };
    reader.onerror = () => {
      this.error = 'Failed to read image file';
      this.uploading = false;
    };
    reader.readAsDataURL(file);
  }

  async save() {
    this.saving = true;
    this.error = null;
    this.success = false;

    try {
      const { error } = await this.supabase.client
        .from('admin_settings')
        .upsert({
          id: 1,
          app_title: this.appTitle,
          app_subtitle: this.appSubtitle,
          use_logo: this.useLogo,
          light_mode_logo_blob: this.lightModeLogoUrl || null,
          dark_mode_logo_blob: this.darkModeLogoUrl || null,
          deletions_allowed: this.deletionsAllowed,
          updates_allowed: this.updatesAllowed,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      this.success = true;
      this.onSave.emit();

      setTimeout(() => {
        this.success = false;
      }, 3000);
    } catch (err: any) {
      console.error('Error saving branding settings:', err);
      this.error = 'Failed to save settings. Please try again.';
    } finally {
      this.saving = false;
    }
  }
}
