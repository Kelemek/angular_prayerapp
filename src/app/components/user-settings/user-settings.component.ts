import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../services/theme.service';
import { SupabaseService } from '../../services/supabase.service';
import { PrintService } from '../../services/print.service';
import { EmailNotificationService } from '../../services/email-notification.service';
import { AdminAuthService } from '../../services/admin-auth.service';
import { GitHubFeedbackService } from '../../services/github-feedback.service';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { getUserInfo } from '../../../utils/userInfoStorage';
import { GitHubFeedbackFormComponent } from '../github-feedback-form/github-feedback-form.component';

type ThemeOption = 'light' | 'dark' | 'system';
type PrintRange = 'week' | 'twoweeks' | 'month' | 'year' | 'all';

@Component({
  selector: 'app-user-settings',
  standalone: true,
  imports: [NgClass, FormsModule, GitHubFeedbackFormComponent],
  template: `
    <!-- Modal Overlay -->
    @if (isOpen) {
    <div 
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
      style="padding-top: max(8px, env(safe-area-inset-top)); padding-bottom: max(8px, env(safe-area-inset-bottom));"
      (click)="onClose.emit()"
    >
      <div 
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md sm:max-w-lg lg:max-w-2xl max-h-[90dvh] sm:max-h-[85dvh] overflow-y-auto"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div class="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div class="flex items-center gap-2">
            <svg class="text-blue-600 dark:text-blue-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100">
              Settings
            </h2>
          </div>
          <button
            (click)="onClose.emit()"
            title="Close settings"
            class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Content -->
        <div class="p-4 sm:p-6 space-y-4">
          <!-- Print Buttons -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <!-- Print Prayer List -->
            <div class="relative">
              <div class="flex">
                <button
                  (click)="handlePrint()"
                  title="Print all prayers"
                  [disabled]="isPrinting"
                  class="flex-1 flex items-center justify-center gap-2 px-4 py-2 sm:py-3 bg-green-600 text-white rounded-l-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
                >
                  <svg 
                    width="18" 
                    height="18" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    stroke-width="2" 
                    stroke-linecap="round" 
                    stroke-linejoin="round"
                    [class.animate-spin]="isPrinting"
                  >
                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                    <rect x="6" y="14" width="12" height="8"></rect>
                  </svg>
                  <span class="font-medium">{{ isPrinting ? 'Generating...' : 'Print Prayer List' }}</span>
                </button>
                <button
                  (click)="showPrintDropdown = !showPrintDropdown"
                  [disabled]="isPrinting"
                  class="flex items-center justify-center px-2 bg-green-600 text-white rounded-r-lg border-l border-green-500 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
                >
                  <svg 
                    width="18" 
                    height="18" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    stroke-width="2" 
                    stroke-linecap="round" 
                    stroke-linejoin="round"
                    [class.rotate-180]="showPrintDropdown"
                    class="transition-transform"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              </div>
              
              <!-- Print Range Dropdown -->
              @if (showPrintDropdown) {
              <div>
                <div
                  class="fixed inset-0 z-10"
                  (click)="showPrintDropdown = false"
                ></div>
                <div class="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                  @for (option of printRangeOptions; track option.value) {
                  <button
                    (click)="setPrintRange(option.value); showPrintDropdown = false"
                    class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
                  >
                    <span>{{ option.label }}</span>
                    @if (printRange === option.value) {
                      <span class="text-green-600 dark:text-green-400">✓</span>
                    }
                  </button>
                  }
                </div>
              </div>
              }
            </div>

            <!-- Print Prompts -->
            <div class="relative">
              <div class="flex">
                <button
                  (click)="handlePrintPrompts()"
                  [disabled]="isPrintingPrompts"
                  class="flex-1 flex items-center justify-center gap-2 px-4 py-2 sm:py-3 bg-green-600 text-white rounded-l-lg hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
                >
                  <svg 
                    width="18" 
                    height="18" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    stroke-width="2" 
                    stroke-linecap="round" 
                    stroke-linejoin="round"
                    [class.animate-spin]="isPrintingPrompts"
                  >
                    <polyline points="6 9 6 2 18 2 18 9"></polyline>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                    <rect x="6" y="14" width="12" height="8"></rect>
                  </svg>
                  <span class="font-medium">{{ isPrintingPrompts ? 'Generating...' : 'Print Prompts' }}</span>
                </button>
                <button
                  (click)="showPromptTypesDropdown = !showPromptTypesDropdown"
                  [disabled]="isPrintingPrompts"
                  class="flex items-center justify-center px-2 bg-green-600 text-white rounded-r-lg border-l border-green-500 hover:bg-green-700 disabled:bg-green-400 disabled:cursor-not-allowed transition-colors"
                >
                  <svg 
                    width="18" 
                    height="18" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    stroke-width="2" 
                    stroke-linecap="round" 
                    stroke-linejoin="round"
                    [class.rotate-180]="showPromptTypesDropdown"
                    class="transition-transform"
                  >
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              </div>
              
              <!-- Prompt Types Dropdown -->
              @if (showPromptTypesDropdown) {
              <div>
                <div
                  class="fixed inset-0 z-10"
                  (click)="showPromptTypesDropdown = false"
                ></div>
                <div class="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20 max-h-60 overflow-y-auto">
                  <button
                    (click)="selectedPromptTypes = []; showPromptTypesDropdown = false"
                    class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
                  >
                    <span>All Types</span>
                    @if (selectedPromptTypes.length === 0) {
                      <span class="text-green-600 dark:text-green-400">✓</span>
                    }
                  </button>
                  @for (type of promptTypes; track type) {
                  <button
                    (click)="togglePromptType(type)"
                    class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
                  >
                    <span>{{ type }}</span>
                    @if (selectedPromptTypes.includes(type)) {
                      <span class="text-green-600 dark:text-green-400">✓</span>
                    }
                  </button>
                  }
                </div>
              </div>
              }
            </div>
          </div>

          <!-- Theme Selector -->
          <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4">
            <div class="flex items-start gap-2 sm:gap-3">
              <svg class="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
              <div class="flex-1">
                <div class="font-medium text-gray-800 dark:text-gray-100 mb-3 text-sm sm:text-base">
                  Theme Preference
                </div>
                <div class="grid grid-cols-3 gap-1.5 sm:gap-2">
                  <button
                    (click)="handleThemeChange('light')"
                    [ngClass]="{
                      'border-blue-500 bg-blue-50 dark:bg-blue-900/20': theme === 'light',
                      'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600': theme !== 'light'
                    }"
                    class="flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-lg border-2 transition-all"
                  >
                    <svg width="18" height="18" class="text-amber-600 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="5"></circle>
                      <line x1="12" y1="1" x2="12" y2="3"></line>
                      <line x1="12" y1="21" x2="12" y2="23"></line>
                      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                      <line x1="1" y1="12" x2="3" y2="12"></line>
                      <line x1="21" y1="12" x2="23" y2="12"></line>
                      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                    </svg>
                    <span class="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100">Light</span>
                  </button>
                  <button
                    (click)="handleThemeChange('dark')"
                    [ngClass]="{
                      'border-blue-500 bg-blue-50 dark:bg-blue-900/20': theme === 'dark',
                      'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600': theme !== 'dark'
                    }"
                    class="flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-lg border-2 transition-all"
                  >
                    <svg width="18" height="18" class="text-blue-600 dark:text-blue-400 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    </svg>
                    <span class="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100">Dark</span>
                  </button>
                  <button
                    (click)="handleThemeChange('system')"
                    [ngClass]="{
                      'border-blue-500 bg-blue-50 dark:bg-blue-900/20': theme === 'system',
                      'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600': theme !== 'system'
                    }"
                    class="flex flex-col items-center gap-1 sm:gap-2 p-2 sm:p-3 rounded-lg border-2 transition-all"
                  >
                    <svg width="18" height="18" class="text-gray-600 dark:text-gray-400 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                      <line x1="8" y1="21" x2="16" y2="21"></line>
                      <line x1="12" y1="17" x2="12" y2="21"></line>
                    </svg>
                    <span class="text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-100">System</span>
                  </button>
                </div>
                <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Choose your preferred color theme or use your system settings
                </p>
              </div>
            </div>
          </div>

          <!-- Divider -->
          <div class="border-t border-gray-200 dark:border-gray-700"></div>

          <!-- Email Subscription Toggle -->
          <div class="flex items-start gap-3 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
            @if (preferencesLoaded) {
            <input
              type="checkbox"
              id="notifications"
              [(ngModel)]="receiveNotifications"
              (ngModelChange)="onNotificationToggle()"
              [disabled]="saving"
              name="notifications"
              aria-label="Receive prayer notifications"
              class="mt-1 h-4 w-4 text-blue-600 border-gray-300 bg-white dark:bg-gray-800 rounded focus:ring-blue-500 cursor-pointer focus:ring-2 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            } @else {
            <!-- Loading skeleton -->
            <div class="mt-1 h-4 w-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse flex-shrink-0"></div>
            }
            <div class="flex-1">
              <div class="flex items-center gap-2">
                <div class="font-medium text-gray-900 dark:text-gray-100 text-sm sm:text-base">
                  @if (preferencesLoaded) {
                  {{ receiveNotifications ? 'Subscribed to Prayer Notifications' : 'Not Subscribed to Prayer Notifications' }}
                  } @else {
                  <span class="inline-block h-5 w-48 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></span>
                  }
                </div>
                @if (saving) {
                <svg class="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                }
              </div>
              <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                @if (preferencesLoaded && receiveNotifications !== null) {
                {{ saving ? 'Saving...' : (receiveNotifications ? 'You are receiving prayer notifications' : 'You are not receiving prayer notifications') }}
                } @else {
                <span class="inline-block h-4 w-64 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></span>
                }
              </p>
            </div>
          </div>

          <!-- Success/Error Messages -->
          @if (success) {
          <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="flex items-start gap-2">
              <svg class="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <p class="text-sm text-green-800 dark:text-green-200">{{ success }}</p>
            </div>
          </div>
          }

          <!-- Error Message -->
          @if (error) {
          <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="flex items-start gap-2">
              <svg class="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <p class="text-sm text-red-800 dark:text-red-200">{{ error }}</p>
            </div>
          </div>
          }

          <!-- Divider -->
          <div class="border-t border-gray-200 dark:border-gray-700"></div>

          <!-- GitHub Feedback Form -->
          @if (githubFeedbackEnabled) {
          <app-github-feedback-form [userEmail]="getCurrentUserEmail()" [userName]="getCurrentUserName()"></app-github-feedback-form>
          }

        <!-- Footer -->
          <div class="flex flex-col sm:flex-row gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              (click)="logout()"
              class="flex items-center justify-center gap-2 px-4 py-2 sm:py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors text-sm sm:text-base font-medium"
              aria-label="Logout"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Logout</span>
            </button>
            <button
              (click)="onClose.emit()"
              class="px-4 py-2 sm:py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors text-sm sm:text-base font-medium sm:min-w-[100px]"
              aria-label="Close settings"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
    }
  `,
  styles: [`
    :host {
      display: contents;
    }
  `]
})
export class UserSettingsComponent implements OnInit, OnDestroy {
  @Input() isOpen = false;
  @Output() onClose = new EventEmitter<void>();

