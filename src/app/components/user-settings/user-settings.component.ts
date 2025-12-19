import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ThemeService } from '../../services/theme.service';
import { SupabaseService } from '../../services/supabase.service';
import { PrintService } from '../../services/print.service';
import { Subject, takeUntil } from 'rxjs';

type ThemeOption = 'light' | 'dark' | 'system';
type PrintRange = 'week' | 'twoweeks' | 'month' | 'year' | 'all';

@Component({
  selector: 'app-user-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- Modal Overlay -->
    <div 
      *ngIf="isOpen"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4"
      (click)="onClose.emit()"
    >
      <div 
        class="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md sm:max-w-lg lg:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto"
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
              <div *ngIf="showPrintDropdown">
                <div
                  class="fixed inset-0 z-10"
                  (click)="showPrintDropdown = false"
                ></div>
                <div class="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                  <button
                    *ngFor="let option of printRangeOptions"
                    (click)="setPrintRange(option.value); showPrintDropdown = false"
                    class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
                  >
                    <span>{{ option.label }}</span>
                    <span *ngIf="printRange === option.value" class="text-green-600 dark:text-green-400">✓</span>
                  </button>
                </div>
              </div>
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
              <div *ngIf="showPromptTypesDropdown">
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
                    <span *ngIf="selectedPromptTypes.length === 0" class="text-green-600 dark:text-green-400">✓</span>
                  </button>
                  <button
                    *ngFor="let type of promptTypes"
                    (click)="togglePromptType(type)"
                    class="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
                  >
                    <span>{{ type }}</span>
                    <span *ngIf="selectedPromptTypes.includes(type)" class="text-green-600 dark:text-green-400">✓</span>
                  </button>
                </div>
              </div>
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

          <!-- Email Subscription Section Header -->
          <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 sm:p-4">
            <div class="flex items-start gap-2 sm:gap-3">
              <svg class="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <div>
                <h4 class="font-semibold text-gray-900 dark:text-gray-100 mb-1 text-sm sm:text-base">
                  Prayer Notification Settings
                </h4>
                <p class="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                  Sign up for prayer notifications or change your existing preference. 
                  Enter your email below to manage your subscription.
                </p>
              </div>
            </div>
          </div>

          <!-- User Information -->
          <div class="space-y-4">
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Email Address
              </label>
              <input
                type="email"
                id="email"
                [(ngModel)]="email"
                placeholder="your.email@example.com"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Your preferences will load automatically
              </p>
            </div>

            <!-- Name Input - Only show after email is entered -->
            <div *ngIf="email.trim()">
              <label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Your Name
              </label>
              <input
                type="text"
                id="name"
                [(ngModel)]="name"
                placeholder="John Doe"
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <!-- Notification Preferences -->
            <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4">
              <div class="flex items-start gap-2 sm:gap-3">
                <svg class="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <div class="flex-1">
                  <div class="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="notifications"
                      [(ngModel)]="receiveNotifications"
                      class="mt-1 h-4 w-4 text-blue-600 border-gray-300 bg-white dark:bg-gray-800 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <label for="notifications" class="font-medium text-gray-800 dark:text-gray-100 text-sm sm:text-base cursor-pointer">
                        Receive new prayer notifications
                      </label>
                      <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Sign up for prayer notifications or change your preference when new prayers are submitted to the prayer list
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- How it Works -->
            <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 sm:p-4">
              <div class="flex items-start gap-2">
                <svg class="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5 w-4 h-4 sm:w-[18px] sm:h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <div class="text-xs sm:text-sm text-blue-800 dark:text-blue-200">
                  <p class="font-medium mb-2">How it works:</p>
                  <ul class="list-disc list-inside space-y-1 ml-2 mb-3">
                    <li>Enter your email to automatically load your current preferences</li>
                    <li>Toggle notifications on/off and click "Submit for Approval"</li>
                    <li>Admin will review and approve/deny your request</li>
                    <li>You'll receive an email confirmation once reviewed</li>
                    <li>After approval, your new settings take effect immediately</li>
                    <li>Reopen this settings panel to see your updated preferences</li>
                  </ul>
                  <p class="font-medium mb-1">You will always receive:</p>
                  <ul class="list-disc list-inside space-y-1 ml-2">
                    <li>Approval/denial notifications for prayers you submit</li>
                    <li>Status update notifications for your prayers</li>
                  </ul>
                  <p class="mt-2">
                    This setting only controls notifications about <strong>other people's new prayers</strong>.
                  </p>
                </div>
              </div>
            </div>

            <!-- Success Message -->
            <div *ngIf="success" class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3">
              <div class="flex items-start gap-2">
                <svg class="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <p class="text-sm text-green-800 dark:text-green-200">{{ success }}</p>
              </div>
            </div>

            <!-- Error Message -->
            <div *ngIf="error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
              <div class="flex items-start gap-2">
                <svg class="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <p class="text-sm text-red-800 dark:text-red-200">{{ error }}</p>
              </div>
            </div>
          </div>

        <!-- Footer -->
          <div class="flex flex-col sm:flex-row gap-2 sm:gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              (click)="savePreferences()"
              [disabled]="saving || !email.trim() || !name.trim()"
              class="flex-1 px-4 py-2 sm:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors text-sm sm:text-base font-medium"
            >
              {{ saving ? 'Submitting...' : 'Submit for Approval' }}
            </button>
            <button
              (click)="onClose.emit()"
              class="px-4 py-2 sm:py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm sm:text-base font-medium sm:min-w-[100px]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
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
  receiveNotifications = true;
  theme: ThemeOption = 'system';
  saving = false;
  error: string | null = null;
  success: string | null = null;
  isPrinting = false;
  isPrintingPrompts = false;
  printRange: PrintRange = 'week';
  showPrintDropdown = false;
  showPromptTypesDropdown = false;
  promptTypes: string[] = [];
  selectedPromptTypes: string[] = [];

  private destroy$ = new Subject<void>();

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
    private supabase: SupabaseService
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
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.loadPromptTypes();
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

  savePreferences(): void {
    this.saving = true;
    this.error = null;
    this.success = null;

    // Save user info to localStorage
    const names = this.name.trim().split(' ');
    const firstName = names[0] || '';
    const lastName = names.slice(1).join(' ') || '';

    const userInfo = {
      firstName,
      lastName,
      email: this.email.trim()
    };

    localStorage.setItem('userInfo', JSON.stringify(userInfo));

    // TODO: Save to database if email is provided
    // TODO: Implement email verification flow

    setTimeout(() => {
      this.saving = false;
      this.success = 'Preferences saved successfully!';
      
      setTimeout(() => {
        this.onClose.emit();
      }, 1500);
    }, 1000);
  }

  private getUserInfo(): { firstName: string; lastName: string; email: string } {
    try {
      const stored = localStorage.getItem('userInfo');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading user info:', error);
    }
    return { firstName: '', lastName: '', email: '' };
  }
}
