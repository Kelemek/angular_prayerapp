import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AdminDataService } from '../../services/admin-data.service';
import { PendingPrayerCardComponent } from '../../components/pending-prayer-card/pending-prayer-card.component';
import { PendingUpdateCardComponent } from '../../components/pending-update-card/pending-update-card.component';
import { PendingDeletionCardComponent } from '../../components/pending-deletion-card/pending-deletion-card.component';
import { PendingPreferenceChangeCardComponent } from '../../components/pending-preference-change-card/pending-preference-change-card.component';

type AdminTab = 'prayers' | 'updates' | 'deletions' | 'preferences' | 'settings';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, PendingPrayerCardComponent, PendingUpdateCardComponent, PendingDeletionCardComponent, PendingPreferenceChangeCardComponent],
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
            (click)="activeTab = 'prayers'"
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
            (click)="activeTab = 'updates'"
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
            (click)="activeTab = 'deletions'"
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
            (click)="activeTab = 'preferences'"
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
            (click)="activeTab = 'settings'"
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
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 text-center border border-gray-200 dark:border-gray-700">
                  <p class="text-gray-500 dark:text-gray-400">
                    Update deletion requests will be displayed here
                  </p>
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

          <!-- Other tabs placeholder -->
          <div *ngIf="activeTab !== 'prayers' && activeTab !== 'updates' && activeTab !== 'deletions' && activeTab !== 'preferences'" class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center border border-gray-200 dark:border-gray-700">
            <h3 class="text-lg font-medium text-gray-700 dark:text-gray-200 mb-2">
              {{ activeTab | titlecase }} Tab
            </h3>
            <p class="text-gray-500 dark:text-gray-400">
              This section is being built. Check back soon!
            </p>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: []
})
export class AdminComponent implements OnInit, OnDestroy {
  activeTab: AdminTab = 'prayers';
  adminData: any = null;
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private adminDataService: AdminDataService
  ) {}

  ngOnInit() {
    // Subscribe to admin data
    this.adminDataService.data$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.adminData = data;
      });

    // Initial fetch
    this.adminDataService.fetchAdminData();
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