  name = '';
  email = '';
  receiveNotifications: boolean | null = null;
  theme: ThemeOption = 'system';
  saving = false;
  error: string | null = null;
  success: string | null = null;
  preferencesLoaded = false;
  
  isPrinting = false;
  isPrintingPrompts = false;
  printRange: PrintRange = 'week';
  showPrintDropdown = false;
  showPromptTypesDropdown = false;
  promptTypes: string[] = [];
  selectedPromptTypes: string[] = [];
  githubFeedbackEnabled = false;

  private destroy$ = new Subject<void>();
  private emailChange$ = new Subject<string>();
  private isInitialLoad = false;

  themeOptions = [
    {
      value: 'light' as ThemeOption,
      label: 'Light',
      icon: '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>'
    },
    {
      value: 'dark' as ThemeOption,
      label: 'Dark',
      icon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>'
    },
    {
      value: 'system' as ThemeOption,
      label: 'System',
      icon: '<rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line>'
    }
  ];

  printRangeOptions = [
    { value: 'week' as PrintRange, label: 'Last Week' },
    { value: 'twoweeks' as PrintRange, label: 'Last 2 Weeks' },
    { value: 'month' as PrintRange, label: 'Last Month' },
    { value: 'year' as PrintRange, label: 'Last Year' },
    { value: 'all' as PrintRange, label: 'All Prayers' }
  ];

