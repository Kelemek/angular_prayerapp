import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AdminDataService } from '../../services/admin-data.service';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AnalyticsService, AnalyticsStats } from '../../services/analytics.service';
import { PendingPrayerCardComponent } from '../../components/pending-prayer-card/pending-prayer-card.component';
import { PendingUpdateCardComponent } from '../../components/pending-update-card/pending-update-card.component';
import { PendingDeletionCardComponent } from '../../components/pending-deletion-card/pending-deletion-card.component';
import { PendingUpdateDeletionCardComponent } from '../../components/pending-update-deletion-card/pending-update-deletion-card.component';
import { PendingPreferenceChangeCardComponent } from '../../components/pending-preference-change-card/pending-preference-change-card.component';
import { AppBrandingComponent } from '../../components/app-branding/app-branding.component';
import { PromptManagerComponent } from '../../components/prompt-manager/prompt-manager.component';
import { PrayerTypesManagerComponent } from '../../components/prayer-types-manager/prayer-types-manager.component';
import { EmailSettingsComponent } from '../../components/email-settings/email-settings.component';
import { AdminUserManagementComponent } from '../../components/admin-user-management/admin-user-management.component';
import { PrayerSearchComponent } from '../../components/prayer-search/prayer-search.component';
import { BackupStatusComponent } from '../../components/backup-status/backup-status.component';
import { SessionTimeoutSettingsComponent } from '../../components/session-timeout-settings/session-timeout-settings.component';

