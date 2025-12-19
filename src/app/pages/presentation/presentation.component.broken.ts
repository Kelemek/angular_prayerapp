import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../services/supabase.service';
import { ThemeService } from '../../services/theme.service';
import { Subject, takeUntil } from 'rxjs';

interface Prayer {
  id: string;
  title: string;
  prayer_for: string;
  description: string;
  requester: string;
  status: string;
  created_at: string;
  prayer_updates?: Array<{
    id: string;
    content: string;
    author: string;
    created_at: string;
  }>;
}

interface PrayerPrompt {
  id: string;
  title: string;
  type: string;
  description: string;
  created_at: string;
}

type ContentType = 'prayers' | 'prompts' | 'both';
type ThemeOption = 'light' | 'dark' | 'system';
type TimeFilter = 'week' | 'month' | 'year' | 'all';

import { PresentationToolbarComponent } from '../../components/presentation-toolbar/presentation-toolbar.component';
import { PrayerDisplayCardComponent } from '../../components/prayer-display-card/prayer-display-card.component';
import { PresentationSettingsModalComponent } from '../../components/presentation-settings-modal/presentation-settings-modal.component';

@Component({
  selector: 'app-presentation',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    PresentationToolbarComponent,
    PrayerDisplayCardComponent,
    PresentationSettingsModalComponent
  ],
  template: `
    <div class="w-full min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white relative">
      <!-- Loading State -->
      <div *ngIf="loading" class="w-full min-h-screen flex items-center justify-center">
        <div class="flex flex-col items-center gap-4">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <div class="text-gray-900 dark:text-white text-xl">
            Loading {{ contentType === 'prayers' ? 'prayers' : contentType === 'prompts' ? 'prompts' : 'prayers and prompts' }}...
          </div>
        </div>
      </div>

      <!-- Main Content Display -->
      <div *ngIf="!loading && items.length > 0" 
        [class]="'h-screen flex flex-col justify-center px-6 py-6 transition-all duration-300 relative z-0 ' + (showControls ? 'pb-28' : 'pb-6')">
        <div class="w-full max-w-6xl mx-auto h-full">
          <div class="h-full overflow-y-auto flex items-center px-2">
            <app-prayer-display-card
              [prayer]="isPrayer(currentItem) ? currentItem : undefined"
              [prompt]="isPrompt(currentItem) ? currentItem : undefined">
            </app-prayer-display-card>
          </div>
        </div>
      </div>
            <div class="flex items-start gap-2">
              <svg class="flex-shrink-0 mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <div class="flex-1">
                <p class="font-medium mb-1">Swipe to navigate • Double-tap to hide controls</p>
              </div>
              <button (click)="showControlsHint = false" class="text-white/80 hover:text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

      <!-- No Content Message -->
            <!-- Prayer Display -->
            <div *ngIf="isPrayer(currentItem)" class="space-y-4 sm:space-y-6">
              <div class="text-center mb-4 sm:mb-6">
                <span class="inline-block px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium"
                  [ngClass]="{
                    'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200': currentItem.status === 'current',
                    'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200': currentItem.status === 'answered'
                  }">
                  {{ currentItem.status === 'current' ? 'Current Prayer Request' : 'Answered Prayer' }}
                </span>
              </div>

              <div class="space-y-3 sm:space-y-4">
                <h2 class="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-gray-100 text-center leading-tight">
                  {{ currentItem.prayer_for }}
                </h2>
                
                <p class="text-base sm:text-lg lg:text-xl text-gray-700 dark:text-gray-300 text-center leading-relaxed whitespace-pre-wrap">
                  {{ currentItem.description }}
                </p>

                <div class="flex flex-wrap justify-center gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  <span>Requested by {{ currentItem.requester }}</span>
                  <span>•</span>
                  <span>{{ formatDate(currentItem.created_at) }}</span>
                </div>
              </div>

              <!-- Prayer Updates -->
              <div *ngIf="currentItem.prayer_updates && currentItem.prayer_updates.length > 0" 
                class="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t-2 border-gray-200 dark:border-gray-700">
                <h3 class="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4 text-center">
                  Recent Updates ({{ currentItem.prayer_updates.length }})
                </h3>
                <div class="space-y-3 sm:space-y-4">
                  <div *ngFor="let update of getRecentUpdates(currentItem.prayer_updates)" 
                    class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 sm:p-4 border border-blue-100 dark:border-blue-800">
                    <p class="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-2 whitespace-pre-wrap">
                      {{ update.content }}
                    </p>
                    <div class="flex justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      <span>{{ update.author }}</span>
                      <span>{{ formatDate(update.created_at) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Prompt Display -->
            <div *ngIf="isPrompt(currentItem)" class="space-y-4 sm:space-y-6">
              <div class="text-center mb-4 sm:mb-6">
                <span class="inline-block px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200">
                  {{ currentItem.type }}
                </span>
              </div>

              <h2 class="text-2xl sm:text-3xl lg:text-5xl font-bold text-gray-900 dark:text-gray-100 text-center leading-tight">
                {{ currentItem.title }}
              </h2>

              <p *ngIf="currentItem.description" class="text-base sm:text-lg lg:text-xl text-gray-700 dark:text-gray-300 text-center leading-relaxed mt-4 sm:mt-6">
                {{ currentItem.description }}
              </p>
            </div>
          </div>

          <!-- Progress Indicator -->
          <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/90 dark:bg-gray-800/90 px-3 py-2 rounded-full shadow-lg backdrop-blur-sm"
            [class.mb-28]="isMobile && showControls">
            <span class="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
              {{ currentIndex + 1 }} / {{ items.length }}
            </span>
            <span *ngIf="isPlaying" class="text-xs text-gray-500 dark:text-gray-400">
              • {{ countdownRemaining }}s
            </span>
          </div>
        </div>

        <!-- Desktop Controls (Right Side) -->
        <div *ngIf="!isMobile" class="w-80 bg-gray-50 dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
          <!-- Controls Header -->
          <div class="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Controls</h3>
            <button
              (click)="exitPresentation()"
              class="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Exit Presentation">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-4 space-y-4">
            <!-- Playback Controls -->
            <div class="space-y-3">
              <div class="flex gap-2">
                <button
                  (click)="togglePlay()"
                  class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg transition-colors font-medium"
                  [ngClass]="{
                    'bg-green-600 hover:bg-green-700 text-white': isPlaying,
                    'bg-blue-600 hover:bg-blue-700 text-white': !isPlaying
                  }">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <rect *ngIf="isPlaying" x="6" y="4" width="4" height="16"></rect>
                    <rect *ngIf="isPlaying" x="14" y="4" width="4" height="16"></rect>
                    <path *ngIf="!isPlaying" d="M8 5v14l11-7z"></path>
                  </svg>
                  {{ isPlaying ? 'Pause' : 'Play' }}
                </button>
              </div>

              <div class="flex gap-2">
                <button
                  (click)="previousSlide()"
                  [disabled]="items.length === 0"
                  class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                  Previous
                </button>
                <button
                  (click)="nextSlide()"
                  [disabled]="items.length === 0"
                  class="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                  Next
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </button>
              </div>
            </div>

            <!-- Settings Toggle -->
            <button
              (click)="showSettings = !showSettings"
              class="w-full flex items-center justify-between px-4 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
              <span class="flex items-center gap-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m-2 2l-4.2 4.2M23 12h-6m-6 0H1m18.2-5.2l-4.2 4.2m-2 2l-4.2 4.2"></path>
                </svg>
                <span class="font-medium">Settings</span>
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" 
                [class.rotate-180]="showSettings" class="transition-transform">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            <!-- Settings Panel -->
            <div *ngIf="showSettings" class="space-y-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
              <!-- Content Type Selection -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Content Type</label>
                <div class="space-y-2">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="contentType" value="prayers" [(ngModel)]="contentType" (change)="handleContentTypeChange()" class="text-blue-600">
                    <span class="text-sm text-gray-700 dark:text-gray-300">Prayers Only</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="contentType" value="prompts" [(ngModel)]="contentType" (change)="handleContentTypeChange()" class="text-blue-600">
                    <span class="text-sm text-gray-700 dark:text-gray-300">Prompts Only</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="contentType" value="both" [(ngModel)]="contentType" (change)="handleContentTypeChange()" class="text-blue-600">
                    <span class="text-sm text-gray-700 dark:text-gray-300">Both (Mixed)</span>
                  </label>
                </div>
              </div>

              <!-- Prayer Status Filter (only show for prayers) -->
              <div *ngIf="contentType === 'prayers' || contentType === 'both'">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Prayer Status</label>
                <div class="space-y-2">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" [(ngModel)]="statusFilters.current" (change)="handleStatusFilterChange()" class="text-blue-600 rounded">
                    <span class="text-sm text-gray-700 dark:text-gray-300">Current Requests</span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" [(ngModel)]="statusFilters.answered" (change)="handleStatusFilterChange()" class="text-blue-600 rounded">
                    <span class="text-sm text-gray-700 dark:text-gray-300">Answered Prayers</span>
                  </label>
                </div>
              </div>

              <!-- Time Filter -->
              <div *ngIf="contentType === 'prayers' || contentType === 'both'">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Time Range</label>
                <select [(ngModel)]="timeFilter" (change)="handleTimeFilterChange()" 
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm">
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                  <option value="year">Last Year</option>
                  <option value="all">All Time</option>
                </select>
              </div>

              <!-- Display Duration -->
              <div>
                <div class="flex items-center justify-between mb-2">
                  <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Display Duration
                  </label>
                  <span class="text-sm text-gray-600 dark:text-gray-400">{{ displayDuration }}s</span>
                </div>
                <input type="range" min="5" max="60" step="5" [(ngModel)]="displayDuration" 
                  class="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600">
              </div>

              <!-- Smart Mode -->
              <label class="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" [(ngModel)]="smartMode" class="mt-1 text-blue-600 rounded">
                <div>
                  <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Smart Duration</span>
                  <p class="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    Auto-adjust display time based on content length
                  </p>
                </div>
              </label>

              <!-- Randomize -->
              <label class="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" [(ngModel)]="randomize" (change)="handleRandomizeChange()" class="mt-1 text-blue-600 rounded">
                <div>
                  <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Randomize Order</span>
                  <p class="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    Shuffle content in random order
                  </p>
                </div>
              </label>

              <!-- Theme Selection -->
              <div>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Theme</label>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    (click)="handleThemeChange('light')"
                    class="flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all text-xs"
                    [ngClass]="{
                      'border-blue-500 bg-blue-50 dark:bg-blue-900/20': theme === 'light',
                      'border-gray-200 dark:border-gray-700 hover:border-blue-300': theme !== 'light'
                    }">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-amber-600">
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
                    <span class="font-medium text-gray-700 dark:text-gray-300">Light</span>
                  </button>
                  <button
                    (click)="handleThemeChange('dark')"
                    class="flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all text-xs"
                    [ngClass]="{
                      'border-blue-500 bg-blue-50 dark:bg-blue-900/20': theme === 'dark',
                      'border-gray-200 dark:border-gray-700 hover:border-blue-300': theme !== 'dark'
                    }">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-blue-600">
                      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    </svg>
                    <span class="font-medium text-gray-700 dark:text-gray-300">Dark</span>
                  </button>
                  <button
                    (click)="handleThemeChange('system')"
                    class="flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all text-xs"
                    [ngClass]="{
                      'border-blue-500 bg-blue-50 dark:bg-blue-900/20': theme === 'system',
                      'border-gray-200 dark:border-gray-700 hover:border-blue-300': theme !== 'system'
                    }">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-gray-600">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                      <line x1="8" y1="21" x2="16" y2="21"></line>
                      <line x1="12" y1="17" x2="12" y2="21"></line>
                    </svg>
                    <span class="font-medium text-gray-700 dark:text-gray-300">System</span>
                  </button>
                </div>
              </div>

              <!-- Prayer Timer -->
              <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div class="flex items-center justify-between mb-3">
                  <label class="text-sm font-medium text-gray-700 dark:text-gray-300">Prayer Timer</label>
                  <button
                    (click)="togglePrayerTimer()"
                    class="px-3 py-1 text-xs font-medium rounded-lg transition-colors"
                    [ngClass]="{
                      'bg-green-600 hover:bg-green-700 text-white': prayerTimerActive,
                      'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300': !prayerTimerActive
                    }">
                    {{ prayerTimerActive ? 'Stop' : 'Start' }}
                  </button>
                </div>
                <div class="flex items-center gap-2 mb-2">
                  <input type="number" min="1" max="60" [(ngModel)]="prayerTimerMinutes" [disabled]="prayerTimerActive"
                    class="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm disabled:opacity-50">
                  <span class="text-sm text-gray-600 dark:text-gray-400">minutes</span>
                </div>
                <div *ngIf="prayerTimerActive" class="text-center">
                  <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {{ formatTime(prayerTimerRemaining) }}
                  </div>
                  <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">Time Remaining</p>
                </div>
              </div>

              <!-- Refresh Button -->
              <button
                (click)="refreshContent()"
                [disabled]="loading"
                class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" [class.animate-spin]="loading">
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                Refresh Content
              </button>
            </div>
          </div>
        </div>

        <!-- Mobile Controls (Bottom Sheet) -->
        <div *ngIf="isMobile && showControls" 
          class="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-2xl safe-area-inset-bottom">
          <div class="p-4 space-y-3">
            <!-- Main Controls Row -->
            <div class="flex gap-2">
              <button
                (click)="previousSlide()"
                [disabled]="items.length === 0"
                class="flex items-center justify-center w-12 h-12 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
              
              <button
                (click)="togglePlay()"
                class="flex-1 flex items-center justify-center gap-2 h-12 rounded-lg transition-colors font-medium"
                [ngClass]="{
                  'bg-green-600 hover:bg-green-700 text-white': isPlaying,
                  'bg-blue-600 hover:bg-blue-700 text-white': !isPlaying
                }">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <rect *ngIf="isPlaying" x="6" y="4" width="4" height="16"></rect>
                  <rect *ngIf="isPlaying" x="14" y="4" width="4" height="16"></rect>
                  <path *ngIf="!isPlaying" d="M8 5v14l11-7z"></path>
                </svg>
                {{ isPlaying ? 'Pause' : 'Play' }}
              </button>
              
              <button
                (click)="nextSlide()"
                [disabled]="items.length === 0"
                class="flex items-center justify-center w-12 h-12 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
              
              <button
                (click)="showSettings = !showSettings"
                class="flex items-center justify-center w-12 h-12 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M12 1v6m0 6v6m5.2-13.2l-4.2 4.2m-2 2l-4.2 4.2M23 12h-6m-6 0H1m18.2-5.2l-4.2 4.2m-2 2l-4.2 4.2"></path>
                </svg>
              </button>
              
              <button
                (click)="exitPresentation()"
                class="flex items-center justify-center w-12 h-12 bg-red-600 hover:bg-red-700 text-white rounded-lg">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <!-- Mobile Settings (Collapsible) -->
            <div *ngIf="showSettings" class="pt-3 border-t border-gray-200 dark:border-gray-700 max-h-96 overflow-y-auto space-y-3">
              <div class="grid grid-cols-3 gap-2 text-xs">
                <button (click)="contentType = 'prayers'; handleContentTypeChange()"
                  class="px-2 py-2 rounded-lg font-medium transition-colors"
                  [ngClass]="{
                    'bg-blue-600 text-white': contentType === 'prayers',
                    'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300': contentType !== 'prayers'
                  }">
                  Prayers
                </button>
                <button (click)="contentType = 'prompts'; handleContentTypeChange()"
                  class="px-2 py-2 rounded-lg font-medium transition-colors"
                  [ngClass]="{
                    'bg-blue-600 text-white': contentType === 'prompts',
                    'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300': contentType !== 'prompts'
                  }">
                  Prompts
                </button>
                <button (click)="contentType = 'both'; handleContentTypeChange()"
                  class="px-2 py-2 rounded-lg font-medium transition-colors"
                  [ngClass]="{
                    'bg-blue-600 text-white': contentType === 'both',
                    'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300': contentType !== 'both'
                  }">
                  Both
                </button>
              </div>

              <div class="flex items-center justify-between text-sm">
                <span class="text-gray-700 dark:text-gray-300">Duration: {{ displayDuration }}s</span>
                <input type="range" min="5" max="60" step="5" [(ngModel)]="displayDuration" class="flex-1 mx-3 accent-blue-600">
              </div>

              <div class="flex gap-2">
                <label class="flex-1 flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                  <input type="checkbox" [(ngModel)]="smartMode" class="text-blue-600 rounded">
                  Smart Duration
                </label>
                <label class="flex-1 flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                  <input type="checkbox" [(ngModel)]="randomize" (change)="handleRandomizeChange()" class="text-blue-600 rounded">
                  Randomize
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- No Content Message -->
      <div *ngIf="!loading && items.length === 0" class="absolute inset-0 flex items-center justify-center">
        <div class="text-center p-8">
          <div class="text-6xl mb-4">🙏</div>
          <h2 class="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No Content Available</h2>
          <p class="text-gray-600 dark:text-gray-400 mb-6">
            {{ contentType === 'prayers' ? 'No prayers match your current filters' : 
               contentType === 'prompts' ? 'No prayer prompts available' : 
               'No content available' }}
          </p>
          <button
            (click)="exitPresentation()"
            class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            Return to Home
          </button>
        </div>
      </div>

      <!-- Prayer Timer Notification -->
      <div *ngIf="showTimerNotification" 
        class="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md text-center z-50 animate-fade-in">
        <div class="text-6xl mb-4">🔔</div>
        <h3 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Prayer Time Complete</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-6">Your {{ prayerTimerMinutes }} minute prayer session has ended.</p>
        <button
          (click)="showTimerNotification = false"
          class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
          Close
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .animate-fade-in {
      animation: fade-in 0.3s ease-out;
    }
    
    .safe-area-inset-bottom {
      padding-bottom: env(safe-area-inset-bottom);
    }
  `]
})
export class PresentationComponent implements OnInit, OnDestroy {
  prayers: Prayer[] = [];
  prompts: PrayerPrompt[] = [];
  currentIndex = 0;
  isPlaying = false;
  displayDuration = 10;
  smartMode = true;
  showSettings = false;
  loading = true;
  showControls = true;
  contentType: ContentType = 'prayers';
  statusFilters = { current: true, answered: true };
  timeFilter: TimeFilter = 'month';
  theme: ThemeOption = 'system';
  randomize = false;
  countdownRemaining = 0;
  currentDuration = 10;
  
