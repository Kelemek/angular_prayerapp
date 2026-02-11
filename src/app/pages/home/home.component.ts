import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ChangeDetectorRef } from '@angular/core';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { PrayerFormComponent } from '../../components/prayer-form/prayer-form.component';
import { PrayerFiltersComponent, PrayerFilters } from '../../components/prayer-filters/prayer-filters.component';
import { SkeletonLoaderComponent } from '../../components/skeleton-loader/skeleton-loader.component';
import { AppLogoComponent } from '../../components/app-logo/app-logo.component';
import { PrayerCardComponent } from '../../components/prayer-card/prayer-card.component';
import { PromptCardComponent, PrayerPrompt } from '../../components/prompt-card/prompt-card.component';
import { UserSettingsComponent } from '../../components/user-settings/user-settings.component';
import { VerificationDialogComponent } from '../../components/verification-dialog/verification-dialog.component';
import { HelpModalComponent } from '../../components/help-modal/help-modal.component';
import { PersonalPrayerEditModalComponent } from '../../components/personal-prayer-edit-modal/personal-prayer-edit-modal.component';
import { PersonalPrayerUpdateEditModalComponent } from '../../components/personal-prayer-update-edit-modal/personal-prayer-update-edit-modal.component';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog.component';
import { PrayerService, PrayerRequest, PrayerUpdate } from '../../services/prayer.service';
import { PromptService } from '../../services/prompt.service';
import { CacheService } from '../../services/cache.service';
import { AdminAuthService } from '../../services/admin-auth.service';
import { UserSessionService } from '../../services/user-session.service';
import { SupabaseService } from '../../services/supabase.service';
import { BadgeService } from '../../services/badge.service';
import { Observable, take, Subject, takeUntil, filter } from 'rxjs';
import { ToastService } from '../../services/toast.service';
import { AnalyticsService } from '../../services/analytics.service';
import type { User } from '@supabase/supabase-js';
import { fetchListMembers } from '../../../lib/planning-center';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, DragDropModule, PrayerFormComponent, PrayerFiltersComponent, SkeletonLoaderComponent, AppLogoComponent, PrayerCardComponent, PromptCardComponent, UserSettingsComponent, HelpModalComponent, PersonalPrayerEditModalComponent, PersonalPrayerUpdateEditModalComponent, ConfirmationDialogComponent],
  template: `
    <div class="w-full min-h-screen bg-gray-50 dark:bg-gray-900">
      <!-- Header -->
      <header class="w-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div class="w-full max-w-6xl mx-auto px-4 py-4 sm:py-6">
          <!-- Mobile layout: indicator in top row with logo -->
          <div class="sm:hidden flex items-start justify-between mb-3">
            <!-- Logo on left -->
            <div class="flex items-center gap-3">
              <app-logo (logoStatusChange)="hasLogo = $event"></app-logo>
            </div>
            
            <!-- Email Indicator - Top Right -->
            @if ((userSessionService.userSession$ | async); as session) {
              <button
                (click)="showLogoutConfirmation = true"
                class="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 px-2 py-1 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/40 transition-colors cursor-pointer"
                title="Click to log out"
              >
                {{ session.email }}
              </button>
            } @else {
              <button
                (click)="showLogoutConfirmation = true"
                class="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 px-2 py-1 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/40 transition-colors cursor-pointer"
                title="Click to log out"
              >
                {{ getUserEmail() }}
              </button>
            }
          </div>
          
          <!-- Mobile buttons row -->
          <div class="sm:hidden flex items-center gap-2 flex-wrap">
            <button
              (click)="showHelp = true"
              class="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
              title="Help"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"></circle>
                <text x="12" y="16" text-anchor="middle" fill="currentColor" font-size="14" font-weight="bold">?</text>
              </svg>
            </button>
            <button
              (click)="showSettings = true"
              class="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
              title="Settings"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
            <button
              routerLink="/presentation"
              class="flex items-center gap-1 bg-[#2F5F54] dark:bg-[#2F5F54] text-white px-3 py-2 rounded-lg hover:bg-[#1a3a2e] dark:hover:bg-[#1a3a2e] focus:outline-none focus:ring-2 focus:ring-[#2F5F54] transition-colors text-sm"
              title="Prayer Mode"
            >
              <span>Pray</span>
            </button>
            <button
              (click)="showPrayerForm = true"
              class="flex items-center gap-1 bg-blue-600 dark:bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
            >
              <span>Request</span>
            </button>
            @if (hasAdminEmail$ | async) {
              <button
                (click)="navigateToAdmin()"
                class="flex items-center gap-1 border border-red-600 dark:border-red-500 text-red-600 dark:text-red-500 px-2 py-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors text-sm"
                title="Admin Portal"
              >
                <span>Admin</span>
              </button>
            }
          </div>
          
          <!-- Desktop layout: Logo on left, controls on right -->
          <div class="hidden sm:flex items-start justify-between">
            <!-- Logo on left -->
            <div class="flex items-center gap-3">
              <app-logo (logoStatusChange)="hasLogo = $event"></app-logo>
            </div>
            
            <!-- Right side: Email and controls -->
            <div class="flex flex-col items-end gap-2">
              <!-- Top row: Admin button and Email Indicator -->
              <div class="flex items-center gap-2">
                @if (hasAdminEmail$ | async) {
                  <button
                    (click)="navigateToAdmin()"
                    class="flex items-center gap-1 border border-red-600 dark:border-red-500 text-red-600 dark:text-red-500 px-2 py-1 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors text-xs"
                    title="Admin Portal"
                  >
                  <span>Admin</span>
                  </button>
                }
                @if ((userSessionService.userSession$ | async); as session) {
                  <button
                    (click)="showLogoutConfirmation = true"
                    class="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 px-2 py-1 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/40 transition-colors cursor-pointer"
                    title="Click to log out"
                  >
                    {{ session.email }}
                  </button>
                } @else {
                  <button
                    (click)="showLogoutConfirmation = true"
                    class="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 px-2 py-1 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/40 transition-colors cursor-pointer"
                    title="Click to log out"
                  >
                    {{ getUserEmail() }}
                  </button>
                }
              </div>
              
              <!-- Controls: Desktop only -->
              <div class="flex items-center gap-2">
                <button
                  (click)="showHelp = true"
                  class="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2.5 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                  title="Help & Guidance"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"></circle>
                    <text x="12" y="16" text-anchor="middle" fill="currentColor" font-size="14" font-weight="bold">?</text>
                  </svg>
                </button>
                <button
                  (click)="showSettings = true"
                  class="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2.5 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
                  title="Settings"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
                <button
                  routerLink="/presentation"
                  class="flex items-center gap-1 bg-[#2F5F54] dark:bg-[#2F5F54] text-white px-3 py-2.5 rounded-lg hover:bg-[#1a3a2e] dark:hover:bg-[#1a3a2e] focus:outline-none focus:ring-2 focus:ring-[#2F5F54] transition-colors text-sm"
                  title="Prayer Mode"
                >
                  <span>Pray</span>
                </button>
                <button
                  (click)="showPrayerForm = true"
                  class="flex items-center gap-1 bg-blue-600 dark:bg-blue-600 text-white px-3 py-2.5 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm"
                >
                  <span>Request</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Main Content -->
      <main class="w-full flex-1 max-w-6xl mx-auto px-4 py-6">
        <!-- Prayer Form Modal -->
        <app-prayer-form
          [isOpen]="showPrayerForm"
          (close)="onPrayerFormClose($event)"
        ></app-prayer-form>

        <!-- User Settings Modal -->
        <app-user-settings
          [isOpen]="showSettings"
          (onClose)="showSettings = false"
        ></app-user-settings>

        <!-- Help Modal -->
        <app-help-modal
          [isOpen]="showHelp"
          (closeModal)="showHelp = false"
        ></app-help-modal>

        <!-- Logout Confirmation Modal -->
        @if (showLogoutConfirmation) {
          <app-confirmation-dialog
            title="Log Out?"
            message="Are you sure you want to log out?"
            confirmText="Log Out"
            cancelText="Cancel"
            [isDangerous]="false"
            (confirm)="handleLogout()"
            (cancel)="showLogoutConfirmation = false"
          ></app-confirmation-dialog>
        }

        <!-- Personal Prayer Edit Modal -->
        <app-personal-prayer-edit-modal
          [isOpen]="showEditPersonalPrayer"
          [prayer]="editingPrayer"
          (close)="showEditPersonalPrayer = false"
          (save)="onPersonalPrayerSaved()"
        ></app-personal-prayer-edit-modal>

        <!-- Personal Prayer Update Edit Modal -->
        <app-personal-prayer-update-edit-modal
          [isOpen]="showEditPersonalUpdate"
          [update]="editingUpdate"
          [prayerId]="editingUpdatePrayerId"
          (close)="showEditPersonalUpdate = false"
          (save)="onPersonalUpdateSaved()"
        ></app-personal-prayer-update-edit-modal>

        <!-- Member Prayer Update Edit Modal -->
        <app-personal-prayer-update-edit-modal
          [isOpen]="showEditMemberUpdate"
          [update]="editingMemberUpdate"
          [prayerId]="editingMemberUpdatePrayerId"
          [isMemberUpdate]="true"
          [planningCenterListId]="planningCenterListId"
          (close)="showEditMemberUpdate = false"
          (save)="onMemberUpdateSaved()"
        ></app-personal-prayer-update-edit-modal>

        <!-- Prayer Filters -->
        <app-prayer-filters
          [filters]="filters"
          (filtersChange)="onFiltersChange($event)"
        ></app-prayer-filters>

        <!-- Stats Cards -->
        <div [class]="'grid gap-4 mb-6 ' + (planningCenterListMembers.length > 0 ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-3 sm:grid-cols-5')">
          <button
            (click)="setFilter('current')"
            title="Show current prayers"
            [class]="'rounded-lg shadow-md p-2 sm:p-4 text-center transition-all duration-200 cursor-pointer relative ' + (activeFilter === 'current' ? 'border !border-[#0047AB] dark:!border-[#0047AB] bg-blue-100 dark:bg-blue-950 ring ring-[#0047AB] dark:ring-[#0047AB] ring-offset-0' : 'bg-white dark:bg-gray-800 border-[2px] !border-gray-200 dark:!border-gray-700 hover:!border-[#0047AB] dark:hover:!border-[#0047AB] hover:shadow-lg')"
          >
            @let currentCount = (currentPrayerBadge$ | async) || 0;
            @if ((currentCount > 0) && (badgeService.getBadgeFunctionalityEnabled$() | async)) {
              <button
                (click)="$event.stopPropagation(); markAllCurrentAsRead()"
                class="absolute -top-2 -right-2 inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-[#39704D] dark:bg-[#39704D] text-white rounded-full text-xs font-bold hover:bg-[#2d5a3f] dark:hover:bg-[#2d5a3f] focus:outline-none focus:ring-2 focus:ring-[#39704D] focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
                title="Mark all current prayers as read"
                aria-label="Mark all current prayers as read"
              >
                {{ currentCount }}
              </button>
            }
            <div class="text-sm sm:text-xl sm:sm:text-2xl font-bold text-gray-700 dark:text-gray-300 tabular-nums">
              {{ currentPrayersCount }}
            </div>
            <div class="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Current</div>
          </button>
          <button
            (click)="setFilter('answered')"
            title="Show answered prayers"
            [class]="'rounded-lg shadow-md p-2 sm:p-4 text-center transition-all duration-200 cursor-pointer relative ' + (activeFilter === 'answered' ? 'border !border-[#39704D] dark:!border-[#39704D] bg-green-100 dark:bg-green-950 ring ring-[#39704D] dark:ring-[#39704D] ring-offset-0' : 'bg-white dark:bg-gray-800 border-[2px] !border-gray-200 dark:!border-gray-700 hover:!border-[#39704D] dark:hover:!border-[#39704D] hover:shadow-lg')"
          >
            @let answeredCount = (answeredPrayerBadge$ | async) || 0;
            @if ((answeredCount > 0) && (badgeService.getBadgeFunctionalityEnabled$() | async)) {
              <button
                (click)="$event.stopPropagation(); markAllAnsweredAsRead()"
                class="absolute -top-2 -right-2 inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-[#39704D] dark:bg-[#39704D] text-white rounded-full text-xs font-bold hover:bg-[#2d5a3f] dark:hover:bg-[#2d5a3f] focus:outline-none focus:ring-2 focus:ring-[#39704D] focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
                title="Mark all answered prayers as read"
                aria-label="Mark all answered prayers as read"
              >
                {{ answeredCount }}
              </button>
            }
            <div class="text-sm sm:text-xl sm:sm:text-2xl font-bold text-gray-700 dark:text-gray-300 tabular-nums">
              {{ answeredPrayersCount }}
            </div>
            <div class="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Answered</div>
          </button>
          <button
            (click)="setFilter('total')"
            title="Show all prayers"
            [class]="'rounded-lg shadow-md p-2 sm:p-4 text-center transition-all duration-200 cursor-pointer relative ' + (activeFilter === 'total' ? 'border !border-[#C9A961] dark:!border-[#C9A961] bg-amber-100 dark:bg-amber-900/40 ring ring-[#C9A961] dark:ring-[#C9A961] ring-offset-0' : 'bg-white dark:bg-gray-800 border-[2px] !border-gray-200 dark:!border-gray-700 hover:!border-[#C9A961] dark:hover:!border-[#C9A961] hover:shadow-lg')"
          >
            <div class="text-sm sm:text-xl sm:sm:text-2xl font-bold text-gray-700 dark:text-gray-300 tabular-nums">
              {{ totalPrayersCount }}
            </div>
            <div class="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Total</div>
          </button>
          <button
            (click)="setFilter('prompts')"
            title="Show prayer prompts"
            [class]="'rounded-lg shadow-md p-2 sm:p-4 text-center transition-all duration-200 cursor-pointer relative ' + (activeFilter === 'prompts' ? 'border !border-[#988F83] dark:!border-[#988F83] bg-stone-100 dark:bg-stone-900/40 ring ring-[#988F83] dark:ring-[#988F83] ring-offset-0' : 'bg-white dark:bg-gray-800 border-[2px] !border-gray-200 dark:!border-gray-700 hover:!border-[#988F83] dark:hover:!border-[#988F83] hover:shadow-lg')"
          >
            @let promptCount = (promptBadge$ | async) || 0;
            @if ((promptCount > 0) && (badgeService.getBadgeFunctionalityEnabled$() | async)) {
              <button
                (click)="$event.stopPropagation(); markAllPromptsAsRead()"
                class="absolute -top-2 -right-2 inline-flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 bg-[#39704D] dark:bg-[#39704D] text-white rounded-full text-xs font-bold hover:bg-[#2d5a3f] dark:hover:bg-[#2d5a3f] focus:outline-none focus:ring-2 focus:ring-[#39704D] focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-colors"
                title="Mark all prompts as read"
                aria-label="Mark all prompts as read"
              >
                {{ promptCount }}
              </button>
            }
            <div class="text-sm sm:text-xl sm:sm:text-2xl font-bold text-gray-700 dark:text-gray-300 tabular-nums">
              {{ promptsCount }}
            </div>
            <div class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Prompts</div>
          </button>

          <!-- Personal Prayers Filter -->
          <button
            (click)="setFilter('personal')"
            title="Show your personal prayers"
            [class]="'rounded-lg shadow-md p-2 sm:p-4 text-center transition-all duration-200 cursor-pointer relative ' + (activeFilter === 'personal' ? 'border !border-[#2F5F54] dark:!border-[#2F5F54] bg-slate-100 dark:bg-green-900/40 ring ring-[#2F5F54] dark:ring-[#2F5F54] ring-offset-0' : 'bg-white dark:bg-gray-800 border-[2px] !border-gray-200 dark:!border-gray-700 hover:!border-[#2F5F54] dark:hover:!border-[#2F5F54] hover:shadow-lg')"
          >
            <div class="text-sm sm:text-xl sm:sm:text-2xl font-bold text-gray-700 dark:text-gray-300 tabular-nums">
              {{ personalPrayersCount }}
            </div>
            <div class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Personal</div>
          </button>

          <!-- Planning Center List Members Filter -->
          @if (planningCenterListMembers.length > 0) {
            <button
              (click)="setFilter('planning_center_list')"
              title="Show prayers for Planning Center list members"
              [class]="'rounded-lg shadow-md p-2 sm:p-4 text-center transition-all duration-200 cursor-pointer relative ' + (activeFilter === 'planning_center_list' ? 'border !border-blue-600 dark:!border-blue-400 bg-slate-100 dark:bg-blue-900/40 ring ring-blue-600 dark:ring-blue-400 ring-offset-0' : 'bg-white dark:bg-gray-800 border-[2px] !border-gray-200 dark:!border-gray-700 hover:!border-blue-600 dark:hover:!border-blue-400 hover:shadow-lg')"
            >
              <div class="text-sm sm:text-xl sm:sm:text-2xl font-bold text-gray-700 dark:text-gray-300 tabular-nums">
                {{ planningCenterListMembers.length }}
              </div>
              <div class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Members</div>
            </button>
          }
        </div>

        <!-- Loading State -->
        @if (!viewReady || (loading$ | async) || (activeFilter === 'personal' && (prayerService.loadingPersonalPrayers$ | async))) {
          <app-skeleton-loader [count]="5" type="card"></app-skeleton-loader>
        }

        <!-- Error State -->
        @if ((error$ | async); as error) {
          <div class="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg mb-6">
            {{ error }}
          </div>
        }

        <!-- Prompt Type Filters -->
        @if (activeFilter === 'prompts' && promptsCount > 0) {
          <div class="flex flex-wrap gap-2 mb-4">
            <!-- All Types Button -->
            <button
              (click)="selectedPromptTypes = []"
              [class]="'flex-1 whitespace-nowrap px-3 py-2 rounded-lg text-xs font-medium transition-all ' + (selectedPromptTypes.length === 0 ? 'bg-[#988F83] text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-[#988F83] dark:hover:border-[#988F83]')"
            >
              All Types ({{ promptsCount }})
            </button>
            
            <!-- Individual Type Buttons -->
            @for (type of getUniquePromptTypes(); track type) {
              <button
                (click)="togglePromptType(type)"
                [class]="'flex-1 whitespace-nowrap px-3 py-2 rounded-lg text-xs font-medium transition-all relative ' + (isPromptTypeSelected(type) ? 'bg-[#988F83] text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-[#988F83] dark:hover:border-[#988F83]')"
              >
                {{ type }} ({{ getPromptCountByType(type) }})
                @if ((badgeService.getBadgeFunctionalityEnabled$() | async) && getUnreadPromptCountByType(type) > 0) {
                  <span class="absolute -top-2 -right-2 inline-flex items-center justify-center w-5 h-5 bg-[#39704D] dark:bg-[#39704D] text-white rounded-full text-xs font-bold">
                    {{ getUnreadPromptCountByType(type) }}
                  </span>
                }
              </button>
            }
          </div>
        }

        <!-- Personal Category Filters -->
        @if (activeFilter === 'personal' && uniquePersonalCategories.length > 0) {
          <div cdkDropList 
               cdkDropListOrientation="mixed"
               [cdkDropListData]="uniquePersonalCategories"
               (cdkDropListDropped)="onCategoryDrop($event)"
               [cdkDropListDisabled]="isSwappingCategories"
               class="flex flex-wrap gap-2 mb-4">
            <!-- All Categories Button -->
            <button
              (click)="selectedPersonalCategories = []"
              [disabled]="isSwappingCategories"
              [class]="'flex-1 whitespace-nowrap px-3 py-2 rounded-lg text-xs font-medium transition-all ' + (selectedPersonalCategories.length === 0 ? 'bg-[#2F5F54] text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-[#2F5F54] dark:hover:border-[#2F5F54]') + (isSwappingCategories ? ' opacity-50 cursor-not-allowed' : '')"
            >
              All Categories ({{ personalPrayersCount }})
            </button>
            
            <!-- Individual Category Buttons -->
            @for (category of uniquePersonalCategories; let i = $index; track category) {
              <div cdkDrag 
                   [cdkDragData]="category" 
                   [cdkDragDisabled]="isSwappingCategories" 
                   (cdkDragStarted)="onCategoryDragStarted()"
                   (cdkDragEnded)="onCategoryDragEnded()"
                   class="flex-1 relative">
                <button
                  (click)="togglePersonalCategory(category)"
                  [disabled]="isSwappingCategories"
                  [class]="'w-full whitespace-nowrap px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-2 relative ' + (isPersonalCategorySelected(category) ? 'bg-[#2F5F54] text-white shadow-md' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-[#2F5F54] dark:hover:border-[#2F5F54]') + (isSwappingCategories ? ' opacity-50 cursor-not-allowed' : '')"
                >
                  <svg cdkDragHandle width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" [class]="'flex-shrink-0 ' + (isSwappingCategories ? 'cursor-not-allowed' : 'cursor-grab')">
                    <circle cx="9" cy="5" r="1"></circle>
                    <circle cx="9" cy="12" r="1"></circle>
                    <circle cx="9" cy="19" r="1"></circle>
                    <circle cx="15" cy="5" r="1"></circle>
                    <circle cx="15" cy="12" r="1"></circle>
                    <circle cx="15" cy="19" r="1"></circle>
                  </svg>
                  <span class="cursor-pointer">{{ category }} ({{ getPersonalCategoryCount(category) }})</span>
                  @if (isSwappingCategories) {
                    <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  }
                </button>
              </div>
            }
          </div>
        }

        <!-- Prayers or Prompts List -->
        @if (viewReady && !(loading$ | async) && !(error$ | async) && !(activeFilter === 'personal' && (prayerService.loadingPersonalPrayers$ | async))) {
          <div class="space-y-4">
            <!-- Empty State for Prayers -->
            @if (activeFilter !== 'prompts' && activeFilter !== 'personal' && activeFilter !== 'planning_center_list' && (prayers$ | async)?.length === 0) {
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
                @if (filters.searchTerm && filters.searchTerm.trim()) {
                  <svg class="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                }
                <h3 class="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                  @if (filters.searchTerm && filters.searchTerm.trim()) {
                    <span>No prayers found</span>
                  } @else {
                    @if (activeFilter === 'current') {
                      <span>No current prayer requests yet</span>
                    }
                    @if (activeFilter === 'answered') {
                      <span>No answered prayers yet</span>
                    }
                    @if (activeFilter === 'total') {
                      <span>No prayer requests yet</span>
                    }
                  }
                </h3>
                <p class="text-gray-500 dark:text-gray-400">
                  @if (filters.searchTerm && filters.searchTerm.trim()) {
                    <span>Try adjusting your search terms</span>
                  } @else {
                    <span>Be the first to add a prayer request to build your church's prayer community.</span>
                  }
                </p>
              </div>
            }

            <!-- Empty State for Personal Prayers -->
            @if (activeFilter === 'personal' && !(prayerService.loadingPersonalPrayers$ | async) && getFilteredPersonalPrayers().length === 0) {
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
                @if (filters.searchTerm && filters.searchTerm.trim()) {
                  <svg class="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                }
                <h3 class="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                  @if (filters.searchTerm && filters.searchTerm.trim()) {
                    <span>No prayers found</span>
                  } @else {
                    <span>No personal prayers yet</span>
                  }
                </h3>
                <p class="text-gray-500 dark:text-gray-400">
                  @if (filters.searchTerm && filters.searchTerm.trim()) {
                    <span>Try adjusting your search terms</span>
                  } @else {
                    <span>Click the Add Request button and choose Personal Prayer to create prayers that stays private to you.</span>
                  }
                </p>
              </div>
            }

            <!-- Empty State for Planning Center List -->
            @if (activeFilter === 'planning_center_list' && getFilteredPlanningCenterPrayers().length === 0) {
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
                @if (filters.searchTerm && filters.searchTerm.trim()) {
                  <svg class="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                }
                <h3 class="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                  @if (filters.searchTerm && filters.searchTerm.trim()) {
                    <span>No prayers found</span>
                  } @else {
                    <span>No prayers for list members</span>
                  }
                </h3>
                <p class="text-gray-500 dark:text-gray-400">
                  @if (filters.searchTerm && filters.searchTerm.trim()) {
                    <span>Try adjusting your search terms</span>
                  } @else {
                    <span>No current prayers are for the members of this Planning Center list.</span>
                  }
                </p>
              </div>
            }

            <!-- Prayer Cards (only show when not on prompts or personal filter) -->
            @if (activeFilter !== 'prompts' && activeFilter !== 'personal') {
              @if (activeFilter === 'planning_center_list') {
                @for (prayer of getFilteredPlanningCenterPrayers(); track prayer.id) {
                  <app-prayer-card
                  [prayer]="prayer"
                  [isAdmin]="(isAdmin$ | async) || false"
                  [activeFilter]="activeFilter"
                  [deletionsAllowed]="deletionsAllowed"
                  [updatesAllowed]="updatesAllowed"
                  (delete)="deletePrayer($event)"
                  (addUpdate)="addUpdate($event)"
                  (deleteUpdate)="deleteUpdate($event)"
                  (requestDeletion)="requestDeletion($event)"
                  (requestUpdateDeletion)="requestUpdateDeletion($event)"
                  (editMemberUpdate)="openEditMemberUpdateModal($event)"
                  (toggleUpdateAnswered)="toggleMemberUpdateAnswered($event)"
                ></app-prayer-card>
                }
              } @else {
                @for (prayer of prayers$ | async; track prayer.id) {
                  <app-prayer-card
                  [prayer]="prayer"
                  [isAdmin]="(isAdmin$ | async) || false"
                  [activeFilter]="activeFilter"
                  [deletionsAllowed]="deletionsAllowed"
                  [updatesAllowed]="updatesAllowed"
                  (delete)="deletePrayer($event)"
                  (addUpdate)="addUpdate($event)"
                  (deleteUpdate)="deleteUpdate($event)"
                  (requestDeletion)="requestDeletion($event)"
                  (requestUpdateDeletion)="requestUpdateDeletion($event)"
                ></app-prayer-card>
                }
              }
            }

            <!-- Personal Prayer Cards (show when personal filter is active) -->
            @if (activeFilter === 'personal') {
              <div cdkDropList 
                   (cdkDropListDropped)="onPersonalPrayerDrop($event)" 
                   [cdkDropListDisabled]="selectedPersonalCategories.length !== 1"
                   class="space-y-3">
                @for (prayer of getFilteredPersonalPrayers(); track prayer.id) {
                  <div cdkDrag>
                    <app-prayer-card
                      [prayer]="prayer"
                      [isAdmin]="(isAdmin$ | async) || false"
                      [activeFilter]="activeFilter"
                      [isPersonal]="true"
                      [deletionsAllowed]="'everyone'"
                      [updatesAllowed]="'everyone'"
                      [isDragging]="true"
                      (delete)="deletePersonalPrayer($event)"
                      (addUpdate)="addPersonalUpdate($event)"
                      (deleteUpdate)="deletePersonalUpdate($event)"
                      (editPersonalPrayer)="openEditModal($event)"
                      (editPersonalUpdate)="openEditUpdateModal($event)"
                      [dragHandle]="selectedPersonalCategories.length === 1 ? dragHandle : null"
                    ></app-prayer-card>
                    <ng-template #dragHandle>
                      <div cdkDragHandle class="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:text-gray-600 dark:hover:text-gray-400 flex-shrink-0">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="9" cy="5" r="1"></circle>
                          <circle cx="9" cy="12" r="1"></circle>
                          <circle cx="9" cy="19" r="1"></circle>
                          <circle cx="15" cy="5" r="1"></circle>
                          <circle cx="15" cy="12" r="1"></circle>
                          <circle cx="15" cy="19" r="1"></circle>
                        </svg>
                      </div>
                    </ng-template>
                  </div>
                }
              </div>
            }

            <!-- Empty State for Prompts -->
            @if (activeFilter === 'prompts' && (prompts$ | async)?.length === 0) {
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
                <h3 class="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                  No prayer prompts yet
                </h3>
                <p class="text-gray-500 dark:text-gray-400">
                  Prompts help guide prayer requests.
                </p>
              </div>
            }

            <!-- Prompt Cards (only show when on prompts filter) -->
            @if (activeFilter === 'prompts') {
              @for (prompt of getDisplayedPrompts(); track prompt.id) {
                <app-prompt-card
                  [prompt]="prompt"
                  [isAdmin]="(isAdmin$ | async) || false"
                  [isTypeSelected]="isPromptTypeSelected(prompt.type)"
                  (delete)="deletePrompt($event)"
                  (onTypeClick)="togglePromptType($event)"
                ></app-prompt-card>
              }
            }
          </div>
        }
      </main>

      <!-- No Footer Links -->
    </div>
  `
})
export class HomeComponent implements OnInit, OnDestroy {
  prayers$!: Observable<PrayerRequest[]>;
  prompts$!: Observable<PrayerPrompt[]>;
  loading$!: Observable<boolean>;
  error$!: Observable<string | null>;
  isAdmin$!: Observable<boolean>;
  hasAdminEmail$!: Observable<boolean>;