  constructor(
    private themeService: ThemeService,
    private printService: PrintService,
    private supabase: SupabaseService,
    private emailNotification: EmailNotificationService,
    private adminAuthService: AdminAuthService,
    private githubFeedbackService: GitHubFeedbackService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Load current theme from service
    this.theme = this.themeService.getTheme() as ThemeOption;

    // Load user info from localStorage if available
    const userInfo = this.getUserInfo();
    if (userInfo.firstName && userInfo.lastName) {
      this.name = `${userInfo.firstName} ${userInfo.lastName}`;
    }
    this.email = userInfo.email;

    // Load GitHub feedback enabled status
    this.loadGitHubFeedbackStatus();

    // Set up email change debounce listener
    this.emailChange$
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(800),
        distinctUntilChanged()
      )
      .subscribe((email) => {
        if (!this.isInitialLoad) {
          this.loadPreferencesAutomatically(email);
        }
      });
  }

  private async loadUserNameFromDatabase(email: string): Promise<void> {
    try {
      const { data, error } = await this.supabase.client
        .from('email_subscribers')
        .select('first_name, last_name')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (!error && data) {
        const firstName = data.first_name || '';
        const lastName = data.last_name || '';
        if (firstName || lastName) {
          this.name = `${firstName}${lastName ? ' ' + lastName : ''}`.trim();
          // Also save to localStorage for future use
          if (firstName && lastName) {
            const userInfo = this.getUserInfo();
            const util = await import('../../../utils/userInfoStorage');
            util.saveUserInfo(firstName, lastName, userInfo.email);
          }
        }
      }
    } catch (err) {
      console.error('Error loading user name from database:', err);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.loadPromptTypes();
      
      // Mark that we're doing initial load
      this.isInitialLoad = true;
      this.preferencesLoaded = false;
      
      // Load user info from localStorage
      const userInfo = this.getUserInfo();
      if (userInfo.firstName && userInfo.lastName) {
        this.name = `${userInfo.firstName} ${userInfo.lastName}`;
      }
      this.email = userInfo.email;
      
      // Load user name from database if not in localStorage
      if ((!userInfo.firstName || !userInfo.lastName) && userInfo.email) {
        this.loadUserNameFromDatabase(userInfo.email);
      }
      
      this.error = null;
      this.success = null;
      
      // If we have an email, try to load preferences from database
      if (userInfo.email.trim()) {
        this.loadPreferencesAutomatically(userInfo.email);
      } else {
        // No email - set default and mark as loaded
        this.receiveNotifications = true;
        this.preferencesLoaded = true;
      }
      
      // Reset flag after a short delay
      setTimeout(() => {
        this.isInitialLoad = false;
      }, 100);
    }
  }

  async loadPromptTypes(): Promise<void> {
    try {
      const { data, error } = await this.supabase.client
        .from('prayer_types')
        .select('name, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      
      if (!error && data) {
        this.promptTypes = data.map(t => t.name);
      }
    } catch (err) {
      console.error('Error fetching prayer types:', err);
    }
  }

  async loadGitHubFeedbackStatus(): Promise<void> {
    try {
      const config = await this.githubFeedbackService.getGitHubConfig();
      this.githubFeedbackEnabled = config?.enabled || false;
      this.cdr.markForCheck();
    } catch (err) {
      console.error('Error loading GitHub feedback status:', err);
      this.githubFeedbackEnabled = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  handleThemeChange(newTheme: ThemeOption): void {
    this.theme = newTheme;
    this.themeService.setTheme(newTheme);
  }

  setPrintRange(range: PrintRange): void {
    this.printRange = range;
  }
  async handlePrint(): Promise<void> {
    this.isPrinting = true;
    
    // Open window immediately (Safari requires this to be synchronous with user click)
    const newWindow = window.open('', '_blank');
    
    try {
      await this.printService.downloadPrintablePrayerList(this.printRange, newWindow);
    } catch (error) {
      console.error('Error printing prayer list:', error);
      if (newWindow) newWindow.close();
    } finally {
      this.isPrinting = false;
    }
  }

  async handlePrintPrompts(): Promise<void> {
    this.isPrintingPrompts = true;
    
    // Open window immediately for Safari compatibility
    const newWindow = window.open('', '_blank');
    
    try {
      await this.printService.downloadPrintablePromptList(this.selectedPromptTypes, newWindow);
    } catch (error) {
      console.error('Error printing prompts:', error);
      if (newWindow) newWindow.close();
    } finally {
      this.isPrintingPrompts = false;
    }
  }

  togglePromptType(type: string): void {
    const index = this.selectedPromptTypes.indexOf(type);
    if (index > -1) {
      this.selectedPromptTypes = this.selectedPromptTypes.filter(t => t !== type);
    } else {
      this.selectedPromptTypes = [...this.selectedPromptTypes, type];
    }
  }

  private async loadPreferencesAutomatically(emailAddress: string): Promise<void> {
    if (!emailAddress.trim()) {
      this.preferencesLoaded = true;
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailAddress)) {
      this.preferencesLoaded = true;
      return;
    }

    try {
      // Check for approved preferences in email_subscribers
      const { data: subscriberData, error } = await this.supabase.client
        .from('email_subscribers')
        .select('*')
        .eq('email', emailAddress.toLowerCase().trim())
        .maybeSingle();

      if (error) {
        console.error('Error loading subscriber preferences:', error);
        this.receiveNotifications = true; // Default to true on error
        this.preferencesLoaded = true;
        return;
      }

      if (subscriberData) {
        // User has approved preferences
        if (subscriberData.name && subscriberData.name.trim()) {
          this.name = subscriberData.name;
        }
        this.receiveNotifications = subscriberData.is_active;
      } else {
        // New user - set defaults
        this.receiveNotifications = true;
      }
      
      this.preferencesLoaded = true;
      this.cdr.markForCheck();
    } catch (err) {
      console.error('Error loading preferences:', err);
      this.receiveNotifications = true; // Default to true on error
      this.preferencesLoaded = true;
    }
  }

  onEmailChange(): void {
    this.emailChange$.next(this.email);
  }

  async onNotificationToggle(): Promise<void> {
    const userInfo = this.getUserInfo();
    const email = userInfo.email.toLowerCase().trim();
    
    if (!email) {
      this.error = 'Email not found. Please log in again.';
      return;
    }

    this.saving = true;
    this.error = null;
    this.success = null;

    try {
      console.log('Toggling notification for email:', email, 'to:', this.receiveNotifications);
      
      // Check if subscriber exists
      const { data: existingSubscriber, error: fetchError } = await this.supabase.client
        .from('email_subscribers')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (fetchError) {
        console.error('Fetch error:', fetchError);
        throw fetchError;
      }

      console.log('Existing subscriber:', existingSubscriber);

      if (existingSubscriber) {
        // Update existing subscriber
        console.log('Updating existing subscriber...');
        const { error: updateError } = await this.supabase.client
          .from('email_subscribers')
          .update({ is_active: this.receiveNotifications })
          .eq('id', existingSubscriber.id);

        if (updateError) {
          console.error('Update error:', updateError);
          throw updateError;
        }
        console.log('Successfully updated subscriber');
      } else {
        // Create new subscriber
        console.log('Creating new subscriber...');
        const { error: insertError } = await this.supabase.client
          .from('email_subscribers')
          .insert({
            email,
            is_active: this.receiveNotifications,
            name: userInfo.firstName ? `${userInfo.firstName} ${userInfo.lastName}`.trim() : ''
          });

        if (insertError) {
          console.error('Insert error:', insertError);
          throw insertError;
        }
        console.log('Successfully created subscriber');
      }

      this.success = `✅ Notifications ${this.receiveNotifications ? 'enabled' : 'disabled'} successfully!`;
      this.saving = false;
      this.cdr.markForCheck();
      console.log('Success! Clearing message in 3 seconds');
      setTimeout(() => {
        this.success = null;
        this.cdr.markForCheck();
      }, 3000);
    } catch (err) {
      console.error('Error updating notification preference:', err);
      this.error = err instanceof Error ? err.message : 'Failed to update preference';
      this.receiveNotifications = !this.receiveNotifications; // Revert toggle on error
      this.saving = false;
      this.cdr.markForCheck();
    } finally {
      console.log('Setting saving to false');
    }
  }

  private getUserInfo(): { firstName: string; lastName: string; email: string } {
    return getUserInfo();
  }

  getCurrentUserEmail(): string {
    const userInfo = this.getUserInfo();
    return userInfo.email || this.email || '';
  }

  getCurrentUserName(): string {
    // First try to use the name property which is updated from localStorage and database
    if (this.name) {
      return this.name;
    }
    
    // Fallback to getUserInfo from localStorage
    const userInfo = this.getUserInfo();
    const firstName = userInfo.firstName || '';
    const lastName = userInfo.lastName || '';
    return (firstName + (lastName ? ' ' + lastName : '')).trim();
  }

  async logout(): Promise<void> {
    await this.adminAuthService.logout();
  }
}
