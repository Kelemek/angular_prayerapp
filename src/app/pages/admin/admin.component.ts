import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  NgZone,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AdminDataService } from '../../services/admin-data.service';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AnalyticsService, AnalyticsStats } from '../../services/analytics.service';
import { AdminPrayerApprovalComponent } from '../../components/admin-prayer-approval/admin-prayer-approval.component';
import { AdminUpdateApprovalComponent } from '../../components/admin-update-approval/admin-update-approval.component';
import { ConsolidatedPrayerApprovalComponent } from '../../components/consolidated-prayer-approval/consolidated-prayer-approval.component';
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
import { PrayerListBookletPrintComponent } from '../../components/prayer-list-booklet-print/prayer-list-booklet-print.component';
import { PrayerArchiveTimelineComponent } from '../../components/prayer-archive-timeline/prayer-archive-timeline.component';
import { BackupStatusComponent } from '../../components/backup-status/backup-status.component';
import { SecurityPolicySettingsComponent } from '../../components/security-policy-settings/security-policy-settings.component';
import { TestAccountSettingsComponent } from '../../components/test-account-settings/test-account-settings.component';
import { EmailVerificationSettingsComponent } from '../../components/email-verification-settings/email-verification-settings.component';
import { GitHubSettingsComponent } from '../../components/github-settings/github-settings.component';
import { PrayerEncouragementSettingsComponent } from '../../components/prayer-encouragement-settings/prayer-encouragement-settings.component';
import { RichTextEditorsSettingsComponent } from '../../components/rich-text-editors-settings/rich-text-editors-settings.component';
import { PlanningCenterListMapperComponent } from '../../components/planning-center-list-mapper/planning-center-list-mapper.component';
import { MemorizationRecommendationsManagerComponent } from '../../components/memorization-recommendations-manager/memorization-recommendations-manager.component';
import { MemorizationReciteSettingsComponent } from '../../components/memorization-recite-settings/memorization-recite-settings.component'; // @removal-recite
import { SiteAnalyticsActivityChartComponent } from '../../components/site-analytics-activity-chart/site-analytics-activity-chart.component';
import { AdminHelpModalComponent } from '../../components/admin-help-modal/admin-help-modal.component';
import { AdminHelpDriverTourService } from '../../services/admin-help-driver-tour.service';

type AdminTab = 'prayers' | 'updates' | 'deletions' | 'accounts' | 'settings';
type SettingsTab = 'analytics' | 'email' | 'content' | 'tools' | 'security';

