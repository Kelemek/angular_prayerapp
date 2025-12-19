import { Component, Input, Output, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

type ContentType = 'prayers' | 'prompts' | 'both';
type ThemeOption = 'light' | 'dark' | 'system';
type TimeFilter = 'week' | 'twoweeks' | 'month' | 'year' | 'all';

@Component({
  selector: 'app-presentation-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="visible" class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div class="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] flex flex-col">
        <div class="flex items-center justify-between p-8 pb-4 border-b border-gray-200 dark:border-gray-700">
          <h2 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h2>
          <button
            (click)="close.emit()"
            class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="space-y-6 px-8 pb-8 overflow-y-auto">
          <!-- Theme Selection -->
          <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 mt-4">
            <div class="flex items-start gap-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5">
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
                <div class="font-medium text-gray-800 dark:text-gray-100 mb-3 text-base">
                  Theme Preference
                </div>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    (click)="themeChange.emit('light')"
                    class="flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all"
                    [ngClass]="{
                      'border-blue-500 bg-blue-50 dark:bg-blue-900/20': theme === 'light',
                      'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600': theme !== 'light'
                    }">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-600">
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
                    <span class="text-sm font-medium text-gray-800 dark:text-gray-100">Light</span>
                  </button>
                  <button
                    (click)="themeChange.emit('dark')"
                    class="flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all"
                    [ngClass]="{
                      'border-blue-500 bg-blue-50 dark:bg-blue-900/20': theme === 'dark',
                      'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600': theme !== 'dark'
                    }">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-blue-600 dark:text-blue-400">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    </svg>
                    <span class="text-sm font-medium text-gray-800 dark:text-gray-100">Dark</span>
                  </button>
                  <button
                    (click)="themeChange.emit('system')"
                    class="flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all"
                    [ngClass]="{
                      'border-blue-500 bg-blue-50 dark:bg-blue-900/20': theme === 'system',
                      'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600': theme !== 'system'
                    }">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-gray-600 dark:text-gray-400">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                      <line x1="8" y1="21" x2="16" y2="21"></line>
                    </svg>
                    <span class="text-sm font-medium text-gray-800 dark:text-gray-100">System</span>
                  </button>
                </div>
                <p class="text-sm text-gray-700 dark:text-gray-300 mt-2">
                  Choose your preferred color theme or use your system settings
                </p>
              </div>
            </div>
          </div>

          <!-- Smart Mode -->
          <div>
            <label class="flex items-start gap-3 cursor-pointer mb-6">
              <input type="checkbox" [(ngModel)]="localSmartMode" (ngModelChange)="smartModeChange.emit($event)" class="w-6 h-6 rounded text-blue-600 mt-0.5">
              <span class="text-xl text-gray-900 dark:text-gray-100">Smart Mode (adjust time based on content length)</span>
            </label>
          </div>

          <!-- Duration Slider and Quick Buttons (when not smart mode) -->
          <div *ngIf="!localSmartMode">
            <label class="block text-xl mb-3 text-gray-900 dark:text-gray-100">Auto-advance interval (seconds)</label>
            <input
              type="range"
              min="5"
              max="60"
              step="5"
              [(ngModel)]="localDisplayDuration"
              (ngModelChange)="displayDurationChange.emit($event)"
              class="w-full h-3 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600">
            <div class="text-center text-2xl mt-2 font-semibold text-gray-900 dark:text-gray-100">{{ localDisplayDuration }}s</div>
            
            <!-- Quick Duration Buttons -->
            <div class="flex gap-3 mt-4">
              <button
                (click)="setDuration(10)"
                class="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-lg transition-colors">
                10s
              </button>
              <button
                (click)="setDuration(20)"
                class="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-lg transition-colors">
                20s
              </button>
              <button
                (click)="setDuration(30)"
                class="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg text-lg transition-colors">
                30s
              </button>
            </div>
          </div>

          <!-- Smart Mode Info Box -->
          <div *ngIf="localSmartMode" class="bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg p-4">
            <p class="text-lg text-gray-800 dark:text-gray-100 mb-2">
              Smart mode automatically adjusts display time based on prayer length, giving you more time to read longer prayers and updates.
            </p>
            <button
              (click)="showSmartModeDetails = !showSmartModeDetails"
              class="text-blue-600 dark:text-blue-400 hover:underline text-base font-medium flex items-center gap-1">
              {{ showSmartModeDetails ? '− Hide details' : '+ Show details' }}
            </button>
            <div *ngIf="showSmartModeDetails" class="mt-3 pt-3 border-t border-blue-300 dark:border-blue-700 text-base text-gray-700 dark:text-gray-300 space-y-2">
              <p><strong>How it works:</strong></p>
              <ul class="list-disc list-inside space-y-1 ml-2">
                <li>Counts characters in prayer description and up to 3 recent updates</li>
                <li>Reading pace: ~120 characters per 10 seconds</li>
                <li>Minimum time: 10 seconds per prayer</li>
                <li>Maximum time: 120 seconds (2 minutes) per prayer</li>
              </ul>
              <p class="text-sm italic mt-2">
                Example: A prayer with 240 characters will display for about 20 seconds
              </p>
            </div>
          </div>

          <!-- Content Type -->
          <div>
            <label class="block text-xl mb-3 text-gray-900 dark:text-gray-100">Content Type</label>
            <div class="relative">
              <select
                [(ngModel)]="localContentType"
                (ngModelChange)="contentTypeChange.emit($event)"
                class="w-full appearance-none px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#0047AB] focus:border-transparent pr-12">
                <option value="prayers">Prayers</option>
                <option value="prompts">Prayer Prompts</option>
                <option value="both">Both</option>
              </select>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-700 dark:text-gray-300 z-10">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>

          <!-- Randomize Toggle -->
          <div>
            <label class="flex items-center justify-between cursor-pointer">
              <span class="text-xl text-gray-900 dark:text-gray-100">Randomize Order</span>
              <div class="relative">
                <input
                  type="checkbox"
                  [(ngModel)]="localRandomize"
                  (ngModelChange)="randomizeChange.emit($event)"
                  class="sr-only peer">
                <div class="w-14 h-8 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
              </div>
            </label>
            <p class="text-sm text-gray-700 dark:text-gray-300 mt-2">
              Shuffle the display order randomly
            </p>
          </div>

          <!-- Time Filter (for prayers only) -->
          <div *ngIf="localContentType === 'prayers'">
            <label class="block text-xl mb-3 text-gray-900 dark:text-gray-100">Time Period</label>
            <div class="relative">
              <select
                [(ngModel)]="localTimeFilter"
                (ngModelChange)="timeFilterChange.emit($event)"
                class="w-full appearance-none px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#0047AB] focus:border-transparent pr-12">
                <option value="week">Last Week</option>
                <option value="twoweeks">Last 2 Weeks</option>
                <option value="month">Last Month</option>
                <option value="year">Last Year</option>
                <option value="all">All Time</option>
              </select>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-700 dark:text-gray-300 z-10">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
          </div>

          <!-- Prayer Status (for prayers only) -->
          <div *ngIf="localContentType === 'prayers'">
            <label class="block text-xl mb-3 text-gray-900 dark:text-gray-100">Prayer Status</label>
            <div class="relative">
              <div class="flex">
                <div class="flex-1 flex items-center px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-l-lg text-lg border border-r-0 border-gray-300 dark:border-gray-600">
                  <span>{{ getStatusFilterDisplay() }}</span>
                </div>
                <button
                  (click)="toggleStatusDropdown()"
                  class="flex items-center justify-center px-3 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-r-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                    [class.rotate-180]="showStatusDropdown"
                    class="transition-transform">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
              </div>
              <div *ngIf="showStatusDropdown">
                <div class="fixed inset-0 z-[60]" (click)="applyStatusFilter()"></div>
                <div class="absolute left-0 right-0 mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-[70]">
                  <div
                    *ngFor="let status of ['current', 'answered', 'archived']"
                    (mousedown)="togglePendingStatus(status); $event.preventDefault()"
                    class="w-full text-left px-4 py-3 text-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between capitalize cursor-pointer">
                    <span>{{ status }}</span>
                    <span *ngIf="isPendingStatusSelected(status)" class="text-green-600 dark:text-green-400">✓</span>
                  </div>
                  <div
                    (mousedown)="clearPendingStatus(); $event.preventDefault()"
                    class="w-full text-left px-4 py-3 text-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between cursor-pointer border-t border-gray-200 dark:border-gray-700">
                    <span>All Statuses</span>
                    <span *ngIf="pendingStatusFilter.length === 0" class="text-green-600 dark:text-green-400">✓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Prayer Timer -->
          <div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div class="flex items-start gap-3 mb-4">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-[#2F5F54] dark:text-[#5FB876] flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <div class="flex-1">
                <div class="font-medium text-gray-800 dark:text-gray-100 mb-2 text-base">
                  Prayer Timer
                </div>
                <p class="text-sm text-gray-700 dark:text-gray-300">
                  Set a dedicated time for focused prayer
                </p>
              </div>
            </div>
            
            <label class="block text-lg mb-3 text-gray-900 dark:text-gray-100">Duration (minutes)</label>
            <input
              type="range"
              min="1"
              max="60"
              step="1"
              [(ngModel)]="localPrayerTimerMinutes"
              (ngModelChange)="prayerTimerMinutesChange.emit($event)"
              class="w-full h-3 bg-gray-300 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#2F5F54]">
            <div class="text-center text-2xl mt-2 font-semibold text-gray-900 dark:text-gray-100">{{ localPrayerTimerMinutes }} min</div>
            
            <button
              (click)="startPrayerTimer.emit()"
              class="w-full mt-4 px-6 py-3 bg-[#2F5F54] hover:bg-[#1a3a2e] text-white rounded-lg text-lg font-semibold transition-colors">
              Start Prayer Timer
            </button>
          </div>

          <!-- Refresh Button -->
          <button
            (click)="refresh.emit()"
            class="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-gray-100 rounded-lg text-lg font-semibold transition-colors">
            Refresh Prayers
          </button>
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
export class PresentationSettingsModalComponent implements OnInit, OnChanges {
  @Input() visible = false;
  @Input() theme: ThemeOption = 'system';
  @Input() smartMode = true;
  @Input() displayDuration = 10;
  @Input() contentType: ContentType = 'prayers';
  @Input() randomize = false;
  @Input() timeFilter: TimeFilter = 'month';
  @Input() statusFiltersCurrent = true;
  @Input() statusFiltersAnswered = true;
  @Input() prayerTimerMinutes = 10;
  
  @Output() close = new EventEmitter<void>();
  @Output() themeChange = new EventEmitter<ThemeOption>();
  @Output() smartModeChange = new EventEmitter<boolean>();
  @Output() displayDurationChange = new EventEmitter<number>();
  @Output() contentTypeChange = new EventEmitter<ContentType>();
  @Output() randomizeChange = new EventEmitter<boolean>();
  @Output() timeFilterChange = new EventEmitter<TimeFilter>();
  @Output() statusFiltersChange = new EventEmitter<{current: boolean, answered: boolean}>();
  @Output() prayerTimerMinutesChange = new EventEmitter<number>();
  @Output() startPrayerTimer = new EventEmitter<void>();
  @Output() refresh = new EventEmitter<void>();

  // Local state for two-way binding
  localSmartMode = true;
  localDisplayDuration = 10;
  localContentType: ContentType = 'prayers';
  localRandomize = false;
  localTimeFilter: TimeFilter = 'month';
  localPrayerTimerMinutes = 10;
  
  showSmartModeDetails = false;
  showStatusDropdown = false;
  pendingStatusFilter: string[] = [];

  ngOnInit() {
    this.syncLocalState();
    this.initPendingStatusFilter();
  }

  ngOnChanges() {
    this.syncLocalState();
    this.initPendingStatusFilter();
  }

  syncLocalState() {
    this.localSmartMode = this.smartMode;
    this.localDisplayDuration = this.displayDuration;
    this.localContentType = this.contentType;
    this.localRandomize = this.randomize;
    this.localTimeFilter = this.timeFilter;
    this.localPrayerTimerMinutes = this.prayerTimerMinutes;
  }

  initPendingStatusFilter() {
    const filters: string[] = [];
    if (this.statusFiltersCurrent) filters.push('current');
    if (this.statusFiltersAnswered) filters.push('answered');
    this.pendingStatusFilter = filters;
  }

  setDuration(seconds: number) {
    this.localDisplayDuration = seconds;
    this.displayDurationChange.emit(seconds);
  }

  toggleStatusDropdown() {
    if (this.showStatusDropdown) {
      this.applyStatusFilter();
    } else {
      this.initPendingStatusFilter();
    }
    this.showStatusDropdown = !this.showStatusDropdown;
  }

  togglePendingStatus(status: string) {
    const index = this.pendingStatusFilter.indexOf(status);
    if (index > -1) {
      this.pendingStatusFilter = this.pendingStatusFilter.filter(s => s !== status);
    } else {
      this.pendingStatusFilter = [...this.pendingStatusFilter, status];
    }
  }

  clearPendingStatus() {
    this.pendingStatusFilter = [];
  }

  isPendingStatusSelected(status: string): boolean {
    return this.pendingStatusFilter.includes(status);
  }

  applyStatusFilter() {
    const current = this.pendingStatusFilter.includes('current');
    const answered = this.pendingStatusFilter.includes('answered');
    this.statusFiltersChange.emit({ current, answered });
    this.showStatusDropdown = false;
  }

  getStatusFilterDisplay(): string {
    const filters: string[] = [];
    if (this.statusFiltersCurrent) filters.push('Current');
    if (this.statusFiltersAnswered) filters.push('Answered');
    
    if (filters.length === 0) return 'All Statuses';
    return filters.join(', ');
  }
}