  // Current prayers array for filtering
  currentPrayers: PrayerRequest[] = [];

  // Personal prayers
  personalPrayers: PrayerRequest[] = [];
  isReorderingPersonalPrayers = false;

  // Badge observables
  currentPrayerBadge$!: Observable<number>;
  answeredPrayerBadge$!: Observable<number>;
  promptBadge$!: Observable<number>;

  currentPrayersCount = 0;
  answeredPrayersCount = 0;
  totalPrayersCount = 0;
  promptsCount = 0;
  personalPrayersCount = 0;

  showPrayerForm = false;
  showSettings = false;
  showHelp = false;
  showLogoutConfirmation = false;
  showEditPersonalPrayer = false;
  editingPrayer: PrayerRequest | null = null;
  showEditPersonalUpdate = false;
  editingUpdate: PrayerUpdate | null = null;
  editingUpdatePrayerId = '';
  showEditMemberUpdate = false;
  editingMemberUpdate: PrayerUpdate | null = null;
  editingMemberUpdatePrayerId = '';
  filters: PrayerFilters = { status: 'current' };
  hasLogo = false;
  activeFilter: 'current' | 'answered' | 'total' | 'prompts' | 'personal' | 'planning_center_list' = 'current';
  viewReady = false;
  selectedPromptTypes: string[] = [];
  selectedPersonalCategories: string[] = [];
  isCategoryDragging = false;
  uniquePersonalCategories: string[] = [];
  isSwappingCategories = false;
  