@Component({
  selector: 'app-admin',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ConsolidatedPrayerApprovalComponent,
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
    PrayerListBookletPrintComponent,
    PrayerArchiveTimelineComponent,
    BackupStatusComponent,
    SecurityPolicySettingsComponent,
    TestAccountSettingsComponent,
    EmailVerificationSettingsComponent,
    GitHubSettingsComponent,
    PrayerEncouragementSettingsComponent,
    RichTextEditorsSettingsComponent,
    PlanningCenterListMapperComponent,
    MemorizationRecommendationsManagerComponent,
    MemorizationReciteSettingsComponent,
    SiteAnalyticsActivityChartComponent,
    AdminHelpModalComponent
  ],
  styles: `
    /* Safe area support for notched/dynamic island devices */
    :host {
      --safe-area-inset-top: env(safe-area-inset-top, 0px);
      --safe-area-inset-right: env(safe-area-inset-right, 0px);
      --safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
      --safe-area-inset-left: env(safe-area-inset-left, 0px);
    }

    .safe-area-container {
      padding-top: var(--safe-area-inset-top);
      padding-bottom: max(1.5rem, var(--safe-area-inset-bottom));
    }

    .safe-area-horizontal {
      padding-left: max(1rem, var(--safe-area-inset-left));
      padding-right: max(1rem, var(--safe-area-inset-right));
    }

    .safe-area-header {
      padding-left: max(1rem, var(--safe-area-inset-left));
      padding-right: max(1rem, var(--safe-area-inset-right));
    }
  `,
  template: `
    <div class="w-full min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors flex flex-col safe-area-container">
      <!-- Header -->
      <header class="w-full bg-white dark:bg-gray-800 shadow-md border-b border-gray-200 dark:border-gray-700">
        <div class="max-w-6xl mx-auto w-full safe-area-header py-6">
          <div class="flex items-center justify-between gap-4">
            <!-- Left side: Logo and title -->
            <div class="flex items-center gap-3">
              <svg class="text-red-600 dark:text-red-400" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              <div>
                <h1 class="text-2xl font-bold text-gray-800 dark:text-gray-100">Admin Portal</h1>
              </div>
            </div>
            
            <!-- Right side: navigation controls (h-10 — slightly smaller than main site h-12) -->
            <div class="flex flex-row items-center gap-2">
              <button
                type="button"
                (click)="showAdminHelp = true"
                class="flex items-center justify-center h-10 gap-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2.5 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors cursor-pointer"
                title="Help & Guidance"
                aria-label="Open admin help"
              >
                <svg class="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"></circle>
                  <text x="12" y="16" text-anchor="middle" fill="currentColor" font-size="14" font-weight="bold">?</text>
                </svg>
              </button>
              <button
                type="button"
                (click)="goToHome()"
                class="flex items-center justify-center h-10 gap-1 px-3 bg-blue-600 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors text-sm cursor-pointer"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
      <main class="w-full max-w-6xl mx-auto safe-area-horizontal py-6">
        <!-- Stats Grid -->
        <div class="grid grid-cols-4 gap-2 sm:gap-4 mb-8">
          <button
            (click)="onTabChange('prayers')"
            [class]="'bg-white dark:bg-gray-800 rounded-lg shadow-md p-1 sm:p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 flex flex-col justify-between cursor-pointer ' + (activeTab === 'prayers' ? 'ring-2 ring-blue-500' : '')"
          >
            <div class="text-center self-start w-full">
              <div class="text-lg sm:text-2xl font-bold text-green-600 dark:text-green-400">
                {{ consolidatedApprovals.length || 0 }}
              </div>
            </div>
            <div class="text-xs sm:text-sm text-gray-600 dark:text-gray-400"><span class="hidden lg:inline">Pending </span>Approvals</div>
          </button>

          <button
            (click)="onTabChange('deletions')"
            [class]="'bg-white dark:bg-gray-800 rounded-lg shadow-md p-1 sm:p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 flex flex-col justify-between cursor-pointer ' + (activeTab === 'deletions' ? 'ring-2 ring-blue-500' : '')"
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
            [class]="'bg-white dark:bg-gray-800 rounded-lg shadow-md p-1 sm:p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 flex flex-col justify-between cursor-pointer ' + (activeTab === 'accounts' ? 'ring-2 ring-blue-500' : '')"
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
            [class]="'bg-white dark:bg-gray-800 rounded-lg shadow-md p-1 sm:p-4 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 flex flex-col justify-between cursor-pointer ' + (activeTab === 'settings' ? 'ring-2 ring-blue-500' : '')"
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
              class="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
            >
              Try Again
            </button>
          </div>
        }

        <!-- Tab Content -->
        @if (!adminData?.loading && !adminData?.error) {
          <!-- Approvals Tab (Prayers + Updates Consolidated) -->
          @if (activeTab === 'prayers') {
            <div>
              
              @if ((consolidatedApprovals.length || 0) === 0) {
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
                  <svg class="mx-auto mb-4 text-gray-400 dark:text-gray-500" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  <h3 class="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
                    No pending approvals
                  </h3>
                  <p class="text-gray-500 dark:text-gray-400">
                    All prayer requests and updates have been reviewed.
                  </p>
                </div>
              }

              <div class="space-y-6">
                @for (item of consolidatedApprovals; track trackByPrayerId($index, item.prayer)) {
                  <app-consolidated-prayer-approval
                    [prayer]="item.prayer"
                    [pendingUpdates]="item.pendingUpdates"
                    [hasAnyPendingUpdates]="item.hasAnyPendingUpdates"
                    (onApprovePrayer)="approvePrayer($event)"
                    (onDenyPrayer)="denyPrayer($event.id, $event.reason || '')"
                    (onApproveUpdate)="approveUpdate($event)"
                    (onDenyUpdate)="denyUpdate($event.id, $event.reason || '')"
                    (onPrayerEdited)="handlePrayerEdited($event.id)"
                    (onUpdateEdited)="handleUpdateEdited($event.id)"
                  ></app-consolidated-prayer-approval>
                }
              </div>
            </div>
          }

          <!-- Deletions Tab -->
          @if (activeTab === 'deletions') {
            <div>
              
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
              <!-- Settings Sub-Navigation -->
            <div class="flex flex-wrap gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
              <button
                (click)="onSettingsTabChange('analytics')"
                [class]="'px-4 py-2 font-medium rounded-t-lg transition-colors flex items-center gap-2 cursor-pointer ' + (activeSettingsTab === 'analytics' ? 'bg-blue-600 text-white border-b-2 border-blue-600' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200')"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                  <polyline points="17 6 23 6 23 12"></polyline>
                </svg>
                Analytics
              </button>
              <button
                type="button"
                id="admin-settings-tab-content"
                (click)="onSettingsTabChange('content')"
                [class]="'px-4 py-2 font-medium rounded-t-lg transition-colors flex items-center gap-2 cursor-pointer ' + (activeSettingsTab === 'content' ? 'bg-blue-600 text-white border-b-2 border-blue-600' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200')"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                </svg>
                Content
              </button>
              <button
                type="button"
                id="admin-settings-tab-email"
                (click)="onSettingsTabChange('email')"
                [class]="'px-4 py-2 font-medium rounded-t-lg transition-colors flex items-center gap-2 cursor-pointer ' + (activeSettingsTab === 'email' ? 'bg-blue-600 text-white border-b-2 border-blue-600' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200')"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                Email
              </button>
              <button
                type="button"
                id="admin-settings-tab-tools"
                (click)="onSettingsTabChange('tools')"
                [class]="'px-4 py-2 font-medium rounded-t-lg transition-colors flex items-center gap-2 cursor-pointer ' + (activeSettingsTab === 'tools' ? 'bg-blue-600 text-white border-b-2 border-blue-600' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200')"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                </svg>
                Tools
              </button>
              <button
                (click)="onSettingsTabChange('security')"
                [class]="'px-4 py-2 font-medium rounded-t-lg transition-colors flex items-center gap-2 cursor-pointer ' + (activeSettingsTab === 'security' ? 'bg-blue-600 text-white border-b-2 border-blue-600' : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200')"
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
                    <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-2">
                  <!-- Today -->
                  <div class="bg-inset-surface rounded-md p-2.5 border border-[#D1CCC4] dark:border-gray-600 border-l-[3px] border-l-[#0047AB]">
                    <div class="flex items-center gap-1.5 mb-1">
                      <svg class="text-[#0047AB] dark:text-[#7BA3D9]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                      <div class="text-xs font-medium text-gray-700 dark:text-gray-200">Today</div>
                    </div>
                    <div class="text-xl font-bold leading-tight text-[#0047AB] dark:text-[#7BA3D9]">
                      {{ analyticsStats.todayPageViews.toLocaleString() }}
                    </div>
                    <div class="text-[10px] leading-tight text-gray-500 dark:text-gray-400 mt-0.5">page views</div>
                  </div>
                  <!-- This Week -->
                  <div class="bg-inset-surface rounded-md p-2.5 border border-[#D1CCC4] dark:border-gray-600 border-l-[3px] border-l-[#0047AB]">
                    <div class="flex items-center gap-1.5 mb-1">
                      <svg class="text-[#0047AB] dark:text-[#7BA3D9]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                      </svg>
                      <div class="text-xs font-medium text-gray-700 dark:text-gray-200">This Week</div>
                    </div>
                    <div class="text-xl font-bold leading-tight text-[#0047AB] dark:text-[#7BA3D9]">
                      {{ analyticsStats.weekPageViews.toLocaleString() }}
                    </div>
                    <div class="text-[10px] leading-tight text-gray-500 dark:text-gray-400 mt-0.5">page views</div>
                  </div>
                  <!-- This Month -->
                  <div class="bg-inset-surface rounded-md p-2.5 border border-[#D1CCC4] dark:border-gray-600 border-l-[3px] border-l-[#0047AB]">
                    <div class="flex items-center gap-1.5 mb-1">
                      <svg class="text-[#0047AB] dark:text-[#7BA3D9]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                        <polyline points="17 6 23 6 23 12"></polyline>
                      </svg>
                      <div class="text-xs font-medium text-gray-700 dark:text-gray-200">This Month</div>
                    </div>
                    <div class="text-xl font-bold leading-tight text-[#0047AB] dark:text-[#7BA3D9]">
                      {{ analyticsStats.monthPageViews.toLocaleString() }}
                    </div>
                    <div class="text-[10px] leading-tight text-gray-500 dark:text-gray-400 mt-0.5">page views</div>
                  </div>
                  <!-- This Year -->
                  <div class="bg-inset-surface rounded-md p-2.5 border border-[#D1CCC4] dark:border-gray-600 border-l-[3px] border-l-[#0047AB]">
                    <div class="flex items-center gap-1.5 mb-1">
                      <svg class="text-[#0047AB] dark:text-[#7BA3D9]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="9"></circle>
                        <polyline points="12 7 12 12 16 14"></polyline>
                      </svg>
                      <div class="text-xs font-medium text-gray-700 dark:text-gray-200">This Year</div>
                    </div>
                    <div class="text-xl font-bold leading-tight text-[#0047AB] dark:text-[#7BA3D9]">
                      {{ analyticsStats.yearPageViews.toLocaleString() }}
                    </div>
                    <div class="text-[10px] leading-tight text-gray-500 dark:text-gray-400 mt-0.5">page views</div>
                  </div>
                  <!-- All Time -->
                  <div class="bg-inset-surface rounded-md p-2.5 border border-[#D1CCC4] dark:border-gray-600 border-l-[3px] border-l-[#0047AB]">
                    <div class="flex items-center gap-1.5 mb-1">
                      <svg class="text-[#0047AB] dark:text-[#7BA3D9]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                      </svg>
                      <div class="text-xs font-medium text-gray-700 dark:text-gray-200">All Time</div>
                    </div>
                    <div class="text-xl font-bold leading-tight text-[#0047AB] dark:text-[#7BA3D9]">
                      {{ analyticsStats.totalPageViews.toLocaleString() }}
                    </div>
                    <div class="text-[10px] leading-tight text-gray-500 dark:text-gray-400 mt-0.5">total page views</div>
                  </div>
                  <!-- Total Prayers -->
                  <div class="bg-inset-surface rounded-md p-2.5 border border-[#D1CCC4] dark:border-gray-600 border-l-[3px] border-l-[#2F5F54]">
                    <div class="flex items-center gap-1.5 mb-1">
                      <svg class="text-[#2F5F54] dark:text-[#8FB9A8]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                      </svg>
                      <div class="text-xs font-medium text-gray-700 dark:text-gray-200">Total Prayers</div>
                    </div>
                    <div class="text-xl font-bold leading-tight text-[#2F5F54] dark:text-[#8FB9A8]">
                      {{ analyticsStats.totalPrayers.toLocaleString() }}
                    </div>
                    <div class="text-[10px] leading-tight text-gray-500 dark:text-gray-400 mt-0.5">in database</div>
                  </div>
                  <!-- Current Prayers -->
                  <div class="bg-inset-surface rounded-md p-2.5 border border-[#D1CCC4] dark:border-gray-600 border-l-[3px] border-l-[#2F5F54]">
                    <div class="flex items-center gap-1.5 mb-1">
                      <svg class="text-[#2F5F54] dark:text-[#8FB9A8]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 11l3 3L22 4"></path>
                        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                      <div class="text-xs font-medium text-gray-700 dark:text-gray-200">Current</div>
                    </div>
                    <div class="text-xl font-bold leading-tight text-[#2F5F54] dark:text-[#8FB9A8]">
                      {{ analyticsStats.currentPrayers.toLocaleString() }}
                    </div>
                    <div class="text-[10px] leading-tight text-gray-500 dark:text-gray-400 mt-0.5">active prayers</div>
                  </div>
                  <!-- Answered Prayers -->
                  <div class="bg-inset-surface rounded-md p-2.5 border border-[#D1CCC4] dark:border-gray-600 border-l-[3px] border-l-[#2F5F54]">
                    <div class="flex items-center gap-1.5 mb-1">
                      <svg class="text-[#2F5F54] dark:text-[#8FB9A8]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <div class="text-xs font-medium text-gray-700 dark:text-gray-200">Answered</div>
                    </div>
                    <div class="text-xl font-bold leading-tight text-[#2F5F54] dark:text-[#8FB9A8]">
                      {{ analyticsStats.answeredPrayers.toLocaleString() }}
                    </div>
                    <div class="text-[10px] leading-tight text-gray-500 dark:text-gray-400 mt-0.5">answered prayers</div>
                  </div>
                  <!-- Archived Prayers -->
                  <div class="bg-inset-surface rounded-md p-2.5 border border-[#D1CCC4] dark:border-gray-600 border-l-[3px] border-l-[#2F5F54]">
                    <div class="flex items-center gap-1.5 mb-1">
                      <svg class="text-[#2F5F54] dark:text-[#8FB9A8]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="5" width="18" height="16" rx="2"></rect>
                        <path d="M7 15h10"></path>
                        <path d="M7 7h10"></path>
                      </svg>
                      <div class="text-xs font-medium text-gray-700 dark:text-gray-200">Archived</div>
                    </div>
                    <div class="text-xl font-bold leading-tight text-[#2F5F54] dark:text-[#8FB9A8]">
                      {{ analyticsStats.archivedPrayers.toLocaleString() }}
                    </div>
                    <div class="text-[10px] leading-tight text-gray-500 dark:text-gray-400 mt-0.5">archived prayers</div>
                  </div>
                  <!-- Subscribers -->
                  <div class="bg-inset-surface rounded-md p-2.5 border border-[#D1CCC4] dark:border-gray-600 border-l-[3px] border-l-[#C9A961]">
                    <div class="flex items-center gap-1.5 mb-1">
                      <svg class="text-[#6B6256] dark:text-[#D4AF85]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <polyline points="17 11 19 13 23 9"></polyline>
                      </svg>
                      <div class="text-xs font-medium text-gray-700 dark:text-gray-200">Subscribers</div>
                    </div>
                    <div class="text-xl font-bold leading-tight text-[#6B6256] dark:text-[#D4AF85]">
                      {{ analyticsStats.totalSubscribers.toLocaleString() }}
                    </div>
                    <div class="text-[10px] leading-tight text-gray-500 dark:text-gray-400 mt-0.5">total subscribers</div>
                  </div>
                  <!-- Memorize Total -->
                  <div class="bg-inset-surface rounded-md p-2.5 border border-[#D1CCC4] dark:border-gray-600 border-l-[3px] border-l-[#3E5266]">
                    <div class="flex items-center gap-1.5 mb-1">
                      <svg class="text-[#3E5266] dark:text-[#A8B8C8]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                        <line x1="8" y1="7" x2="16" y2="7"></line>
                        <line x1="8" y1="11" x2="16" y2="11"></line>
                        <line x1="8" y1="15" x2="12" y2="15"></line>
                      </svg>
                      <div class="text-xs font-medium text-gray-700 dark:text-gray-200">Total</div>
                    </div>
                    <div class="text-xl font-bold leading-tight text-[#3E5266] dark:text-[#A8B8C8]">
                      {{ analyticsStats.memorizationTotal.toLocaleString() }}
                    </div>
                    <div class="text-[10px] leading-tight text-gray-500 dark:text-gray-400 mt-0.5">memorized verses</div>
                  </div>
                  <!-- Memorize Learning -->
                  <div class="bg-inset-surface rounded-md p-2.5 border border-[#D1CCC4] dark:border-gray-600 border-l-[3px] border-l-[#3E5266]">
                    <div class="flex items-center gap-1.5 mb-1">
                      <svg class="text-[#3E5266] dark:text-[#A8B8C8]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                      </svg>
                      <div class="text-xs font-medium text-gray-700 dark:text-gray-200">Learning</div>
                    </div>
                    <div class="text-xl font-bold leading-tight text-[#3E5266] dark:text-[#A8B8C8]">
                      {{ analyticsStats.memorizationLearning.toLocaleString() }}
                    </div>
                    <div class="text-[10px] leading-tight text-gray-500 dark:text-gray-400 mt-0.5">memorized verses</div>
                  </div>
                  <!-- Memorize Practicing -->
                  <div class="bg-inset-surface rounded-md p-2.5 border border-[#D1CCC4] dark:border-gray-600 border-l-[3px] border-l-[#3E5266]">
                    <div class="flex items-center gap-1.5 mb-1">
                      <svg class="text-[#3E5266] dark:text-[#A8B8C8]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                      </svg>
                      <div class="text-xs font-medium text-gray-700 dark:text-gray-200">Practicing</div>
                    </div>
                    <div class="text-xl font-bold leading-tight text-[#3E5266] dark:text-[#A8B8C8]">
                      {{ analyticsStats.memorizationPracticing.toLocaleString() }}
                    </div>
                    <div class="text-[10px] leading-tight text-gray-500 dark:text-gray-400 mt-0.5">memorized verses</div>
                  </div>
                  <!-- Memorize Mastered -->
                  <div class="bg-inset-surface rounded-md p-2.5 border border-[#D1CCC4] dark:border-gray-600 border-l-[3px] border-l-[#3E5266]">
                    <div class="flex items-center gap-1.5 mb-1">
                      <svg class="text-[#3E5266] dark:text-[#A8B8C8]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                      </svg>
                      <div class="text-xs font-medium text-gray-700 dark:text-gray-200">Mastered</div>
                    </div>
                    <div class="text-xl font-bold leading-tight text-[#3E5266] dark:text-[#A8B8C8]">
                      {{ analyticsStats.memorizationMastered.toLocaleString() }}
                    </div>
                    <div class="text-[10px] leading-tight text-gray-500 dark:text-gray-400 mt-0.5">memorized verses</div>
                  </div>
                </div>
                <app-site-analytics-activity-chart></app-site-analytics-activity-chart>
              }
                </div>
              </div>
            }

            <!-- Other Settings Tabs Placeholder -->
            @if (activeSettingsTab === 'content') {
              <div class="space-y-6">
                <div class="mb-4">
                  <app-prayer-encouragement-settings></app-prayer-encouragement-settings>
                </div>
                <div class="mb-4">
                  <app-rich-text-editors-settings></app-rich-text-editors-settings>
                </div>
                <div class="mb-4">
                  <app-github-settings></app-github-settings>
                </div>
                <div class="mb-4">
                  <app-branding></app-branding>
                </div>
                <div class="mb-4">
                  <app-prompt-manager #promptManager></app-prompt-manager>
                </div>
                <div class="mb-4">
                  <app-prayer-types-manager #prayerTypesManager></app-prayer-types-manager>
                </div>
                <div class="mb-4">
                  <app-memorization-recommendations-manager #memorizeRecommendationsManager></app-memorization-recommendations-manager>
                </div>
                <div class="mb-4">
                  <app-memorization-recite-settings></app-memorization-recite-settings>
                </div>
                <div class="mb-4">
                  <app-planning-center-list-mapper></app-planning-center-list-mapper>
                </div>
              </div>
            }

            @if (activeSettingsTab === 'email') {
              <div class="space-y-6">
                <div class="mb-4">
                  <app-email-settings #emailSettings></app-email-settings>
                </div>
              </div>
            }

            <!-- Tools Tab -->
            @if (activeSettingsTab === 'tools') {
              <div class="space-y-6">
                <div class="mb-4">
                  <app-prayer-search #prayerSearch></app-prayer-search>
                </div>
                <div class="mb-4">
                  <app-prayer-list-booklet-print></app-prayer-list-booklet-print>
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
              <div class="space-y-6">
                <div class="mb-4">
                  <app-admin-user-management></app-admin-user-management>
                </div>
                <div class="mb-4">
                  <app-email-verification-settings></app-email-verification-settings>
                </div>
                <div class="mb-4">
                  <app-security-policy-settings></app-security-policy-settings>
                </div>
                <div class="mb-4">
                  <app-test-account-settings></app-test-account-settings>
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
      <app-admin-help-modal
        [isOpen]="showAdminHelp"
        (closeModal)="showAdminHelp = false"
        (startEmailSubscribersTour)="onEmailSubscribersTourFromHelp()"
        (startEmailSubscribersOverviewTour)="onEmailSubscribersOverviewTourFromHelp()"
        (startPrayerEditorTour)="onPrayerEditorTourFromHelp()"
        (startPrayerEditorManageTour)="onPrayerEditorManageTourFromHelp()"
        (startPrayerPromptsTypesTour)="onPrayerPromptsTypesTourFromHelp()"
        (startMemorizeRecommendationsTour)="onMemorizeRecommendationsTourFromHelp()"
      ></app-admin-help-modal>
    </div>
  `
})
export class AdminComponent implements OnInit, OnDestroy {
  @ViewChild('emailSettings') emailSettingsRef?: EmailSettingsComponent;
  @ViewChild('prayerSearch') prayerSearchRef?: PrayerSearchComponent;
  @ViewChild('promptManager') promptManagerRef?: PromptManagerComponent;
  @ViewChild('prayerTypesManager') prayerTypesManagerRef?: PrayerTypesManagerComponent;
  @ViewChild('memorizeRecommendationsManager')
  memorizeRecommendationsManagerRef?: MemorizationRecommendationsManagerComponent;