type AdminTab = 'prayers' | 'updates' | 'deletions' | 'preferences' | 'settings';
type SettingsTab = 'analytics' | 'email' | 'users' | 'content' | 'tools' | 'timeouts';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule,
    PendingPrayerCardComponent,
    PendingUpdateCardComponent,
    PendingDeletionCardComponent,
    PendingUpdateDeletionCardComponent,
    PendingPreferenceChangeCardComponent,
    AppBrandingComponent,
    PromptManagerComponent,
    PrayerTypesManagerComponent,
    EmailSettingsComponent,
    AdminUserManagementComponent,
    PrayerSearchComponent,
    BackupStatusComponent,
    SessionTimeoutSettingsComponent
  ],
  template: `
    <div class="w-full min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors flex flex-col">
      <!-- Header -->
      <header class="w-full bg-white dark:bg-gray-800 shadow-md border-b border-gray-200 dark:border-gray-700">
        <div class="max-w-6xl mx-auto w-full px-4 py-6">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <svg class="text-red-600 dark:text-red-400" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <div>
                <h1 class="text-2xl font-bold text-gray-800 dark:text-gray-100">Admin Portal</h1>
                <p class="text-gray-600 dark:text-gray-300">Manage prayer requests and updates</p>
              </div>
            </div>
            
            <!-- Navigation Controls -->
            <div class="flex items-center gap-3">
              <button
                (click)="goToHome()"
                class="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-900 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                Back to Main Page
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Content -->
      <main class="w-full max-w-6xl mx-auto px-4 py-6">
        <!-- Stats Grid -->
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mb-8">
          <button
            (click)="onTabChange('prayers')"
            [class]="'bg-white dark:bg-gray-800 rounded-lg shadow-md p-2 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 ' + (activeTab === 'prayers' ? 'ring-2 ring-blue-500' : '')"
          >
            <div class="text-center">
              <div class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {{ adminData?.pendingPrayers?.length || 0 }}
              </div>
              <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">Pending Prayers</div>
            </div>
          </button>

          <button
            (click)="onTabChange('updates')"
            [class]="'bg-white dark:bg-gray-800 rounded-lg shadow-md p-2 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 ' + (activeTab === 'updates' ? 'ring-2 ring-blue-500' : '')"
          >
            <div class="text-center">
              <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {{ adminData?.pendingUpdates?.length || 0 }}
              </div>
              <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">Pending Updates</div>
            </div>
          </button>

          <button
            (click)="onTabChange('deletions')"
            [class]="'bg-white dark:bg-gray-800 rounded-lg shadow-md p-2 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 ' + (activeTab === 'deletions' ? 'ring-2 ring-blue-500' : '')"
          >
            <div class="text-center">
              <div class="text-2xl font-bold text-red-600 dark:text-red-400">
                {{ (adminData?.pendingDeletionRequests?.length || 0) + (adminData?.pendingUpdateDeletionRequests?.length || 0) }}
              </div>
              <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">Pending Deletions</div>
            </div>
          </button>

          <button
            (click)="onTabChange('preferences')"
            [class]="'bg-white dark:bg-gray-800 rounded-lg shadow-md p-2 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 ' + (activeTab === 'preferences' ? 'ring-2 ring-blue-500' : '')"
          >
            <div class="text-center">
              <div class="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {{ adminData?.pendingPreferenceChanges?.length || 0 }}
              </div>
              <div class="text-xs text-gray-600 dark:text-gray-400 mt-1">Pending Preferences</div>
            </div>
          </button>

          <button
            (click)="onTabChange('settings')"
            [class]="'bg-white dark:bg-gray-800 rounded-lg shadow-md p-2 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 ' + (activeTab === 'settings' ? 'ring-2 ring-blue-500' : '')"
          >
            <div class="text-center">
              <svg class="w-6 h-6 mx-auto text-gray-600 dark:text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              <div class="text-xs text-gray-600 dark:text-gray-400 mt-2">Settings</div>
            </div>
          </button>
        </div>

        <!-- Alert for pending items -->
        <div *ngIf="totalPendingCount > 0" class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mb-6">
          <div class="flex items-center gap-2">
            <svg class="text-yellow-600 dark:text-yellow-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <p class="text-yellow-800 dark:text-yellow-200">
              You have {{ totalPendingCount }} items pending approval.
            </p>
          </div>
        </div>

        <!-- Loading State -->
        <div *ngIf="adminData?.loading" class="text-center py-12">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p class="text-gray-600 dark:text-gray-400 mt-4">Loading admin data...</p>
        </div>

        <!-- Error State -->
        <div *ngIf="adminData?.error" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-6">
          <p class="text-red-800 dark:text-red-200">{{ adminData.error }}</p>
          <button 
            (click)="refresh()"
            class="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>

        <!-- Tab Content -->
        <div *ngIf="!adminData?.loading && !adminData?.error">
          <!-- Prayers Tab -->
          <div *ngIf="activeTab === 'prayers'">
            <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">
              Pending Prayer Requests ({{ adminData?.pendingPrayers?.length || 0 }})
            </h2>
            
            <div *ngIf="(adminData?.pendingPrayers?.length || 0) === 0" 
                 class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
              <svg class="mx-auto mb-4 text-gray-400 dark:text-gray-500" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <h3 class="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                No pending prayer requests
              </h3>
              <p class="text-gray-500 dark:text-gray-400">
                All prayer requests have been reviewed.
              </p>
            </div>

            <div class="space-y-6">
              <app-pending-prayer-card
                *ngFor="let prayer of adminData?.pendingPrayers"
                [prayer]="prayer"
                (approve)="approvePrayer($event)"
                (deny)="denyPrayer($event.id, $event.reason)"
                (edit)="editPrayer($event.id, $event.updates)"
              ></app-pending-prayer-card>
            </div>
          </div>

          <!-- Updates Tab -->
          <div *ngIf="activeTab === 'updates'">
            <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">
              Pending Prayer Updates ({{ adminData?.pendingUpdates?.length || 0 }})
            </h2>
            
            <div *ngIf="(adminData?.pendingUpdates?.length || 0) === 0" 
                 class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
              <svg class="mx-auto mb-4 text-gray-400 dark:text-gray-500" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <h3 class="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                No pending prayer updates
              </h3>
              <p class="text-gray-500 dark:text-gray-400">
                All prayer updates have been reviewed.
              </p>
            </div>

            <div class="space-y-6">
              <app-pending-update-card
                *ngFor="let update of adminData?.pendingUpdates"
                [update]="update"
                (approve)="approveUpdate($event)"
                (deny)="denyUpdate($event.id, $event.reason)"
                (edit)="editUpdate($event.id, $event.updates)"
              ></app-pending-update-card>
            </div>
          </div>

          <!-- Deletions Tab -->
          <div *ngIf="activeTab === 'deletions'">
            <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">
              Pending Deletion Requests ({{ (adminData?.pendingDeletionRequests?.length || 0) + (adminData?.pendingUpdateDeletionRequests?.length || 0) }})
            </h2>
            
            <div *ngIf="(adminData?.pendingDeletionRequests?.length || 0) === 0 && (adminData?.pendingUpdateDeletionRequests?.length || 0) === 0" 
                 class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
              <svg class="mx-auto mb-4 text-gray-400 dark:text-gray-500" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <h3 class="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                No pending deletion requests
              </h3>
              <p class="text-gray-500 dark:text-gray-400">
                All deletion requests have been reviewed.
              </p>
            </div>
            
            <div class="space-y-6" *ngIf="(adminData?.pendingDeletionRequests?.length || 0) > 0 || (adminData?.pendingUpdateDeletionRequests?.length || 0) > 0">
              <!-- Prayer Deletions -->
              <div *ngIf="(adminData?.pendingDeletionRequests?.length || 0) > 0">
                <h3 class="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">
                  Prayer Deletions ({{ adminData?.pendingDeletionRequests?.length || 0 }})
                </h3>

                <div class="space-y-6">
                  <app-pending-deletion-card
                    *ngFor="let request of adminData?.pendingDeletionRequests"
                    [deletionRequest]="request"
                    (approve)="approveDeletionRequest($event)"
                    (deny)="denyDeletionRequest($event.id, $event.reason)"
                  ></app-pending-deletion-card>
                </div>
              </div>

              <!-- Update Deletions -->
              <div *ngIf="(adminData?.pendingUpdateDeletionRequests?.length || 0) > 0">
                <h3 class="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">
                  Update Deletions ({{ adminData?.pendingUpdateDeletionRequests?.length || 0 }})
                </h3>
                
                <div class="space-y-6">
                  <app-pending-update-deletion-card
                    *ngFor="let request of adminData?.pendingUpdateDeletionRequests"
                    [deletionRequest]="request"
                    (approve)="approveUpdateDeletionRequest($event)"
                    (deny)="denyUpdateDeletionRequest($event.id, $event.reason)"
                  ></app-pending-update-deletion-card>
                </div>
              </div>
            </div>
          </div>

          <!-- Preferences Tab -->
          <div *ngIf="activeTab === 'preferences'">
            <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">
              Pending Preference Changes ({{ adminData?.pendingPreferenceChanges?.length || 0 }})
            </h2>
            
            <div *ngIf="(adminData?.pendingPreferenceChanges?.length || 0) === 0" 
                 class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
              <svg class="mx-auto mb-4 text-gray-400 dark:text-gray-500" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <h3 class="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                No pending preference changes
              </h3>
              <p class="text-gray-500 dark:text-gray-400">
                All notification preference requests have been reviewed.
              </p>
            </div>

            <div class="space-y-6">
              <app-pending-preference-change-card
                *ngFor="let change of adminData?.pendingPreferenceChanges"
                [change]="change"
                (approve)="approvePreferenceChange($event)"
                (deny)="denyPreferenceChange($event.id, $event.reason)"
              ></app-pending-preference-change-card>
            </div>
          </div>

          <!-- Settings Tab -->
          <div *ngIf="activeTab === 'settings'">
            <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">
              Admin Settings
            </h2>
            
            <!-- Settings Sub-Navigation -->
            <div class="flex flex-wrap gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
              <button
                (click)="onSettingsTabChange('analytics')"
                [class]="'px-4 py-2 font-medium rounded-t-lg transition-colors flex items-center gap-2 ' + (activeSettingsTab === 'analytics' ? 'bg-blue-600 text-white border-b-2 border-blue-600' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200')"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                  <polyline points="17 6 23 6 23 12"></polyline>
                </svg>
                Analytics
              </button>
              <button
                (click)="onSettingsTabChange('content')"
                [class]="'px-4 py-2 font-medium rounded-t-lg transition-colors flex items-center gap-2 ' + (activeSettingsTab === 'content' ? 'bg-blue-600 text-white border-b-2 border-blue-600' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200')"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                Content
              </button>
              <button
                (click)="onSettingsTabChange('email')"
                [class]="'px-4 py-2 font-medium rounded-t-lg transition-colors flex items-center gap-2 ' + (activeSettingsTab === 'email' ? 'bg-blue-600 text-white border-b-2 border-blue-600' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200')"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                Email
              </button>
              <button
                (click)="onSettingsTabChange('users')"
                [class]="'px-4 py-2 font-medium rounded-t-lg transition-colors flex items-center gap-2 ' + (activeSettingsTab === 'users' ? 'bg-blue-600 text-white border-b-2 border-blue-600' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200')"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                Users
              </button>
              <button
                (click)="onSettingsTabChange('tools')"
                [class]="'px-4 py-2 font-medium rounded-t-lg transition-colors flex items-center gap-2 ' + (activeSettingsTab === 'tools' ? 'bg-blue-600 text-white border-b-2 border-blue-600' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200')"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                </svg>
                Tools
              </button>
              <button
                (click)="onSettingsTabChange('timeouts')"
                [class]="'px-4 py-2 font-medium rounded-t-lg transition-colors flex items-center gap-2 ' + (activeSettingsTab === 'timeouts' ? 'bg-blue-600 text-white border-b-2 border-blue-600' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200')"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                Timeouts
              </button>
            </div>

            <!-- Analytics Tab -->
            <div *ngIf="activeSettingsTab === 'analytics'" class="space-y-6">
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
                <div class="flex items-center gap-2 mb-4">
                  <svg class="text-blue-600 dark:text-blue-400" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                    <polyline points="17 6 23 6 23 12"></polyline>
                  </svg>
                  <h3 class="text-lg font-medium text-gray-800 dark:text-gray-100">
                    Site Analytics
                  </h3>
                </div>
                
                <div *ngIf="analyticsStats.loading" class="text-center py-4">
                  <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                </div>

                <div *ngIf="!analyticsStats.loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <!-- Today -->
                  <div class="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                    <div class="flex items-center gap-2 mb-2">
                      <svg class="text-blue-600 dark:text-blue-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                      <div class="text-sm font-medium text-blue-900 dark:text-blue-100">Today</div>
                    </div>
                    <div class="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {{ analyticsStats.todayPageViews.toLocaleString() }}
                    </div>
                    <div class="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">page views</div>
                  </div>

                  <!-- This Week -->
                  <div class="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
                    <div class="flex items-center gap-2 mb-2">
                      <svg class="text-purple-600 dark:text-purple-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                      <div class="text-sm font-medium text-purple-900 dark:text-purple-100">This Week</div>
                    </div>
                    <div class="text-3xl font-bold text-purple-600 dark:text-purple-400">
                      {{ analyticsStats.weekPageViews.toLocaleString() }}
                    </div>
                    <div class="text-xs text-purple-600/70 dark:text-purple-400/70 mt-1">page views</div>
                  </div>

                  <!-- This Month -->
                  <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
                    <div class="flex items-center gap-2 mb-2">
                      <svg class="text-green-600 dark:text-green-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                        <polyline points="17 6 23 6 23 12"></polyline>
                      </svg>
                      <div class="text-sm font-medium text-green-900 dark:text-green-100">This Month</div>
                    </div>
                    <div class="text-3xl font-bold text-green-600 dark:text-green-400">
                      {{ analyticsStats.monthPageViews.toLocaleString() }}
                    </div>
                    <div class="text-xs text-green-600/70 dark:text-green-400/70 mt-1">page views</div>
                  </div>

                  <!-- All Time -->
                  <div class="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-700">
                    <div class="flex items-center gap-2 mb-2">
                      <svg class="text-orange-600 dark:text-orange-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                      <div class="text-sm font-medium text-orange-900 dark:text-orange-100">All Time</div>
                    </div>
                    <div class="text-3xl font-bold text-orange-600 dark:text-orange-400">
                      {{ analyticsStats.totalPageViews.toLocaleString() }}
                    </div>
                    <div class="text-xs text-orange-600/70 dark:text-orange-400/70 mt-1">total page views</div>
                  </div>

                  <!-- Total Prayers -->
                  <div class="bg-rose-50 dark:bg-rose-900/20 rounded-lg p-4 border border-rose-200 dark:border-rose-700">
                    <div class="flex items-center gap-2 mb-2">
                      <svg class="text-rose-600 dark:text-rose-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                      </svg>
                      <div class="text-sm font-medium text-rose-900 dark:text-rose-100">Total Prayers</div>
                    </div>
                    <div class="text-3xl font-bold text-rose-600 dark:text-rose-400">
                      {{ analyticsStats.totalPrayers.toLocaleString() }}
                    </div>
                    <div class="text-xs text-rose-600/70 dark:text-rose-400/70 mt-1">in database</div>
                  </div>

                  <!-- Subscribers -->
                  <div class="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-4 border border-cyan-200 dark:border-cyan-700">
                    <div class="flex items-center gap-2 mb-2">
                      <svg class="text-cyan-600 dark:text-cyan-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <polyline points="17 11 19 13 23 9"></polyline>
                      </svg>
                      <div class="text-sm font-medium text-cyan-900 dark:text-cyan-100">Subscribers</div>
                    </div>
                    <div class="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
                      {{ analyticsStats.totalSubscribers.toLocaleString() }}
                    </div>
                    <div class="text-xs text-cyan-600/70 dark:text-cyan-400/70 mt-1">email subscribers</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Other Settings Tabs Placeholder -->
            <div *ngIf="activeSettingsTab === 'content'" class="space-y-6">
              <div class="mb-4">
                <app-branding (onSave)="handleBrandingSave()"></app-branding>
              </div>
              <div class="mb-4">
                <app-prompt-manager (onSave)="handlePromptManagerSave()"></app-prompt-manager>
              </div>
              <div class="mb-4">
                <app-prayer-types-manager (onSave)="handlePrayerTypesManagerSave()"></app-prayer-types-manager>
              </div>
            </div>

            <div *ngIf="activeSettingsTab === 'email'" class="space-y-6">
              <div class="mb-4">
                <app-email-settings (onSave)="handleEmailSettingsSave()"></app-email-settings>
              </div>
            </div>

            <div *ngIf="activeSettingsTab === 'users'" class="space-y-6">
              <div class="mb-4">
                <app-admin-user-management (onSave)="handleUserManagementSave()"></app-admin-user-management>
              </div>
            </div>

            <!-- Tools Tab -->
            <div *ngIf="activeSettingsTab === 'tools'" class="space-y-6">
              <div class="mb-4">
                <app-prayer-search></app-prayer-search>
              </div>
              <div class="mb-4">
                <app-backup-status></app-backup-status>
              </div>
            </div>

            <!-- Timeouts Tab -->
            <div *ngIf="activeSettingsTab === 'timeouts'" class="space-y-6">
              <div class="mb-4">
                <app-session-timeout-settings></app-session-timeout-settings>
              </div>
            </div>

            <div *ngIf="activeSettingsTab !== 'analytics' && activeSettingsTab !== 'content' && activeSettingsTab !== 'email' && activeSettingsTab !== 'users' && activeSettingsTab !== 'tools' && activeSettingsTab !== 'timeouts'" class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
              <h3 class="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                {{ activeSettingsTab | titlecase }} Settings
              </h3>
              <p class="text-gray-500 dark:text-gray-400">
                This section is being built. Check back soon!
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: []
})
export class AdminComponent implements OnInit, OnDestroy {
  activeTab: AdminTab = 'prayers';
  activeSettingsTab: SettingsTab = 'analytics';
  adminData: any = null;
  analyticsStats: AnalyticsStats = {
    todayPageViews: 0,
    weekPageViews: 0,
    monthPageViews: 0,
    totalPageViews: 0,
    totalPrayers: 0,
    totalSubscribers: 0,
    loading: false
  };
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private adminDataService: AdminDataService,
    private analyticsService: AnalyticsService,
    private adminAuthService: AdminAuthService
  ) {}

  /**
   * Track user activity to prevent inactivity timeout
   * Records activity on mouse clicks, keyboard input, and touch events
   */
  @HostListener('document:click')
  @HostListener('document:keypress')
  @HostListener('document:mousemove')
  @HostListener('document:touchstart')
  recordActivity(): void {
    this.adminAuthService.recordActivity();
  }

  ngOnInit() {
    // Subscribe to admin data
    this.adminDataService.data$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.adminData = data;
      });

    // Initial fetch
    this.adminDataService.fetchAdminData();
    
    // Load analytics if settings tab is already active
    if (this.activeTab === 'settings' && this.activeSettingsTab === 'analytics') {
      this.loadAnalytics();
    }
  }

  async loadAnalytics() {
    this.analyticsStats.loading = true;
    try {
      this.analyticsStats = await this.analyticsService.getStats();
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      this.analyticsStats.loading = false;
    }
  }

  onTabChange(tab: AdminTab) {
    this.activeTab = tab;
    if (tab === 'settings' && this.activeSettingsTab === 'analytics' && this.analyticsStats.totalPageViews === 0) {
      this.loadAnalytics();
    }
  }

  onSettingsTabChange(tab: SettingsTab) {
    this.activeSettingsTab = tab;
    if (tab === 'analytics' && this.analyticsStats.totalPageViews === 0) {
      this.loadAnalytics();
    }
  }

  handleBrandingSave() {
    // Could refresh data or show notification
    console.log('Branding settings saved');
  }

  handlePromptManagerSave() {
    // Could refresh data or show notification
    console.log('Prompt manager action completed');
  }

  handlePrayerTypesManagerSave() {
    // Could refresh data or show notification
    console.log('Prayer types manager action completed');
  }

  handleEmailSettingsSave() {
    // Could refresh data or show notification
    console.log('Email settings saved');
  }

  handleUserManagementSave() {
    // Could refresh data or show notification
    console.log('User management action completed');
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get totalPendingCount(): number {
    if (!this.adminData) return 0;
    return (this.adminData.pendingPrayers?.length || 0) +
           (this.adminData.pendingUpdates?.length || 0) +
           (this.adminData.pendingDeletionRequests?.length || 0) +
           (this.adminData.pendingUpdateDeletionRequests?.length || 0) +
           (this.adminData.pendingPreferenceChanges?.length || 0);
  }

  goToHome() {
    this.router.navigate(['/']);
  }

  refresh() {
    this.adminDataService.refresh();
  }

  async approvePrayer(id: string) {
    try {
      await this.adminDataService.approvePrayer(id);
    } catch (error) {
      console.error('Error approving prayer:', error);
    }
  }

  async denyPrayer(id: string, reason: string) {
    try {
      await this.adminDataService.denyPrayer(id, reason);
    } catch (error) {
      console.error('Error denying prayer:', error);
    }
  }

  async editPrayer(id: string, updates: any) {
    try {
      await this.adminDataService.editPrayer(id, updates);
    } catch (error) {
      console.error('Error editing prayer:', error);
    }
  }

  async approveUpdate(id: string) {
    try {
      await this.adminDataService.approveUpdate(id);
    } catch (error) {
      console.error('Error approving update:', error);
    }
  }

  async denyUpdate(id: string, reason: string) {
    try {
      await this.adminDataService.denyUpdate(id, reason);
    } catch (error) {
      console.error('Error denying update:', error);
    }
  }

  async editUpdate(id: string, updates: any) {
    try {
      await this.adminDataService.editUpdate(id, updates);
    } catch (error) {
      console.error('Error editing update:', error);
    }
  }

  async approveDeletionRequest(id: string) {
    try {
      await this.adminDataService.approveDeletionRequest(id);
    } catch (error) {
      console.error('Error approving deletion request:', error);
    }
  }

  async denyDeletionRequest(id: string, reason: string) {
    try {
      await this.adminDataService.denyDeletionRequest(id, reason);
    } catch (error) {
      console.error('Error denying deletion request:', error);
    }
  }

  async approveUpdateDeletionRequest(id: string) {
    try {
      await this.adminDataService.approveUpdateDeletionRequest(id);
    } catch (error) {
      console.error('Error approving update deletion request:', error);
    }
  }

  async denyUpdateDeletionRequest(id: string, reason: string) {
    try {
      await this.adminDataService.denyUpdateDeletionRequest(id, reason);
    } catch (error) {
      console.error('Error denying update deletion request:', error);
    }
  }

  async approvePreferenceChange(id: string) {
    try {
      await this.adminDataService.approvePreferenceChange(id);
    } catch (error) {
      console.error('Error approving preference change:', error);
    }
  }

  async denyPreferenceChange(id: string, reason: string) {
    try {
      await this.adminDataService.denyPreferenceChange(id, reason);
    } catch (error) {
      console.error('Error denying preference change:', error);
    }
  }
}