  // Planning Center list filtering
  planningCenterListId: string | null = null;
  planningCenterListMembers: Array<{ id: string; name: string; avatar?: string | null }> = [];
  planningCenterListName: string | null = null;
  loadingPlanningCenterList = false;
  filteredPlanningCenterPrayers: PrayerRequest[] = [];
  loadingMemberPrayers = false;
  
  isAdmin = false;
  // Admin settings for access control policies
  // These are loaded from admin_settings and control who can delete prayers/updates
  deletionsAllowed: 'everyone' | 'original-requestor' | 'admin-only' = 'everyone';
  updatesAllowed: 'everyone' | 'original-requestor' | 'admin-only' = 'everyone';

  // Subject for managing subscriptions
  private destroy$ = new Subject<void>();

  constructor(
    public prayerService: PrayerService,
    public promptService: PromptService,
    public adminAuthService: AdminAuthService,
    public userSessionService: UserSessionService,
    public badgeService: BadgeService,
    private cacheService: CacheService,
    private toastService: ToastService,
    private analyticsService: AnalyticsService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private supabaseService: SupabaseService
  ) {
    // Load logo state from cache immediately to prevent flash
    const windowCache = (window as any).__cachedLogos;
    const useLogo = windowCache?.useLogo || localStorage.getItem('branding_use_logo') === 'true';
    this.hasLogo = useLogo;
  }