  prayerTimerMinutes = 10;
  prayerTimerActive = false;
  prayerTimerRemaining = 0;
  showTimerNotification = false;
  
  isMobile = false;
  showControlsHint = true;
  touchStart: number | null = null;
  touchEnd: number | null = null;
  lastTap = 0;
  
  private destroy$ = new Subject<void>();
  private autoAdvanceInterval: any;
  private countdownInterval: any;
  private prayerTimerInterval: any;

  constructor(
    private router: Router,
    private supabase: SupabaseService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.checkMobile();
    this.loadTheme();
    this.loadContent();
    
    // Hide controls hint after 5 seconds
    setTimeout(() => {
      this.showControlsHint = false;
    }, 5000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearIntervals();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.checkMobile();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    if (this.isMobile) return;
    
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        this.previousSlide();
        break;
      case 'ArrowRight':
      case ' ':
        event.preventDefault();
        this.nextSlide();
        break;
      case 'Escape':
        event.preventDefault();
        this.exitPresentation();
        break;
      case 'p':
      case 'P':
        event.preventDefault();
        this.togglePlay();
        break;
    }
  }

  checkMobile(): void {
    this.isMobile = window.innerWidth < 640;
  }

  loadTheme(): void {
    const savedTheme = localStorage.getItem('theme') as ThemeOption;
    if (savedTheme) {
      this.theme = savedTheme;
    }
    this.applyTheme();
  }