  activeTab: AdminTab = 'prayers';
  activeSettingsTab: SettingsTab = 'analytics';
  adminData: any = null;
  consolidatedApprovals: any[] = [];
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
    memorizationTotal: 0,
    memorizationLearning: 0,
    memorizationPracticing: 0,
    memorizationMastered: 0,
    loading: false
  };

  // Dialog state for send notification
  showSendNotificationDialog = false;
  showAdminHelp = false;
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
    private ngZone: NgZone,
    public cdr: ChangeDetectorRef,
    private adminHelpDriverTour: AdminHelpDriverTourService
  ) {}

  /** From Admin Help: navigate to Email settings and start the Email Subscribers driver.js tour. */
  onEmailSubscribersTourFromHelp(): void {
    this.showAdminHelp = false;
    this.onTabChange('settings');
    this.onSettingsTabChange('email');
    this.cdr.markForCheck();
    window.setTimeout(() => {
      this.emailSettingsRef?.prepareEmailSubscribersTour();
      this.adminHelpDriverTour.startEmailSubscribersTour({
        openAddForm: () => this.emailSettingsRef?.openAddSubscriberFormForTour(),
        showPcSearchTab: () => this.emailSettingsRef?.showPlanningCenterTabForTour(),
        runPlanningCenterSearchTourDemo: () =>
          this.emailSettingsRef?.runPlanningCenterSearchTourDemo() ?? Promise.resolve(),
        selectTourPlanningCenterMatchFromDemoResults: () =>
          this.emailSettingsRef?.selectTourPlanningCenterMatchFromDemoResults(),
        applyTourDemoPlanningCenterAdd: () => this.emailSettingsRef?.applyTourDemoPlanningCenterAdd(),
        clearEmailSubscribersTourDemoForm: () =>
          this.emailSettingsRef?.clearEmailSubscribersTourDemoForm(),
      });
    }, 150);
  }

  /** From Admin Help: Content tab — Prayer Prompts and Prayer Types overview (no add forms opened). */
  onPrayerPromptsTypesTourFromHelp(): void {
    this.showAdminHelp = false;
    this.onTabChange('settings');
    this.onSettingsTabChange('content');
    this.cdr.markForCheck();
    window.setTimeout(() => {
      void (async () => {
        await this.promptManagerRef?.prepareTourInitialState();
        await this.prayerTypesManagerRef?.prepareTourInitialState();
        window.setTimeout(() => {
          this.adminHelpDriverTour.startPrayerPromptsAndTypesTour();
          this.cdr.markForCheck();
        }, 150);
      })();
    }, 200);
  }

  /** From Admin Help: Content tab — Memorize Recommendations overview (no add forms opened). */
  onMemorizeRecommendationsTourFromHelp(): void {
    this.showAdminHelp = false;
    this.onTabChange('settings');
    this.onSettingsTabChange('content');
    this.cdr.markForCheck();
    window.setTimeout(() => {
      void this.memorizeRecommendationsManagerRef?.prepareTourInitialState().then((hasCategories) => {
        window.setTimeout(() => {
          this.adminHelpDriverTour.startMemorizeRecommendationsTour(hasCategories ?? false);
          this.cdr.markForCheck();
        }, 150);
      });
    }, 200);
  }

  /** From Admin Help: Email settings — overview tour of the subscriber list (toolbar, search, table) without opening Add Subscriber. */
  onEmailSubscribersOverviewTourFromHelp(): void {
    this.showAdminHelp = false;
    this.onTabChange('settings');
    this.onSettingsTabChange('email');
    this.cdr.markForCheck();
    window.setTimeout(() => {
      void Promise.resolve(this.emailSettingsRef?.prepareEmailSubscribersOverviewTour()).then(() => {
        window.setTimeout(() => {
          this.adminHelpDriverTour.startEmailSubscribersOverviewTour();
          this.cdr.markForCheck();
        }, 100);
      });
    }, 150);
  }

  /** From Admin Help: navigate to Tools → Prayer Editor and start the create-prayer driver.js tour. */
  onPrayerEditorTourFromHelp(): void {
    this.showAdminHelp = false;
    this.onTabChange('settings');
    this.onSettingsTabChange('tools');
    this.cdr.markForCheck();
    window.setTimeout(() => {
      this.prayerSearchRef?.preparePrayerEditorTourInitialState();
      this.adminHelpDriverTour.startPrayerEditorCreateTour({
        openCreatePrayerForm: () => this.prayerSearchRef?.openCreatePrayerFormForTour(),
      });
    }, 200);
  }

  /** From Admin Help: Tools → Prayer Editor — edit, delete, and add-update tour. */
  onPrayerEditorManageTourFromHelp(): void {
    this.showAdminHelp = false;
    this.onTabChange('settings');
    this.onSettingsTabChange('tools');
    this.cdr.markForCheck();
    window.setTimeout(() => {
      void this.prayerSearchRef?.preparePrayerEditorManageTourInitialState().then((hasPrayers) => {
        const has = hasPrayers ?? false;
        // Next macrotask so Angular has painted tour anchors before driver.js queries the DOM.
        window.setTimeout(() => {
          this.adminHelpDriverTour.startPrayerEditorManageTour(has, {
            openEditFormForTour: () => this.prayerSearchRef?.openEditFormForTour(),
            cancelEditForTour: () => this.prayerSearchRef?.cancelEditForTour(),
            openAddUpdateFormForTour: () => this.prayerSearchRef?.openAddUpdateFormForTour(),
            cancelAddUpdateForTour: () => this.prayerSearchRef?.cancelAddUpdateForTour(),
            resetTourUiState: () => this.prayerSearchRef?.resetPrayerEditorManageTourUi(),
          });
          this.cdr.markForCheck();
        }, 0);
      });
    }, 200);
  }

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
    // Subscribe to admin data. Run updates inside NgZone so change detection runs when
    // the app was resumed from background (e.g. tap on approval push notification).
    this.adminDataService.data$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.ngZone.run(() => {
          this.adminData = data;
          this.consolidatedApprovals = this.buildConsolidatedApprovals(data);
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
      });

    // Initial fetch (or join the pre-fetch started by push-tap navigation)
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
    const hasPendingApprovals = hasPendingPrayers || hasPendingUpdates;
    const hasPendingDeletions = (this.adminData.pendingDeletionRequests || []).length > 0 || 
                               (this.adminData.pendingUpdateDeletionRequests || []).length > 0;
    const hasPendingAccounts = (this.adminData.pendingAccountRequests || []).length > 0;

    // Set tab based on priority
    if (hasPendingApprovals) {
      this.onTabChange('prayers');
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
    const hasPendingApprovals = hasPendingPrayers || hasPendingUpdates;
    const hasPendingDeletions = (this.adminData.pendingDeletionRequests || []).length > 0 || 
                               (this.adminData.pendingUpdateDeletionRequests || []).length > 0;
    const hasPendingAccounts = (this.adminData.pendingAccountRequests || []).length > 0;
    const hasAnyPending = hasPendingApprovals || hasPendingDeletions || hasPendingAccounts;

    // If nothing pending at all, go to settings
    if (!hasAnyPending) {
      if (this.activeTab !== 'settings') {
        this.onTabChange('settings');
      }
      return;
    }

    // If on prayers tab (consolidated with updates), check if all are done
    if (this.activeTab === 'prayers') {
      if (!hasPendingApprovals) {
        // Move to deletions if there are any
        if (hasPendingDeletions) {
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
    // If on deletions tab, check if all deletions are done
    else if (this.activeTab === 'deletions') {
      if (!hasPendingDeletions) {
        // Move to accounts if there are any
        if (hasPendingAccounts) {
          this.onTabChange('accounts');
        } else if (hasPendingApprovals) {
          // Cycle back to prayers if any exist
          this.onTabChange('prayers');
        } else {
          // Nothing pending anywhere
          this.onTabChange('settings');
        }
      }
    }
    // If on accounts tab, check if all accounts are done
    else if (this.activeTab === 'accounts') {
      if (!hasPendingAccounts) {
        if (hasPendingApprovals) {
          this.onTabChange('prayers');
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
    return (this.consolidatedApprovals?.length || 0) +
           (this.adminData.pendingDeletionRequests?.length || 0) +
           (this.adminData.pendingUpdateDeletionRequests?.length || 0) +
           (this.adminData.pendingAccountRequests?.length || 0);
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
      // autoProgressTabs is called via subscription when data updates
      this.autoProgressTabs();
    } catch (error) {
      console.error('Error approving prayer:', error);
    }
  }

  async denyPrayer(id: string, reason: string) {
    try {
      await this.adminDataService.denyPrayer(id, reason);
      // Auto-progress tabs via subscription
      this.autoProgressTabs();
    } catch (error) {
      console.error('Error denying prayer:', error);
    }
  }

  async editPrayer(id: string, updates: any) {
    try {
      // First save the prayer
      await this.adminDataService.editPrayer(id, updates);
      // Refresh the admin data to get the updated prayer info
      this.adminDataService.refresh();
    } catch (error) {
      console.error('Error editing prayer:', error);
    }
  }

  handlePrayerEdited(id: string): void {
    // Trigger refresh of admin data to update the display
    this.adminDataService.refresh();
  }

  handleUpdateEdited(id: string): void {
    // Trigger refresh of admin data to update the display
    this.adminDataService.refresh();
  }

  async approveUpdate(id: string) {
    try {
      await this.adminDataService.approveUpdate(id);
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
      // Auto-progress tabs via subscription
      this.autoProgressTabs();
    } catch (error) {
      console.error('Error approving update:', error);
    }
  }

  async denyUpdate(id: string, reason: string) {
    try {
      await this.adminDataService.denyUpdate(id, reason);
      // Auto-progress tabs via subscription
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
      // Auto-progress tabs via subscription
      this.autoProgressTabs();
    } catch (error) {
      console.error('Error approving deletion request:', error);
    }
  }

  async denyDeletionRequest(id: string, reason: string) {
    try {
      await this.adminDataService.denyDeletionRequest(id, reason);
      // Auto-progress tabs via subscription
      this.autoProgressTabs();
    } catch (error) {
      console.error('Error denying deletion request:', error);
    }
  }

  async approveUpdateDeletionRequest(id: string) {
    try {
      await this.adminDataService.approveUpdateDeletionRequest(id);
      // Auto-progress tabs via subscription
      this.autoProgressTabs();
    } catch (error) {
      console.error('Error approving update deletion request:', error);
    }
  }

  async denyUpdateDeletionRequest(id: string, reason: string) {
    try {
      await this.adminDataService.denyUpdateDeletionRequest(id, reason);
      // Auto-progress tabs via subscription
      this.autoProgressTabs();
    } catch (error) {
      console.error('Error denying update deletion request:', error);
    }
  }

  /**
   * Build consolidated approvals by grouping pending updates under their parent prayers
   * Includes: All pending prayers + All prayers that have pending updates (even if already approved)
   */
  buildConsolidatedApprovals(data: any): any[] {
    if (!data) {
      return [];
    }

    const updatesMap = new Map<string, any[]>();
    const prayersMap = new Map<string, any>();
    
    // Add all pending prayers to the map
    if (data.pendingPrayers) {
      data.pendingPrayers.forEach((prayer: any) => {
        prayersMap.set(prayer.id, prayer);
      });
    }
    
    // Map all pending updates by prayer_id and add those prayers to the map
    if (data.pendingUpdates) {
      (data.pendingUpdates || []).forEach((update: any) => {
        const prayerId = update.prayer_id;
        
        // Add/update the prayer in the map from the update's prayer data
        if (update.prayers && !prayersMap.has(prayerId)) {
          prayersMap.set(prayerId, update.prayers);
        }
        
        // Map the update
        if (!updatesMap.has(prayerId)) {
          updatesMap.set(prayerId, []);
        }
        updatesMap.get(prayerId)!.push(update);
      });
    }

    // Build consolidated approvals with all prayers (pending + those with pending updates) and their pending updates
    const result = Array.from(prayersMap.values()).map((prayer: any) => ({
      prayer,
      pendingUpdates: updatesMap.get(prayer.id) || [],
      hasAnyPendingUpdates: data.pendingUpdates && (data.pendingUpdates.length > 0)
    }));
    
    return result;
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
      this.cdr.markForCheck();
      // Auto-progress tabs via subscription
      this.autoProgressTabs();
    } catch (error) {
      console.error('Error approving account request:', error);
    }
  }

  async denyAccountRequest(requestId: string, reason: string) {
    try {
      await this.adminDataService.denyAccountRequest(requestId, reason);
      this.cdr.markForCheck();
      // Auto-progress tabs via subscription
      this.autoProgressTabs();
    } catch (error) {
      console.error('Error denying account request:', error);
    }
  }

  async onConfirmSendNotification() {
    try {
      if (this.sendDialogType === 'prayer' && this.sendDialogPrayerId) {
        // Check if this is from approval or direct submission
        // Search both pending and approved prayers since prayer may have already moved to approved
        const prayer = this.adminData?.pendingPrayers?.find((p: any) => p.id === this.sendDialogPrayerId)
          || this.adminData?.approvedPrayers?.find((p: any) => p.id === this.sendDialogPrayerId);
        if (prayer?.approval_status === 'approved') {
          await this.adminDataService.sendApprovedPrayerEmails(this.sendDialogPrayerId);
        } else {
          // Otherwise use the submission email method
          await this.adminDataService.sendBroadcastNotificationForNewPrayer(this.sendDialogPrayerId);
        }
      } else if (this.sendDialogType === 'update' && this.sendDialogUpdateId) {
        // Check if this is from approval or direct submission
        const update = this.adminData?.pendingUpdates?.find((u: any) => u.id === this.sendDialogUpdateId)
          || this.adminData?.approvedUpdates?.find((u: any) => u.id === this.sendDialogUpdateId);
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
}