  ngOnInit(): void {
    // Track page view on home component load
    this.analyticsService.trackPageView();

    this.prayers$ = this.prayerService.prayers$;
    this.prompts$ = this.promptService.prompts$;
    this.loading$ = this.prayerService.loading$;
    this.error$ = this.prayerService.error$;
    this.isAdmin$ = this.adminAuthService.isAdmin$;
    this.hasAdminEmail$ = this.adminAuthService.hasAdminEmail$;

    // Subscribe to prayers for filtering
    this.prayers$
      .pipe(takeUntil(this.destroy$))
      .subscribe(prayers => {
        this.currentPrayers = prayers;
        this.cdr.markForCheck();
      });

    // Wait for prompts to load before initializing badges
    // This ensures prompts_cache is in localStorage when badges calculate
    this.prompts$
      .pipe(
        take(1),  // Only take the first emission
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        // Initialize badge observables after prompts are loaded
        this.currentPrayerBadge$ = this.badgeService.getBadgeCount$('prayers', 'current');
        this.answeredPrayerBadge$ = this.badgeService.getBadgeCount$('prayers', 'answered');
        this.promptBadge$ = this.badgeService.getBadgeCount$('prompts');
        
        // Trigger a badge refresh to ensure correct counts
        this.badgeService.refreshBadgeCounts();
      });

