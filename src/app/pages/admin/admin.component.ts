import { Component, OnInit, OnDestroy, HostListener, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AdminDataService } from '../../services/admin-data.service';
import { AdminAuthService } from '../../services/admin-auth.service';
import { UserSessionService } from '../../services/user-session.service';
import { AnalyticsService, AnalyticsStats } from '../../services/analytics.service';
import { PendingPrayerCardComponent } from '../../components/pending-prayer-card/pending-prayer-card.component';
import { PendingUpdateCardComponent } from '../../components/pending-update-card/pending-update-card.component';
import { PendingDeletionCardComponent } from '../../components/pending-deletion-card/pending-deletion-card.component';
import { PendingUpdateDeletionCardComponent } from '../../components/pending-update-deletion-card/pending-update-deletion-card.component';
import { PendingAccountApprovalCardComponent } from '../../components/pending-account-approval-card/pending-account-approval-card.component';
import { SendNotificationDialogComponent, type NotificationType } from '../../components/send-notification-dialog/send-notification-dialog.component';
import { AppBrandingComponent } from '../../components/app-branding/app-branding.component';
import { PromptManagerComponent } from '../../components/prompt-manager/prompt-manager.component';
import { PrayerTypesManagerComponent } from '../../components/prayer-types-manager/prayer-types-manager.component';
import { EmailSettingsComponent } from '../../components/email-settings/email-settings.component';
import { AdminUserManagementComponent } from '../../components/admin-user-management/admin-user-management.component';
import { PrayerSearchComponent } from '../../components/prayer-search/prayer-search.component';
import { PrayerArchiveTimelineComponent } from '../../components/prayer-archive-timeline/prayer-archive-timeline.component';
import { BackupStatusComponent } from '../../components/backup-status/backup-status.component';
import { SecurityPolicySettingsComponent } from '../../components/security-policy-settings/security-policy-settings.component';
import { EmailVerificationSettingsComponent } from '../../components/email-verification-settings/email-verification-settings.component';
import { GitHubSettingsComponent } from '../../components/github-settings/github-settings.component';
import { PlanningCenterListMapperComponent } from '../../components/planning-center-list-mapper/planning-center-list-mapper.component';
import { ConfirmationDialogComponent } from '../../components/confirmation-dialog/confirmation-dialog.component';

type AdminTab = 'prayers' | 'updates' | 'deletions' | 'accounts' | 'settings';
type SettingsTab = 'analytics' | 'email' | 'content' | 'tools' | 'security';