  applyTheme(): void {
    const root = document.documentElement;
    let effectiveTheme: 'light' | 'dark';
    
    if (this.theme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      effectiveTheme = systemPrefersDark ? 'dark' : 'light';
    } else {
      effectiveTheme = this.theme;
    }
    
    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }

  async loadContent(): Promise<void> {
    this.loading = true;
    
    try {
      if (this.contentType === 'prayers') {
        await this.fetchPrayers();
      } else if (this.contentType === 'prompts') {
        await this.fetchPrompts();
      } else {
        await Promise.all([this.fetchPrayers(), this.fetchPrompts()]);
      }
      
      if (this.randomize) {
        this.shuffleItems();
      }
    } catch (error) {
      console.error('Error loading content:', error);
    } finally {
      this.loading = false;
    }
  }

  async fetchPrayers(): Promise<void> {
    try {
      let query = this.supabase.client
        .from('prayers')
        .select(`
          *,
          prayer_updates(*)
        `)
        .eq('approval_status', 'approved');
      
      // Only filter by status when specific statuses are selected
      // When statusFilters are both false, show no prayers
      if (this.contentType === 'prayers') {
        const statuses: string[] = [];
        if (this.statusFilters.current) statuses.push('current');
        if (this.statusFilters.answered) statuses.push('answered');
        
        if (statuses.length > 0) {
          query = query.in('status', statuses);
        }
      }
      
      // Apply time filter only when viewing prayers alone
      if (this.contentType === 'prayers' && this.timeFilter !== 'all') {
        const now = new Date();
        const startDate = new Date();
        
        switch (this.timeFilter) {
          case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
          case 'year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        }
        
        query = query.gte('created_at', startDate.toISOString());
      }
      
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Filter to only include approved updates
      const prayersWithApprovedUpdates = (data || []).map(prayer => ({
        ...prayer,
        prayer_updates: (prayer.prayer_updates || []).filter((update: any) => 
          update.approval_status === 'approved'
        )
      }));
      
      this.prayers = prayersWithApprovedUpdates;
    } catch (error) {
      console.error('Error fetching prayers:', error);
      this.prayers = [];
    }
  }

  async fetchPrompts(): Promise<void> {
    try {
      const { data: typesData, error: typesError } = await this.supabase.client
        .from('prayer_types')
        .select('name, display_order')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (typesError) throw typesError;

      const activeTypeNames = new Set((typesData || []).map((t: any) => t.name));
      const typeOrderMap = new Map(typesData?.map((t: any) => [t.name, t.display_order]) || []);

      const { data, error } = await this.supabase.client
        .from('prayer_prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.prompts = (data || [])
        .filter((p: any) => activeTypeNames.has(p.type))
        .sort((a: any, b: any) => {
          const orderA = typeOrderMap.get(a.type) ?? 999;
          const orderB = typeOrderMap.get(b.type) ?? 999;
          return orderA - orderB;
        });
    } catch (error) {
      console.error('Error fetching prompts:', error);
      this.prompts = [];
    }
  }

  get items(): any[] {
    if (this.contentType === 'prayers') return this.prayers;
    if (this.contentType === 'prompts') return this.prompts;
    return [...this.prayers, ...this.prompts];
  }

  get currentItem(): any {
    return this.items[this.currentIndex];
  }

  isPrayer(item: any): item is Prayer {
    return item && 'prayer_for' in item;
  }

  isPrompt(item: any): item is PrayerPrompt {
    return item && 'type' in item && !('prayer_for' in item);
  }

  togglePlay(): void {
    this.isPlaying = !this.isPlaying;
    
    if (this.isPlaying) {
      this.startAutoAdvance();
    } else {
      this.clearIntervals();
    }
  }

  startAutoAdvance(): void {
    this.clearIntervals();
    
    const duration = this.calculateCurrentDuration();
    this.currentDuration = duration;
    this.countdownRemaining = duration;
    
    this.autoAdvanceInterval = setTimeout(() => {
      this.nextSlide();
      if (this.isPlaying) {
        this.startAutoAdvance();
      }
    }, duration * 1000);
    
    this.countdownInterval = setInterval(() => {
      if (this.countdownRemaining > 0) {
        this.countdownRemaining--;
      }
    }, 1000);
  }

  calculateCurrentDuration(): number {
    if (!this.smartMode) return this.displayDuration;
    
    const item = this.currentItem;
    if (!item) return this.displayDuration;
    
    if (this.isPrayer(item)) {
      let totalChars = (item.description?.length || 0);
      
      if (item.prayer_updates && item.prayer_updates.length > 0) {
        const recentUpdates = item.prayer_updates
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 3);
        
        recentUpdates.forEach(update => {
          totalChars += (update.content?.length || 0);
        });
      }
      
      return Math.max(10, Math.min(120, Math.ceil(totalChars / 12)));
    } else {
      const totalChars = (item.description?.length || 0);
      return Math.max(10, Math.min(120, Math.ceil(totalChars / 12)));
    }
  }

  clearIntervals(): void {
    if (this.autoAdvanceInterval) {
      clearTimeout(this.autoAdvanceInterval);
      this.autoAdvanceInterval = null;
    }
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  nextSlide(): void {
    if (this.items.length === 0) return;
    this.currentIndex = (this.currentIndex + 1) % this.items.length;
    
    if (this.isPlaying) {
      this.startAutoAdvance();
    }
  }

  previousSlide(): void {
    if (this.items.length === 0) return;
    this.currentIndex = this.currentIndex === 0 ? this.items.length - 1 : this.currentIndex - 1;
    
    if (this.isPlaying) {
      this.startAutoAdvance();
    }
  }

  async refreshContent(): Promise<void> {
    await this.loadContent();
    this.currentIndex = 0;
  }

  handleContentTypeChange(): void {
    this.currentIndex = 0;
    this.loadContent();
  }

  handleStatusFilterChange(): void {
    this.currentIndex = 0;
    this.fetchPrayers();
  }

  handleTimeFilterChange(): void {
    this.currentIndex = 0;
    this.fetchPrayers();
  }

  handleRandomizeChange(): void {
    if (this.randomize) {
      this.shuffleItems();
    } else {
      this.loadContent();
    }
    this.currentIndex = 0;
  }

  shuffleItems(): void {
    if (this.contentType === 'prayers') {
      this.prayers = this.shuffleArray([...this.prayers]);
    } else if (this.contentType === 'prompts') {
      this.prompts = this.shuffleArray([...this.prompts]);
    } else {
      this.prayers = this.shuffleArray([...this.prayers]);
      this.prompts = this.shuffleArray([...this.prompts]);
    }
  }

  shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  handleThemeChange(newTheme: ThemeOption): void {
    this.theme = newTheme;
    localStorage.setItem('theme', newTheme);
    this.applyTheme();
  }

  togglePrayerTimer(): void {
    if (this.prayerTimerActive) {
      this.stopPrayerTimer();
    } else {
      this.startPrayerTimer();
    }
  }

  startPrayerTimer(): void {
    this.prayerTimerActive = true;
    this.prayerTimerRemaining = this.prayerTimerMinutes * 60;
    
    if (this.prayerTimerInterval) {
      clearInterval(this.prayerTimerInterval);
    }
    
    this.prayerTimerInterval = setInterval(() => {
      if (this.prayerTimerRemaining > 0) {
        this.prayerTimerRemaining--;
      } else {
        this.stopPrayerTimer();
        this.showTimerNotification = true;
        
        // Auto-hide notification after 10 seconds
        setTimeout(() => {
          this.showTimerNotification = false;
        }, 10000);
      }
    }, 1000);
  }

  stopPrayerTimer(): void {
    this.prayerTimerActive = false;
    if (this.prayerTimerInterval) {
      clearInterval(this.prayerTimerInterval);
      this.prayerTimerInterval = null;
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  getRecentUpdates(updates: any[]): any[] {
    return updates
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3);
  }

  exitPresentation(): void {
    window.location.hash = '';
    this.router.navigate(['/']);
  }

  // Mobile Touch Handlers
  handleTouchStart(event: TouchEvent): void {
    if (!this.isMobile) return;
    this.touchStart = event.touches[0].clientX;
    this.touchEnd = null;
  }

  handleTouchMove(event: TouchEvent): void {
    if (!this.isMobile) return;
    this.touchEnd = event.touches[0].clientX;
  }

  handleTouchEnd(): void {
    if (!this.isMobile || !this.touchStart || !this.touchEnd) return;
    
    const distance = this.touchStart - this.touchEnd;
    const minSwipeDistance = 50;
    
    if (Math.abs(distance) > minSwipeDistance) {
      if (distance > 0) {
        this.nextSlide();
      } else {
        this.previousSlide();
      }
    }
    
    this.touchStart = null;
    this.touchEnd = null;
  }

  handleContentClick(event: MouseEvent): void {
    if (!this.isMobile) return;
    
    const now = Date.now();
    const timeSinceLastTap = now - this.lastTap;
    
    if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
      // Double tap detected
      this.showControls = !this.showControls;
      this.lastTap = 0;
    } else {
      this.lastTap = now;
    }
  }
}