    // Load admin settings (deletion and update policies)
    this.loadAdminSettings();

    // Subscribe to ALL prayers to update counts (not filtered) - with cleanup
    this.prayerService.allPrayers$
      .pipe(takeUntil(this.destroy$))
      .subscribe(prayers => {
        this.currentPrayersCount = prayers.filter(p => p.status === 'current').length;
        this.answeredPrayersCount = prayers.filter(p => p.status === 'answered').length;
        this.totalPrayersCount = prayers.length;

        // Refresh badge counts when prayers data loads/changes
        this.badgeService.refreshBadgeCounts();
      });

    // Subscribe to prompts for count - with cleanup
    this.prompts$
      .pipe(takeUntil(this.destroy$))
      .subscribe(prompts => {
        this.promptsCount = prompts.length;
        this.cdr.markForCheck();

        // Refresh badge counts when prompts data loads/changes
        this.badgeService.refreshBadgeCounts();
      });

    // Subscribe to admin status - with cleanup
    this.adminAuthService.isAdmin$
      .pipe(takeUntil(this.destroy$))
      .subscribe(isAdmin => {
        this.isAdmin = isAdmin;
      });

    // Subscribe to personal prayers from the service (automatically loaded by service on session change)
    this.prayerService.allPersonalPrayers$
      .pipe(takeUntil(this.destroy$))
      .subscribe(async prayers => {
        this.personalPrayers = prayers;
        this.personalPrayersCount = prayers.length;
        if (prayers.length > 0) {
          await this.extractUniqueCategories(prayers);
        }
        this.cdr.markForCheck();
      });