@Component({
  selector: 'app-admin',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    PendingPrayerCardComponent,
    PendingUpdateCardComponent,
    PendingDeletionCardComponent,
    PendingUpdateDeletionCardComponent,
    PendingAccountApprovalCardComponent,
    SendNotificationDialogComponent,
    AppBrandingComponent,
    PromptManagerComponent,
    PrayerTypesManagerComponent,
    EmailSettingsComponent,
    AdminUserManagementComponent,
    PrayerSearchComponent,
    PrayerArchiveTimelineComponent,
    BackupStatusComponent,
    SecurityPolicySettingsComponent,
    EmailVerificationSettingsComponent,
    GitHubSettingsComponent,
    PlanningCenterListMapperComponent,
    ConfirmationDialogComponent
  ],
  template: `
    <div class="w-full min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors flex flex-col">
      <!-- Header -->
      <header class="w-full bg-white dark:bg-gray-800 shadow-md border-b border-gray-200 dark:border-gray-700">
        <div class="max-w-6xl mx-auto w-full px-4 py-6">
          <div class="flex items-start justify-between gap-4">
            <!-- Left side: Logo and title -->
            <div class="flex items-center gap-3">
              <svg class="text-red-600 dark:text-red-400" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              <div>
                <h1 class="text-2xl font-bold text-gray-800 dark:text-gray-100">Admin Portal</h1>
                <p class="text-gray-600 dark:text-gray-300">Manage prayer requests and updates</p>
              </div>
            </div>
            
            <!-- Right side: Email indicator and navigation controls -->
            <div class="flex flex-col items-end gap-2">
              <!-- Email Indicator -->
              @if ((userSessionService.userSession$ | async); as session) {
                <button
                  (click)="showLogoutConfirmation = true"
                  class="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 px-2 py-1 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/40 transition-colors cursor-pointer"
                  title="Click to log out"
                >
                  {{ session.email }}
                </button>
              } @else {
                <button
                  (click)="showLogoutConfirmation = true"
                  class="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 px-2 py-1 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/40 transition-colors cursor-pointer"
                  title="Click to log out"
                >
                  {{ getAdminEmail() }}
                </button>
              }
              
              <!-- Navigation Controls -->
              <button
                (click)="goToHome()"
                class="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-900 transition-colors text-sm"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="19" y1="12" x2="5" y2="12"></line>
                  <polyline points="12 19 5 12 12 5"></polyline>
                </svg>
                Main Site
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- Content -->
      <main class="w-full max-w-6xl mx-auto px-4 py-6">
        <!-- Stats Grid -->
        <div class="grid grid-cols-5 sm:grid-cols-5 gap-2 sm:gap-4 mb-8">
          <button
            (click)="onTabChange('prayers')"
            [class]="'bg-white dark:bg-gray-800 rounded-lg shadow-md p-1 sm:p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 flex flex-col justify-between ' + (activeTab === 'prayers' ? 'ring-2 ring-blue-500' : '')"
          >
            <div class="text-center self-start w-full">
              <div class="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400">
                {{ adminData?.pendingPrayers?.length || 0 }}
              </div>
            </div>
            <div class="text-xs sm:text-sm text-gray-600 dark:text-gray-400"><span class="hidden lg:inline">Pending </span>Prayers</div>
          </button>

          <button
            (click)="onTabChange('updates')"
            [class]="'bg-white dark:bg-gray-800 rounded-lg shadow-md p-1 sm:p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 flex flex-col justify-between ' + (activeTab === 'updates' ? 'ring-2 ring-blue-500' : '')"
          >
            <div class="text-center self-start w-full">
              <div class="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                {{ adminData?.pendingUpdates?.length || 0 }}
              </div>
            </div>
            <div class="text-xs sm:text-sm text-gray-600 dark:text-gray-400"><span class="hidden lg:inline">Pending </span>Updates</div>
          </button>

          <button
            (click)="onTabChange('deletions')"
            [class]="'bg-white dark:bg-gray-800 rounded-lg shadow-md p-1 sm:p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 flex flex-col justify-between ' + (activeTab === 'deletions' ? 'ring-2 ring-blue-500' : '')"
          >
            <div class="text-center self-start w-full">
              <div class="text-lg sm:text-2xl font-bold text-red-600 dark:text-red-400">
                {{ (adminData?.pendingDeletionRequests?.length || 0) + (adminData?.pendingUpdateDeletionRequests?.length || 0) }}
              </div>
            </div>
            <div class="text-xs sm:text-sm text-gray-600 dark:text-gray-400"><span class="hidden lg:inline">Pending </span>Deletions</div>
          </button>

          <button
            (click)="onTabChange('accounts')"
            [class]="'bg-white dark:bg-gray-800 rounded-lg shadow-md p-1 sm:p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 flex flex-col justify-between ' + (activeTab === 'accounts' ? 'ring-2 ring-blue-500' : '')"
          >
            <div class="text-center self-start w-full">
              <div class="text-lg sm:text-2xl font-bold text-amber-600 dark:text-amber-400">
                {{ adminData?.pendingAccountRequests?.length || 0 }}
              </div>
            </div>
            <div class="text-xs sm:text-sm text-gray-600 dark:text-gray-400"><span class="hidden lg:inline">Pending </span>Accounts</div>
          </button>

          <button
            (click)="onTabChange('settings')"
            [class]="'bg-white dark:bg-gray-800 rounded-lg shadow-md p-1 sm:p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 flex flex-col justify-between ' + (activeTab === 'settings' ? 'ring-2 ring-blue-500' : '')"
          >
            <div class="text-center self-start w-full">
              <svg class="w-4 sm:w-6 h-4 sm:h-6 mx-auto text-gray-600 dark:text-gray-400 translate-y-2 sm:translate-y-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </div>
            <div class="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Settings</div>
          </button>
        </div>

        <!-- Alert for pending items -->
        @if (totalPendingCount > 0) {
          <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4 mb-6">
            <div class="flex items-center gap-2">
              <svg class="text-green-600 dark:text-green-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                <line x1="12" y1="9" x2="12" y2="13"></line>
                <line x1="12" y1="17" x2="12.01" y2="17"></line>
              </svg>
              <p class="text-green-800 dark:text-green-200">
                You have {{ totalPendingCount }} items pending approval.
              </p>
            </div>
          </div>
        }

        <!-- Loading State -->
        @if (adminData?.loading) {
          <div class="text-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p class="text-gray-600 dark:text-gray-400 mt-4">Loading admin data...</p>
          </div>
        }

        <!-- Error State -->
        @if (adminData?.error) {
          <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4 mb-6">
            <p class="text-red-800 dark:text-red-200">{{ adminData.error }}</p>
            <button 
              (click)="refresh()"
              class="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        }

        <!-- Tab Content -->
        @if (!adminData?.loading && !adminData?.error) {
          <!-- Prayers Tab -->
          @if (activeTab === 'prayers') {
            <div>
              <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">
                Pending Prayer Requests ({{ adminData?.pendingPrayers?.length || 0 }})
              </h2>
              
              @if ((adminData?.pendingPrayers?.length || 0) === 0) {
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
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
              }

              <div class="space-y-6">
                @for (prayer of adminData?.pendingPrayers; track trackByPrayerId($index, prayer)) {
                  <app-pending-prayer-card
                    [prayer]="prayer"
                    (approve)="approvePrayer($event)"
                    (deny)="denyPrayer($event.id, $event.reason)"
                    (edit)="editPrayer($event.id, $event.updates)"
                  ></app-pending-prayer-card>
                }
              </div>
            </div>
          }

          <!-- Updates Tab -->
          @if (activeTab === 'updates') {
            <div>
              <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">
                Pending Prayer Updates ({{ adminData?.pendingUpdates?.length || 0 }})
              </h2>
              
              @if ((adminData?.pendingUpdates?.length || 0) === 0) {
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
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
              }

              <div class="space-y-6">
                @for (update of adminData?.pendingUpdates; track trackByUpdateId($index, update)) {
                  <app-pending-update-card
                    [update]="update"
                    (approve)="approveUpdate($event)"
                    (deny)="denyUpdate($event.id, $event.reason)"
                    (edit)="editUpdate($event.id, $event.updates)"
                  ></app-pending-update-card>
                }
              </div>
            </div>
          }

          <!-- Deletions Tab -->
          @if (activeTab === 'deletions') {
            <div>
              <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">
                Pending Deletion Requests ({{ (adminData?.pendingDeletionRequests?.length || 0) + (adminData?.pendingUpdateDeletionRequests?.length || 0) }})
              </h2>
              
              @if ((adminData?.pendingDeletionRequests?.length || 0) === 0 && (adminData?.pendingUpdateDeletionRequests?.length || 0) === 0) {
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
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
              }
              
              @if ((adminData?.pendingDeletionRequests?.length || 0) > 0 || (adminData?.pendingUpdateDeletionRequests?.length || 0) > 0) {
                <div class="space-y-6">
                  <!-- Prayer Deletions -->
                  @if ((adminData?.pendingDeletionRequests?.length || 0) > 0) {
                    <div>
                      <h3 class="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">
                        Prayer Deletions ({{ adminData?.pendingDeletionRequests?.length || 0 }})
                      </h3>

                      <div class="space-y-6">
                        @for (request of adminData?.pendingDeletionRequests; track trackByDeletionRequestId($index, request)) {
                          <app-pending-deletion-card
                            [deletionRequest]="request"
                            (approve)="approveDeletionRequest($event)"
                            (deny)="denyDeletionRequest($event.id, $event.reason)"
                          ></app-pending-deletion-card>
                        }
                      </div>
                    </div>
                  }

                  <!-- Update Deletions -->
                  @if ((adminData?.pendingUpdateDeletionRequests?.length || 0) > 0) {
                    <div>
                      <h3 class="text-lg font-medium text-gray-800 dark:text-gray-100 mb-4">
                        Update Deletions ({{ adminData?.pendingUpdateDeletionRequests?.length || 0 }})
                      </h3>
                      
                      <div class="space-y-6">
                        @for (request of adminData?.pendingUpdateDeletionRequests; track trackByDeletionRequestId($index, request)) {
                          <app-pending-update-deletion-card
                            [deletionRequest]="request"
                            (approve)="approveUpdateDeletionRequest($event)"
                            (deny)="denyUpdateDeletionRequest($event.id, $event.reason)"
                          ></app-pending-update-deletion-card>
                        }
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          }

          <!-- Accounts Tab -->
          @if (activeTab === 'accounts') {
            <div>
              <h2 class="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-6">
                Pending Account Approvals ({{ adminData?.pendingAccountRequests?.length || 0 }})
              </h2>

              @if ((adminData?.pendingAccountRequests?.length || 0) === 0) {
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
                  <svg class="mx-auto mb-4 text-gray-400 dark:text-gray-500" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  <h3 class="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                    No pending account approval requests
                  </h3>
                  <p class="text-gray-500 dark:text-gray-400">
                    All account requests have been reviewed.
                  </p>
                </div>
              }

              <div class="space-y-6">
                @for (request of adminData?.pendingAccountRequests; track trackByAccountRequestId($index, request)) {
                  <app-pending-account-approval-card
                    [request]="request"
                    (approve)="approveAccountRequest($event)"
                    (deny)="denyAccountRequest($event.id, $event.reason)"
                  ></app-pending-account-approval-card>
                }
              </div>
            </div>
          }

          <!-- Settings Tab -->
          @if (activeTab === 'settings') {
            <div>
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
                (click)="onSettingsTabChange('tools')"
                [class]="'px-4 py-2 font-medium rounded-t-lg transition-colors flex items-center gap-2 ' + (activeSettingsTab === 'tools' ? 'bg-blue-600 text-white border-b-2 border-blue-600' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200')"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                </svg>
                Tools
              </button>
              <button
                (click)="onSettingsTabChange('security')"
                [class]="'px-4 py-2 font-medium rounded-t-lg transition-colors flex items-center gap-2 ' + (activeSettingsTab === 'security' ? 'bg-blue-600 text-white border-b-2 border-blue-600' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200')"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                Security
              </button>
            </div>

            <!-- Analytics Tab -->
            @if (activeSettingsTab === 'analytics') {
              <div class="space-y-6">
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
                  
                  @if (analyticsStats.loading) {
                    <div class="text-center py-4">
                      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    </div>
                  }

                  @if (!analyticsStats.loading) {
                    <div class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
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

                  <!-- This Year -->
                  <div class="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-700">
                    <div class="flex items-center gap-2 mb-2">
                      <svg class="text-indigo-600 dark:text-indigo-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="9"></circle>
                        <polyline points="12 7 12 12 16 14"></polyline>
                      </svg>
                      <div class="text-sm font-medium text-indigo-900 dark:text-indigo-100">This Year</div>
                    </div>
                    <div class="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                      {{ analyticsStats.yearPageViews.toLocaleString() }}
                    </div>
                    <div class="text-xs text-indigo-600/70 dark:text-indigo-400/70 mt-1">page views</div>
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

                  <!-- Current Prayers -->
                  <div class="bg-teal-50 dark:bg-teal-900/20 rounded-lg p-4 border border-teal-200 dark:border-teal-700">
                    <div class="flex items-center gap-2 mb-2">
                      <svg class="text-teal-600 dark:text-teal-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 11l3 3L22 4"></path>
                        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <div class="text-sm font-medium text-teal-900 dark:text-teal-100">Current</div>
                    </div>
                    <div class="text-3xl font-bold text-teal-600 dark:text-teal-400">
                      {{ analyticsStats.currentPrayers.toLocaleString() }}
                    </div>
                    <div class="text-xs text-teal-600/70 dark:text-teal-400/70 mt-1">active prayers</div>
                  </div>

                  <!-- Answered Prayers -->
                  <div class="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-700">
                    <div class="flex items-center gap-2 mb-2">
                      <svg class="text-emerald-600 dark:text-emerald-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <div class="text-sm font-medium text-emerald-900 dark:text-emerald-100">Answered</div>
                    </div>
                    <div class="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                      {{ analyticsStats.answeredPrayers.toLocaleString() }}
                    </div>
                    <div class="text-xs text-emerald-600/70 dark:text-emerald-400/70 mt-1">answered prayers</div>
                  </div>

                  <!-- Archived Prayers -->
                  <div class="bg-[#C9A961] bg-opacity-15 dark:bg-opacity-25 rounded-lg p-4 border border-[#C9A961]">
                    <div class="flex items-center gap-2 mb-2">
                      <svg class="text-[#6B5D45] dark:text-[#D4AF85]" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="5" width="18" height="16" rx="2"></rect>
                        <path d="M7 15h10"></path>
                        <path d="M7 7h10"></path>
                      </svg>
                      <div class="text-sm font-medium text-[#6B5D45] dark:text-[#D4AF85]">Archived</div>
                    </div>
                    <div class="text-3xl font-bold text-[#6B5D45] dark:text-[#D4AF85]">
                      {{ analyticsStats.archivedPrayers.toLocaleString() }}
                    </div>
                    <div class="text-xs text-[#6B5D45] dark:text-[#D4AF85] mt-1 opacity-70">archived prayers</div>
                  </div>

                  <!-- Email Subscribers -->
                  <div class="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-4 border border-cyan-200 dark:border-cyan-700">
                    <div class="flex items-center gap-2 mb-2">
                      <svg class="text-cyan-600 dark:text-cyan-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <polyline points="17 11 19 13 23 9"></polyline>
                      </svg>
                      <div class="text-sm font-medium text-cyan-900 dark:text-cyan-100">Email Subscribers</div>
                    </div>
                    <div class="text-3xl font-bold text-cyan-600 dark:text-cyan-400">
                      {{ analyticsStats.totalSubscribers.toLocaleString() }}
                    </div>
                    <div class="text-xs text-cyan-600/70 dark:text-cyan-400/70 mt-1">total email subscribers</div>
                  </div>

                  <!-- Active Email Subscribers -->
                  <div class="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-700">
                    <div class="flex items-center gap-2 mb-2">
                      <svg class="text-amber-600 dark:text-amber-400" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                      </svg>
                      <div class="text-sm font-medium text-amber-900 dark:text-amber-100">Active Email Subscribers</div>
                    </div>
                    <div class="text-3xl font-bold text-amber-600 dark:text-amber-400">
                      {{ analyticsStats.activeEmailSubscribers.toLocaleString() }}
                    </div>
                    <div class="text-xs text-amber-600/70 dark:text-amber-400/70 mt-1">active email subscribers</div>
                  </div>
                </div>
              }
                </div>
              </div>
            }

            <!-- Other Settings Tabs Placeholder -->
            @if (activeSettingsTab === 'content') {
              <div class="space-y-6">
                <div class="mb-4">
                  <app-github-settings></app-github-settings>
                </div>
                <div class="mb-4">
                  <app-branding></app-branding>
                </div>
                <div class="mb-4">
                  <app-prompt-manager></app-prompt-manager>
                </div>
                <div class="mb-4">
                <app-prayer-types-manager></app-prayer-types-manager>
              </div>
                <div class="mb-4">
                  <app-planning-center-list-mapper></app-planning-center-list-mapper>
                </div>
              </div>
            }

            @if (activeSettingsTab === 'email') {
              <div class="space-y-6">
                <div class="mb-4">
                  <app-email-settings></app-email-settings>
                </div>
              </div>
            }

            <!-- Tools Tab -->
            @if (activeSettingsTab === 'tools') {
              <div class="space-y-6">
                <div class="mb-4">
                  <app-prayer-search></app-prayer-search>
                </div>
                <div class="mb-4">
                  <app-prayer-archive-timeline></app-prayer-archive-timeline>
                </div>
                <div class="mb-4">
                  <app-backup-status></app-backup-status>
                </div>
              </div>
            }

            <!-- Security Tab -->
            @if (activeSettingsTab === 'security') {
              <div>
                <div class="mb-4">
                  <app-admin-user-management></app-admin-user-management>
                </div>
                <div class="mb-4">
                  <app-email-verification-settings></app-email-verification-settings>
                </div>
                <div class="mb-4">
                  <app-security-policy-settings></app-security-policy-settings>
                </div>
              </div>
            }

            @if (activeSettingsTab !== 'analytics' && activeSettingsTab !== 'content' && activeSettingsTab !== 'email' && activeSettingsTab !== 'tools' && activeSettingsTab !== 'security') {
              <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
                <h3 class="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                  {{ activeSettingsTab | titlecase }} Settings
                </h3>
                <p class="text-gray-500 dark:text-gray-400">
                  This section is being built. Check back soon!
                </p>
              </div>
            }
            </div>
          }
        }
      </main>

      <!-- Send Notification Dialog -->
      @if (showSendNotificationDialog) {
        <app-send-notification-dialog
          [notificationType]="sendDialogType"
          [prayerTitle]="sendDialogPrayerTitle"
          (confirm)="onConfirmSendNotification()"
          (decline)="onDeclineSendNotification()"
        ></app-send-notification-dialog>
      }

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
    yearPageViews: 0,
    totalPageViews: 0,
    totalPrayers: 0,
    currentPrayers: 0,
    answeredPrayers: 0,
    archivedPrayers: 0,
    totalSubscribers: 0,
    activeEmailSubscribers: 0,
    loading: false
  };

  // Dialog state for send notification
  showSendNotificationDialog = false;
  showLogoutConfirmation = false;
  sendDialogType: NotificationType = 'prayer';
  sendDialogPrayerTitle?: string;
  sendDialogPrayerId?: string;
  sendDialogUpdateId?: string;
  
  private destroy$ = new Subject<void>();
  private hasFetchStarted = false;

  constructor(
    private router: Router,
    private adminDataService: AdminDataService,
    private analyticsService: AnalyticsService,
    public adminAuthService: AdminAuthService,
    public userSessionService: UserSessionService,
    public cdr: ChangeDetectorRef
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
        this.cdr.markForCheck();
        
        // Set initial tab based on pending items (only if still on default and data is loaded)
        // We skip the initial empty state by checking hasFetchStarted
        if (this.activeTab === 'prayers' && this.hasFetchStarted && !data.loading) {
          this.setInitialTab();
        }
        
        // Auto-progress through tabs when each section is complete
        // Only run this when we have valid data (fetch started and not loading)
        if (this.hasFetchStarted && !data.loading) {
          this.autoProgressTabs();
        }
      });

    // Initial fetch
    this.hasFetchStarted = true;
    this.adminDataService.fetchAdminData();
    
    // Load analytics if settings tab is already active
    if (this.activeTab === 'settings' && this.activeSettingsTab === 'analytics') {
      this.loadAnalytics();
    }
  }

  /**
   * Determine which tab should be initially active based on pending items
   * Priority order: prayers -> updates -> deletions -> accounts
   */
  private setInitialTab() {
    if (!this.adminData) return;

    const hasPendingPrayers = (this.adminData.pendingPrayers || []).length > 0;
    const hasPendingUpdates = (this.adminData.pendingUpdates || []).length > 0;
    const hasPendingDeletions = (this.adminData.pendingDeletionRequests || []).length > 0 || 
                               (this.adminData.pendingUpdateDeletionRequests || []).length > 0;
    const hasPendingAccounts = (this.adminData.pendingAccountRequests || []).length > 0;

    // Set tab based on priority
    if (hasPendingPrayers) {
      this.onTabChange('prayers');
    } else if (hasPendingUpdates) {
      this.onTabChange('updates');
    } else if (hasPendingDeletions) {
      this.onTabChange('deletions');
    } else if (hasPendingAccounts) {
      this.onTabChange('accounts');
    } else {
      // If nothing is pending, default to settings
      this.onTabChange('settings');
    }
  }

  /**
   * Auto-progress through approval tabs when each section is complete
   * Priority order: prayers -> updates -> deletions -> accounts -> settings
   */
  private autoProgressTabs() {
    if (!this.adminData) return;

    // Helper to check for any pending items
    const hasPendingPrayers = (this.adminData.pendingPrayers || []).length > 0;
    const hasPendingUpdates = (this.adminData.pendingUpdates || []).length > 0;
    const hasPendingDeletions = (this.adminData.pendingDeletionRequests || []).length > 0 || 
                               (this.adminData.pendingUpdateDeletionRequests || []).length > 0;
    const hasPendingAccounts = (this.adminData.pendingAccountRequests || []).length > 0;
    const hasAnyPending = hasPendingPrayers || hasPendingUpdates || hasPendingDeletions || hasPendingAccounts;

    // If nothing pending at all, go to settings
    if (!hasAnyPending) {
      if (this.activeTab !== 'settings') {
        this.onTabChange('settings');
      }
      return;
    }

    // If on prayers tab, check if all prayers are done
    if (this.activeTab === 'prayers') {
      if (!hasPendingPrayers) {
        // Move to updates if there are any
        if (hasPendingUpdates) {
          this.onTabChange('updates');
        } else if (hasPendingDeletions) {
          // Move to deletions if there are any
          this.onTabChange('deletions');
        } else if (hasPendingAccounts) {
          // Move to accounts if there are any
          this.onTabChange('accounts');
        } else {
          // Nothing pending anywhere
          this.onTabChange('settings');
        }
      }
    }
    // If on updates tab, check if all updates are done
    else if (this.activeTab === 'updates') {
      if (!hasPendingUpdates) {
        // Move to deletions if there are any
        if (hasPendingDeletions) {
          this.onTabChange('deletions');
        } else if (hasPendingAccounts) {
          // Move to accounts if there are any
          this.onTabChange('accounts');
        } else if (hasPendingPrayers) {
          // Cycle back to prayers if any exist
          this.onTabChange('prayers');
        } else {
          // Nothing pending anywhere
          this.onTabChange('settings');
        }
      }
    }
    // If on deletions tab, check if all deletions are done
    else if (this.activeTab === 'deletions') {
      if (!hasPendingDeletions) {
        // Move to accounts if there are any
        if (hasPendingAccounts) {
          this.onTabChange('accounts');
        } else if (hasPendingPrayers) {
          // Cycle back to prayers if any exist
          this.onTabChange('prayers');
        } else if (hasPendingUpdates) {
          // Cycle to updates if any exist
          this.onTabChange('updates');
        } else {
          // Nothing pending anywhere
          this.onTabChange('settings');
        }
      }
    }
    // If on accounts tab, check if all accounts are done
    else if (this.activeTab === 'accounts') {
      if (!hasPendingAccounts) {
        if (hasPendingPrayers) {
          this.onTabChange('prayers');
        } else if (hasPendingUpdates) {
          this.onTabChange('updates');
        } else if (hasPendingDeletions) {
          this.onTabChange('deletions');
        } else {
          // Nothing pending anywhere
          this.onTabChange('settings');
        }
      }
    }
  }

  async loadAnalytics() {
    this.analyticsStats.loading = true;
    this.cdr.markForCheck();
    try {
      this.analyticsStats = await this.analyticsService.getStats();
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      this.analyticsStats.loading = false;
      this.cdr.markForCheck();
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
           (this.adminData.pendingAccountRequests?.length || 0);
  }

  goToHome() {
    this.router.navigate(['/']);
  }

  async handleLogout(): Promise<void> {
    this.showLogoutConfirmation = false;
    await this.adminAuthService.logout();
    this.router.navigate(['/login']);
  }

  refresh() {
    this.adminDataService.refresh();
  }

  async approvePrayer(id: string) {
    try {
      await this.adminDataService.approvePrayer(id);
      this.autoProgressTabs();
      // Show dialog asking if they want to send notification
      this.sendDialogPrayerId = id;
      // Get the prayer title from current data
      const prayer = this.adminData?.pendingPrayers?.find((p: any) => p.id === id);
      if (prayer) {
        this.sendDialogPrayerTitle = prayer.title;
      }
      this.sendDialogType = 'prayer';
      this.showSendNotificationDialog = true;
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error approving prayer:', error);
    }
  }

  async denyPrayer(id: string, reason: string) {
    try {
      await this.adminDataService.denyPrayer(id, reason);
      this.autoProgressTabs();
    } catch (error) {
      console.error('Error denying prayer:', error);
    }
  }

  async editPrayer(id: string, updates: any) {
    try {
      // First save the prayer
      await this.adminDataService.editPrayer(id, updates);
      // Then show the dialog asking if they want to send notification
      this.sendDialogPrayerId = id;
      // Get the prayer title - prefer the updated title if provided, otherwise get from current data
      let title = updates?.title;
      if (!title) {
        const prayer = this.adminData?.pendingPrayers?.find((p: any) => p.id === id);
        if (prayer) {
          title = prayer.title;
        }
      }
      this.sendDialogPrayerTitle = title;
      this.sendDialogType = 'prayer';
      this.showSendNotificationDialog = true;
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error editing prayer:', error);
    }
  }

  async approveUpdate(id: string) {
    try {
      await this.adminDataService.approveUpdate(id);
      this.autoProgressTabs();
      // Show dialog asking if they want to send notification
      this.sendDialogUpdateId = id;
      // Get the prayer title from current data
      const update = this.adminData?.pendingUpdates?.find((u: any) => u.id === id);
      if (update) {
        this.sendDialogPrayerTitle = update.prayer_title || update.prayers?.title;
      }
      this.sendDialogType = 'update';
      this.showSendNotificationDialog = true;
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error approving update:', error);
    }
  }

  async denyUpdate(id: string, reason: string) {
    try {
      await this.adminDataService.denyUpdate(id, reason);
      this.autoProgressTabs();
    } catch (error) {
      console.error('Error denying update:', error);
    }
  }

  async editUpdate(id: string, updates: any) {
    try {
      // First save the update
      await this.adminDataService.editUpdate(id, updates);
      // Then show the dialog asking if they want to send notification
      this.sendDialogUpdateId = id;
      // Get the prayer title - use the prayer_title if available, otherwise get from current data
      let title = updates?.prayer_title;
      if (!title) {
        const update = this.adminData?.pendingUpdates?.find((u: any) => u.id === id);
        if (update) {
          title = update.prayer_title || update.prayers?.title;
        }
      }
      this.sendDialogPrayerTitle = title;
      this.sendDialogType = 'update';
      this.showSendNotificationDialog = true;
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error editing update:', error);
    }
  }

  async approveDeletionRequest(id: string) {
    try {
      await this.adminDataService.approveDeletionRequest(id);
      this.autoProgressTabs();
    } catch (error) {
      console.error('Error approving deletion request:', error);
    }
  }

  async denyDeletionRequest(id: string, reason: string) {
    try {
      await this.adminDataService.denyDeletionRequest(id, reason);
      this.autoProgressTabs();
    } catch (error) {
      console.error('Error denying deletion request:', error);
    }
  }

  async approveUpdateDeletionRequest(id: string) {
    try {
      await this.adminDataService.approveUpdateDeletionRequest(id);
      this.autoProgressTabs();
    } catch (error) {
      console.error('Error approving update deletion request:', error);
    }
  }

  async denyUpdateDeletionRequest(id: string, reason: string) {
    try {
      await this.adminDataService.denyUpdateDeletionRequest(id, reason);
      this.autoProgressTabs();
    } catch (error) {
      console.error('Error denying update deletion request:', error);
    }
  }

  // TrackBy functions for ngFor optimization
  trackByPrayerId(index: number, prayer: any): string {
    return prayer.id;
  }

  trackByUpdateId(index: number, update: any): string {
    return update.id;
  }

  trackByDeletionRequestId(index: number, request: any): string {
    return request.id;
  }

  trackByAccountRequestId(index: number, request: any): string {
    return request.id;
  }

  async approveAccountRequest(requestId: string) {
    try {
      await this.adminDataService.approveAccountRequest(requestId);
      // Reload admin data - will automatically update via subscription
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error approving account request:', error);
    }
  }

  async denyAccountRequest(requestId: string, reason: string) {
    try {
      await this.adminDataService.denyAccountRequest(requestId, reason);
      // Reload admin data - will automatically update via subscription
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error denying account request:', error);
    }
  }

  async onConfirmSendNotification() {
    try {
      if (this.sendDialogType === 'prayer' && this.sendDialogPrayerId) {
        // Check if this is from approval or direct submission
        // If approved flag is set, use the approval email method
        const prayer = this.adminData?.pendingPrayers?.find((p: any) => p.id === this.sendDialogPrayerId);
        if (prayer?.approval_status === 'approved') {
          await this.adminDataService.sendApprovedPrayerEmails(this.sendDialogPrayerId);
        } else {
          // Otherwise use the submission email method
          await this.adminDataService.sendBroadcastNotificationForNewPrayer(this.sendDialogPrayerId);
        }
      } else if (this.sendDialogType === 'update' && this.sendDialogUpdateId) {
        // Check if this is from approval or direct submission
        const update = this.adminData?.pendingUpdates?.find((u: any) => u.id === this.sendDialogUpdateId);
        if (update?.approval_status === 'approved') {
          await this.adminDataService.sendApprovedUpdateEmails(this.sendDialogUpdateId);
        } else {
          // Otherwise use the submission email method
          await this.adminDataService.sendBroadcastNotificationForNewUpdate(this.sendDialogUpdateId);
        }
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    } finally {
      this.onDeclineSendNotification();
    }
  }

  onDeclineSendNotification() {
    this.showSendNotificationDialog = false;
    this.sendDialogPrayerId = undefined;
    this.sendDialogUpdateId = undefined;
    this.sendDialogPrayerTitle = undefined;
    this.cdr.markForCheck();
  }

  getAdminEmail(): string {
    // Get email from UserSessionService (cached from database)
    const session = this.userSessionService.getCurrentSession();
    return session?.email || '';
  }
}