    // Wait for the first real user session to apply the default view preference
    this.userSessionService.userSession$
      .pipe(
        filter(session => !!session),
        take(1),
        takeUntil(this.destroy$)
      )
      .subscribe(session => {
        const s = session!;
        this.activeFilter = s.defaultPrayerView ?? 'current';
        // Apply the user's preferred filter
        this.setFilter(this.activeFilter);
        this.viewReady = true;
        this.cdr.markForCheck();

        // Load planning center data in the background (don't wait for it)
        this.loadPlanningCenterListData().catch(error => {
          console.error('Error loading planning center list data:', error);
        });
      });
  }

  onPrayerFormClose(event: {isPersonal?: boolean}): void {
    this.showPrayerForm = false;
    // Personal prayers are automatically updated by the service observable
    // No need for manual invalidation or reload
  }

  private async loadPlanningCenterListData(): Promise<void> {
    try {
      // Get current user from session
      const userSession = this.userSessionService.getCurrentSession();
      if (!userSession?.email) {
        return;
      }

      // Fetch the user's planning center list ID from email_subscribers
      const { data, error } = await this.supabaseService.client
        .from('email_subscribers')
        .select('planning_center_list_id')
        .eq('email', userSession.email)
        .maybeSingle();

      if (error || !data?.planning_center_list_id) {
        return; // User doesn't have a mapped list
      }

      this.planningCenterListId = data.planning_center_list_id;
      this.loadingPlanningCenterList = true;
      this.cdr.markForCheck();

      // Check consolidated cache for members and list name
      // Key format: planningCenterListData_cache (handled by cache service)
      const cacheKey = `planningCenterListData`;
      const cached = this.cacheService.get<{
        members: Array<{id: string, name: string}>;
        listName?: string;
      }>(cacheKey);
      
      if (cached) {
        console.log(`[Planning Center] Using cached list data`);
        this.planningCenterListMembers = cached.members || [];
        if (cached.listName) {
          this.planningCenterListName = cached.listName;
        }
        this.cdr.markForCheck();
        // Load member prayers with their updates (updates loaded separately via memberPrayerUpdates_cache)
        await this.loadPlanningCenterMemberPrayers();
        this.loadingPlanningCenterList = false;
        this.cdr.markForCheck();
        return;
      }

      // Cache miss - fetch members from API
      const result = await fetchListMembers(
        this.planningCenterListId!,
        environment.supabaseUrl,
        environment.supabaseAnonKey
      );

      if (result.error) {
        console.error('Error fetching planning center list members:', result.error);
        this.loadingPlanningCenterList = false;
        this.cdr.markForCheck();
        return;
      }

      // result.members now returns Array<{id: string, name: string}>
      this.planningCenterListMembers = result.members;
      this.cdr.markForCheck();
      
      // Store only members and list name in cache (updates are cached separately)
      this.cacheService.set(cacheKey, {
        members: result.members,
        listName: this.planningCenterListName
      });

      console.log(`[Planning Center] Loaded ${result.members.length} members from list ${this.planningCenterListId}:`, result.members);

      // Load planning center member prayers (updates will be loaded from memberPrayerUpdates_cache)
      await this.loadPlanningCenterMemberPrayers();
      
      this.loadingPlanningCenterList = false;
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error loading planning center list data:', error);
      this.loadingPlanningCenterList = false;
      this.cdr.markForCheck();
    }
  }

  private async loadPlanningCenterMemberPrayers(): Promise<void> {
    try {
      this.loadingMemberPrayers = true;
      this.cdr.markForCheck();

      // Batch fetch updates for all members at once (much faster than individual requests)
      const personIds = this.planningCenterListMembers.map(m => m.id);
      const memberUpdatesMap = await this.prayerService.getMemberPrayerUpdatesBatch(personIds);

      // Generate virtual prayer cards for each Planning Center member with their updates
      this.filteredPlanningCenterPrayers = this.planningCenterListMembers.map((member, index) => {
        const updates = memberUpdatesMap[member.id] || [];
        
        return {
          id: `pc-member-${member.id}`,
          title: `Prayer for ${member.name}`,
          description: '',
          status: 'current' as const,
          requester: 'Planning Center',
          prayer_for: member.name,
          email: '',
          date_requested: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          updates: updates,
          approval_status: 'approved' as const,
          is_anonymous: false,
          type: 'prayer' as const,
          prayer_image: member.avatar || null,
        };
      });

      this.loadingMemberPrayers = false;
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error loading planning center member prayers:', error);
      this.loadingMemberPrayers = false;
      this.filteredPlanningCenterPrayers = [];
      this.cdr.markForCheck();
    }
  }

  ngOnDestroy(): void {
    // Complete the subject to unsubscribe from all observables
    this.destroy$.next();
    this.destroy$.complete();
  }

  async toggleMemberUpdateAnswered(event: {updateId: string; prayerId: string; isAnswered: boolean}): Promise<void> {
    try {
      const personId = event.prayerId.substring('pc-member-'.length);
      
      const success = await this.prayerService.updateMemberPrayerUpdate(
        event.updateId,
        personId,
        { is_answered: event.isAnswered } as any,
        this.planningCenterListId ?? undefined
      );
      
      if (success) {
        // Reload member prayers to show the updated status
        await this.reloadMemberPrayerUpdates(personId);
      }
    } catch (error) {
      console.error('Error toggling update answered status:', error);
      this.toastService.error('Failed to update answered status');
    }
  }

  private async loadAdminSettings(): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.client
        .from('admin_settings')
        .select('deletions_allowed, updates_allowed')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        console.error('Error loading admin settings:', error);
        return;
      }

      if (data) {
        // Load deletion and update policies from admin settings
        // These control who can delete prayers/updates and who can submit updates
        this.deletionsAllowed = data.deletions_allowed || 'everyone';
        this.updatesAllowed = data.updates_allowed || 'everyone';
        this.cdr.detectChanges();
      }
    } catch (err) {
      console.error('Error loading admin settings:', err);
    }
  }

  onFiltersChange(filters: PrayerFilters): void {
    // Preserve current filter state when search changes
    this.filters = {
      ...this.filters,
      searchTerm: filters.searchTerm
    };
    this.prayerService.applyFilters({
      status: this.filters.status,
      type: this.filters.type,
      search: this.filters.searchTerm
    });
  }

  setFilter(filter: 'current' | 'answered' | 'total' | 'prompts' | 'personal' | 'planning_center_list'): void {
    this.activeFilter = filter;
    
    if (filter === 'prompts') {
      // Clear prayer filters and reset prompt type selections
      this.filters = { searchTerm: this.filters.searchTerm };
      this.selectedPromptTypes = [];
      // Don't show any prayers when prompts filter is active
      this.prayerService.applyFilters({ search: '' }); // Empty results
    } else if (filter === 'personal') {
      // Show personal prayers only
      this.filters = { searchTerm: this.filters.searchTerm };
      this.prayerService.applyFilters({ search: this.filters.searchTerm });
      // Personal prayers are automatically loaded via service observable subscription
    } else if (filter === 'planning_center_list') {
      // Load prayers for planning center list members
      this.filters = { searchTerm: this.filters.searchTerm };
      this.prayerService.applyFilters({ search: this.filters.searchTerm });
      this.loadPlanningCenterMemberPrayers();
    } else if (filter === 'total') {
      this.filters = { searchTerm: this.filters.searchTerm };
      this.prayerService.applyFilters({
        search: this.filters.searchTerm
      });
    } else {
      this.filters = { status: filter, searchTerm: this.filters.searchTerm };
      this.prayerService.applyFilters({
        status: this.filters.status,
        search: this.filters.searchTerm
      });
    }
  }

  /**
   * Update the user's default prayer view preference in database
   */
  async updateDefaultViewPreference(preference: 'current' | 'personal'): Promise<boolean> {
    const email = this.userSessionService.getUserEmail();
    
    if (!email) {
      return false;
    }

    try {
      // Check if subscriber record exists
      const { data: existingRecord, error: fetchError } = await this.supabaseService.client
        .from('email_subscribers')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (existingRecord) {
        // Update existing record
        const { error: updateError } = await this.supabaseService.client
          .from('email_subscribers')
          .update({ default_prayer_view: preference })
          .eq('email', email.toLowerCase().trim());

        if (updateError) {
          throw updateError;
        }
      } else {
        // Create new record
        const { error: insertError } = await this.supabaseService.client
          .from('email_subscribers')
          .insert({
            email: email.toLowerCase().trim(),
            default_prayer_view: preference
          });

        if (insertError) {
          throw insertError;
        }
      }

      // Update UserSessionService cache to keep it in sync
      await this.userSessionService.updateUserSession({
        defaultPrayerView: preference
      });

      return true;
    } catch (err) {
      console.error('Error updating default view preference:', err);
      return false;
    }
  }

  markAsAnswered(id: string): void {
    this.prayerService.updatePrayerStatus(id, 'answered');
  }

  deletePrayer(id: string): void {
    this.prayerService.deletePrayer(id);
  }

  deletePersonalPrayer(id: string): void {
    this.prayerService.deletePersonalPrayer(id).catch((error) => {
      console.error('Error deleting personal prayer:', error);
    });
    // Service updates cache and observable automatically
  }

  async addUpdate(updateData: any): Promise<void> {
    try {
      // Check if this is a member card (synthetic prayer for Planning Center member)
      if (updateData.prayer_id?.startsWith('pc-member-')) {
        // Extract person_id from prayer_id format: pc-member-{person_id}
        const personId = updateData.prayer_id.split('-').slice(2).join('-');
        // Find the member to get their current name
        const member = this.planningCenterListMembers.find(m => m.id === personId);
        
        if (!member) {
          console.error('Member not found for person_id:', personId);
          this.toastService.error('Member not found');
          return;
        }

        const userSession = this.userSessionService.getCurrentSession();
        const author = userSession?.fullName || 'Anonymous';
        const authorEmail = userSession?.email || '';

        const success = await this.prayerService.addMemberPrayerUpdate(
          personId,
          member.name,
          updateData.content,
          author,
          authorEmail,
          updateData.mark_as_answered || false, // Pass the answered flag
          this.planningCenterListId ?? undefined // Pass listId for cache invalidation
        );

        if (success) {
          // Cache will be cleared automatically by the service
          // Reload the member prayers to show the new update
          await this.loadPlanningCenterMemberPrayers();
        }
      } else {
        // User is logged in - submit regular prayer update
        await this.submitUpdate(updateData);
      }
    } catch (error) {
      console.error('Error adding update:', error);
      this.toastService.error('Failed to submit update');
    }
  }

  async addPersonalUpdate(updateData: any): Promise<void> {
    try {
      const userSession = this.userSessionService.getCurrentSession();
      const author = userSession?.fullName || 'Anonymous';
      const authorEmail = userSession?.email || '';

      const success = await this.prayerService.addPersonalPrayerUpdate(
        updateData.prayer_id,
        updateData.content,
        author,
        authorEmail,
        updateData.mark_as_answered || false
      );

      if (success) {
        // If update is marked as answered, set the prayer category to "Answered"
        if (updateData.mark_as_answered) {
          await this.prayerService.updatePersonalPrayer(updateData.prayer_id, { category: 'Answered' });
        }
        // Service updates observable and cache automatically
      }
    } catch (error) {
      console.error('Error adding personal prayer update:', error);
      this.toastService.error('Failed to add update');
    }
  }

  async deleteUpdate(event: {updateId: string; prayerId: string}): Promise<void> {
    try {
      const {updateId, prayerId} = event;
      
      // Check if this is a member update (prayerId starts with 'pc-member-')
      if (prayerId.startsWith('pc-member-')) {
        // Extract person_id from prayerId (format: 'pc-member-{person_id}')
        const personId = prayerId.substring('pc-member-'.length);
        
        // Delete from member_prayer_updates table and clear cache
        const success = await this.prayerService.deleteMemberPrayerUpdate(
          updateId,
          personId,
          this.planningCenterListId ?? undefined // Pass listId for cache invalidation
        );
        if (success) {
          // Reload all member prayers to show immediate change
          await this.loadPlanningCenterMemberPrayers();
        }
      } else {
        // Regular prayer update - delete from prayer_updates table
        await this.prayerService.deleteUpdate(updateId);
      }
    } catch (error) {
      console.error('Error deleting update:', error);
      this.toastService.error('Failed to delete update');
    }
  }

  async deletePersonalUpdate(event: {updateId: string; prayerId: string}): Promise<void> {
    try {
      const {updateId} = event;
      const success = await this.prayerService.deletePersonalPrayerUpdate(updateId);
      if (success) {
        // Service updates cache and observable automatically
      }
    } catch (error) {
      console.error('Error deleting personal prayer update:', error);
      this.toastService.error('Failed to delete update');
    }
  }

  async onPersonalPrayerDrop(event: CdkDragDrop<PrayerRequest[]>): Promise<void> {
    // If the index hasn't changed, no need to do anything
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    // Only allow reordering when viewing a single category
    if (this.selectedPersonalCategories.length !== 1) {
      this.toastService.error('Select a single category to reorder prayers');
      return;
    }

    try {
      this.isReorderingPersonalPrayers = true;

      // Get the filtered prayers (what the user sees)
      const filteredPrayers = this.getFilteredPersonalPrayers();
      
      // Get the prayer being moved
      const movedPrayer = filteredPrayers[event.previousIndex];
      
      // Save the original personalPrayers state for potential rollback
      const originalPersonalPrayers = [...this.personalPrayers];
      
      // Reorder the filtered array
      moveItemInArray(filteredPrayers, event.previousIndex, event.currentIndex);

      // Update the personalPrayers array immediately for instant visual feedback
      // Remove the moved prayer from its old position
      const oldIndex = this.personalPrayers.findIndex(p => p.id === movedPrayer.id);
      if (oldIndex !== -1) {
        this.personalPrayers.splice(oldIndex, 1);
      }
      
      // Find where to insert it based on the prayers around it in the filtered array
      const newPositionInFiltered = event.currentIndex;
      if (newPositionInFiltered === 0) {
        // Moving to first position - find the first prayer in filtered list and insert before it
        const firstPrayer = filteredPrayers[1]; // The prayer now after the moved one
        if (firstPrayer) {
          const firstIndex = this.personalPrayers.findIndex(p => p.id === firstPrayer.id);
          this.personalPrayers.splice(firstIndex, 0, movedPrayer);
        } else {
          // Only one prayer in category, just add it
          this.personalPrayers.push(movedPrayer);
        }
      } else {
        // Moving to middle or end - insert after the previous prayer
        const previousPrayer = filteredPrayers[newPositionInFiltered - 1];
        const previousIndex = this.personalPrayers.findIndex(p => p.id === previousPrayer.id);
        this.personalPrayers.splice(previousIndex + 1, 0, movedPrayer);
      }
      
      // Trigger immediate change detection for instant visual feedback
      this.cdr.detectChanges();

      // Persist the new order to the database (only the filtered prayers in this category)
      const success = await this.prayerService.updatePersonalPrayerOrder(filteredPrayers);

      if (success) {
        // Service updates cache and observable automatically
        this.cdr.detectChanges();
      } else {
        this.toastService.error('Failed to reorder prayers');
        // Rollback the UI to the original state
        this.personalPrayers = originalPersonalPrayers;
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.error('Error reordering personal prayers:', error);
      this.toastService.error('Failed to reorder prayers');
    } finally {
      this.isReorderingPersonalPrayers = false;
    }
  }

  onCategoryDragStarted(): void {
    this.isCategoryDragging = true;
    document.body.style.cursor = 'grabbing';
  }

  onCategoryDragEnded(): void {
    this.isCategoryDragging = false;
    document.body.style.cursor = '';
  }

  async onCategoryDrop(event: CdkDragDrop<string[]>): Promise<void> {
    // If the index hasn't changed, no need to do anything
    if (event.previousIndex === event.currentIndex) {
      return;
    }

    // Prevent multiple concurrent swaps
    if (this.isSwappingCategories) {
      return;
    }

    // Make a copy of the original array to compare after
    const originalCategories = [...this.uniquePersonalCategories];

    // Immediately move item in the array for instant visual feedback
    moveItemInArray(this.uniquePersonalCategories, event.previousIndex, event.currentIndex);
    this.isSwappingCategories = true;
    this.cdr.detectChanges();

    try {
      let success = false;

      // Check if this is a simple adjacent swap (more efficient RPC method)
      const isAdjacentSwap = Math.abs(event.previousIndex - event.currentIndex) === 1;
      
      if (isAdjacentSwap) {
        // Use efficient RPC-based swap for adjacent categories (95% less egress)
        const categoryA = originalCategories[event.previousIndex];
        const categoryB = originalCategories[event.currentIndex];
        success = await this.prayerService.swapCategoryRanges(categoryA, categoryB);
      } else {
        // Use full reorder for non-adjacent moves (e.g., dragging from last to first)
        success = await this.prayerService.reorderCategories(this.uniquePersonalCategories);
      }

      if (success) {
        // Service updates cache and observable automatically
        // Re-extract categories from the prayers to match the new database order
        await this.extractUniqueCategories(this.personalPrayers);
        
        this.cdr.detectChanges();
      } else {
        this.toastService.error('Failed to reorder categories');
        // Move back to original position in UI since swap failed
        moveItemInArray(this.uniquePersonalCategories, event.currentIndex, event.previousIndex);
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.error('Error reordering categories:', error);
      this.toastService.error('Failed to reorder categories');
      // Move back to original position
      moveItemInArray(this.uniquePersonalCategories, event.currentIndex, event.previousIndex);
      this.cdr.detectChanges();
    } finally {
      this.isSwappingCategories = false;
      this.cdr.detectChanges();
    }
  }

  async requestDeletion(requestData: any): Promise<void> {
    try {
      // User is logged in - submit directly without verification
      await this.submitDeletion(requestData);
    } catch (error) {
      console.error('Error requesting deletion:', error);
      this.toastService.error('Failed to submit deletion request');
    }
  }
  async requestUpdateDeletion(requestData: any): Promise<void> {
    try {
      // User is logged in - submit directly without verification
      await this.submitUpdateDeletion(requestData);
    } catch (error) {
      console.error('Error requesting update deletion:', error);
      this.toastService.error('Failed to submit update deletion request');
    }
  }

  async deletePrompt(id: string): Promise<void> {
    await this.promptService.deletePrompt(id);
  }

  togglePromptType(type: string): void {
    // If clicking the currently selected type, deselect it (show all)
    if (this.selectedPromptTypes.length === 1 && this.selectedPromptTypes[0] === type) {
      this.selectedPromptTypes = [];
    } else {
      // Select only this type (deselect all others)
      this.selectedPromptTypes = [type];
    }
  }

  isPromptTypeSelected(type: string): boolean {
    return this.selectedPromptTypes.includes(type);
  }

  togglePersonalCategory(category: string): void {
    // If clicking the currently selected category, deselect it (show all)
    if (this.selectedPersonalCategories.length === 1 && this.selectedPersonalCategories[0] === category) {
      this.selectedPersonalCategories = [];
    } else {
      // Select only this category (deselect all others)
      this.selectedPersonalCategories = [category];
    }
  }

  isPersonalCategorySelected(category: string): boolean {
    return this.selectedPersonalCategories.includes(category);
  }

  private async extractUniqueCategories(prayers: PrayerRequest[]): Promise<void> {
    // Use prayer service method which sorts by display_order, pass the prayers directly
    this.uniquePersonalCategories = await this.prayerService.getUniqueCategoriesForUser(prayers);
    // Force immediate change detection to ensure categories render
    this.cdr.detectChanges();
  }

  getPersonalCategoryCount(category: string): number {
    return this.personalPrayers.filter(p => p.category === category).length;
  }

  getDisplayedPrompts(): PrayerPrompt[] {
    let prompts = this.promptService.promptsSubject.value;
    if (this.activeFilter !== 'prompts') return [];
    
    // Filter by search term if present
    if (this.filters.searchTerm && this.filters.searchTerm.trim()) {
      const searchLower = this.filters.searchTerm.toLowerCase().trim();
      prompts = prompts.filter(p => 
        p.title.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower) ||
        p.type.toLowerCase().includes(searchLower)
      );
    }
    
    // Filter by selected types
    if (this.selectedPromptTypes.length > 0) {
      prompts = prompts.filter(p => this.selectedPromptTypes.includes(p.type));
    }
    
    return prompts;
  }

  getUniquePromptTypes(): string[] {
    const prompts = this.promptService.promptsSubject.value;
    const seenTypes = new Set<string>();
    const orderedTypes: string[] = [];
    
    prompts.forEach(p => {
      if (!seenTypes.has(p.type)) {
        seenTypes.add(p.type);
        orderedTypes.push(p.type);
      }
    });
    
    return orderedTypes;
  }

  getPromptCountByType(type: string): number {
    const prompts = this.promptService.promptsSubject.value;
    return prompts.filter(p => p.type === type).length;
  }

  /**
   * Get count of unread prompts by type (prompts with badges)
   */
  getUnreadPromptCountByType(type: string): number {
    const prompts = this.promptService.promptsSubject.value;
    return prompts.filter(p => p.type === type && this.badgeService.isPromptUnread(p.id)).length;
  }

  /**
   * Get personal prayers filtered by search term and category
   */
  getFilteredPersonalPrayers(): PrayerRequest[] {
    let filtered = this.personalPrayers;
    
    // Filter by search term if present
    if (this.filters.searchTerm && this.filters.searchTerm.trim()) {
      const searchLower = this.filters.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(p => {
        // Search in prayer fields
        const prayerMatch = p.prayer_for.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower) ||
          p.title.toLowerCase().includes(searchLower);
        
        // Search in update content
        const updateMatch = p.updates && p.updates.length > 0 &&
          p.updates.some(update =>
            update.content && update.content.toLowerCase().includes(searchLower)
          );

        return prayerMatch || updateMatch;
      });
    }

    // Filter by selected categories
    if (this.selectedPersonalCategories.length > 0) {
      filtered = filtered.filter(p => 
        p.category && this.selectedPersonalCategories.includes(p.category)
      );
    }
    
    return filtered;
  }

  getFilteredPlanningCenterPrayers(): PrayerRequest[] {
    // Apply search term filter if present
    if (!this.filters.searchTerm || !this.filters.searchTerm.trim()) {
      return this.filteredPlanningCenterPrayers;
    }

    const searchLower = this.filters.searchTerm.toLowerCase().trim();
    return this.filteredPlanningCenterPrayers.filter(p => {
      // Search in member name (prayer_for), title, and description
      const memberMatch = p.prayer_for.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower) ||
        p.title.toLowerCase().includes(searchLower);
      
      // Search in update content
      const updateMatch = p.updates && p.updates.length > 0 &&
        p.updates.some(update =>
          update.content && update.content.toLowerCase().includes(searchLower)
        );
      
      return memberMatch || updateMatch;
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }
  
  private async submitUpdate(updateData: any): Promise<void> {
    await this.prayerService.addUpdate(updateData);
  }

  private async submitDeletion(requestData: any): Promise<void> {
    await this.prayerService.requestDeletion(requestData);
  }

  private async submitUpdateDeletion(requestData: any): Promise<void> {
    await this.prayerService.requestUpdateDeletion(requestData);
  }

  async logout(): Promise<void> {
    await this.adminAuthService.logout();
  }

  async handleLogout(): Promise<void> {
    this.showLogoutConfirmation = false;
    await this.logout();
  }

  navigateToAdmin(): void {
    // Check if admin session is still active
    this.adminAuthService.isAdmin$.pipe(take(1)).subscribe(isAdmin => {
      if (isAdmin) {
        // Session is active, navigate to admin panel
        this.router.navigate(['/admin']);
      } else {
        // Admin session has expired - show MFA modal to re-authenticate
        // Trigger verification flow similar to requestDeletion
        this.showAdminMfaModal();
      }
    });
  }

  private showAdminMfaModal(): void {
    // Get user email from localStorage
    let userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
      userEmail = localStorage.getItem('prayerapp_user_email');
    }
    if (!userEmail) {
      userEmail = localStorage.getItem('approvalAdminEmail');
    }

    if (!userEmail) {
      this.toastService.error('Email not found. Please log in again.');
      return;
    }

    // Navigate to admin login to re-authenticate with MFA
    this.router.navigate(['/login'], {
      queryParams: { 
        email: userEmail,
        sessionExpired: true
      }
    });
  }

  getUserEmail(): string {
    // Get email from cached UserSessionService
    const cachedEmail = this.userSessionService.getUserEmail();
    if (cachedEmail) return cachedEmail;
    
    // Fall back to localStorage if service doesn't have it yet
    const approvalEmail = localStorage.getItem('approvalAdminEmail');
    if (approvalEmail) return approvalEmail;
    
    const userEmail = localStorage.getItem('userEmail');
    if (userEmail) return userEmail;
    
    const prayerappEmail = localStorage.getItem('prayerapp_user_email');
    if (prayerappEmail) return prayerappEmail;
    
    return 'Not logged in';
  }

  markAllCurrentAsRead(): void {
    this.badgeService.markAllAsReadByStatus('prayers', 'current');
  }

  markAllAnsweredAsRead(): void {
    this.badgeService.markAllAsReadByStatus('prayers', 'answered');
  }

  markAllPromptsAsRead(): void {
    this.badgeService.markAllAsRead('prompts');
  }

  openEditModal(prayer: PrayerRequest): void {
    this.editingPrayer = prayer;
    this.showEditPersonalPrayer = true;
    this.cdr.markForCheck();
  }

  onPersonalPrayerSaved(): void {
    this.showEditPersonalPrayer = false;
    this.editingPrayer = null;
    this.cdr.markForCheck();
    // Personal prayers will be refreshed via service observable subscription
  }

  openEditUpdateModal(event: {update: PrayerUpdate, prayerId: string}): void {
    this.editingUpdate = event.update;
    this.editingUpdatePrayerId = event.prayerId;
    this.showEditPersonalUpdate = true;
    this.cdr.markForCheck();
  }

  onPersonalUpdateSaved(): void {
    this.showEditPersonalUpdate = false;
    this.editingUpdate = null;
    this.editingUpdatePrayerId = '';
    this.cdr.markForCheck();
    // Personal prayers will be refreshed via service observable subscription
  }

  openEditMemberUpdateModal(event: {update: PrayerUpdate, prayerId: string}): void {
    this.editingMemberUpdate = event.update;
    this.editingMemberUpdatePrayerId = event.prayerId;
    this.showEditMemberUpdate = true;
    this.cdr.markForCheck();
  }

  onMemberUpdateSaved(): void {
    this.showEditMemberUpdate = false;
    const personId = this.editingMemberUpdatePrayerId.substring('pc-member-'.length);
    this.editingMemberUpdate = null;
    this.editingMemberUpdatePrayerId = '';
    this.cdr.markForCheck();
    // Only reload updates for the member that was edited, not all members
    // Add small delay to ensure database has been updated with new timestamp
    setTimeout(() => this.reloadMemberPrayerUpdates(personId), 100);
  }

  private async reloadMemberPrayerUpdates(personId: string): Promise<void> {
    try {
      const member = this.planningCenterListMembers.find(m => m.id === personId);
      if (!member) return;

      // Reload updates only for this specific member
      const updates = await this.prayerService.getMemberPrayerUpdates(member.id);
      
      // Update only this member's prayer card in the array
      const index = this.filteredPlanningCenterPrayers.findIndex(p => p.id === `pc-member-${member.id}`);
      if (index !== -1) {
        // Create a new object reference to trigger OnPush change detection in prayer-card component
        this.filteredPlanningCenterPrayers[index] = {
          ...this.filteredPlanningCenterPrayers[index],
          updates: updates
        };
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.error('Error reloading member prayer updates:', error);
    }
  }
}
