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
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AdminDataService, type AdminData } from '../../services/admin-data.service';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AnalyticsService, type AnalyticsStats } from '../../services/analytics.service';
import {
  SendNotificationDialogComponent,
  type NotificationType,
} from '../../components/send-notification-dialog/send-notification-dialog.component';
import { AdminHelpModalComponent } from '../../components/admin-help-modal/admin-help-modal.component';
import { AdminHelpTourLauncher } from '../../services/admin-help-tour.launcher';
import { AdminNavTilesComponent } from '../../components/admin-nav-tiles/admin-nav-tiles.component';
import { AdminApprovalsPanelComponent } from '../../components/admin-approvals-panel/admin-approvals-panel.component';
import { AdminDeletionsPanelComponent } from '../../components/admin-deletions-panel/admin-deletions-panel.component';
import { AdminAccountsPanelComponent } from '../../components/admin-accounts-panel/admin-accounts-panel.component';
import { AdminSettingsPanelComponent } from '../../components/admin-settings-panel/admin-settings-panel.component';
import {
  type AdminTab,
  type ConsolidatedApproval,
  buildConsolidatedApprovals,
  firstPendingTab,
  nextPendingTab,
} from '../../lib/admin-pending-queues';
import type { AdminSettingsTab } from '../../lib/admin-settings-tabs';

@Component({
  selector: 'app-admin',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AdminNavTilesComponent,
    AdminApprovalsPanelComponent,
    AdminDeletionsPanelComponent,
    AdminAccountsPanelComponent,
    AdminSettingsPanelComponent,
    SendNotificationDialogComponent,
    AdminHelpModalComponent,
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css',
})
export class AdminComponent implements OnInit, OnDestroy {
  @ViewChild(AdminSettingsPanelComponent) settingsPanelRef?: AdminSettingsPanelComponent;

  activeTab: AdminTab = 'prayers';
  activeSettingsTab: AdminSettingsTab = 'analytics';
  adminData: AdminData | null = null;
  consolidatedApprovals: ConsolidatedApproval[] = [];
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
    loading: false,
  };

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
    private adminHelpTourLauncher: AdminHelpTourLauncher,
  ) {}

  onStartAdminHelpTour(sectionId: string): void {
    this.adminHelpTourLauncher.startSectionTour(sectionId, {
      closeHelp: () => {
        this.showAdminHelp = false;
      },
      openSettingsTab: (tab) => {
        this.onTabChange('settings');
        this.onSettingsTabChange(tab);
      },
      markForCheck: () => this.cdr.markForCheck(),
      getEmailSettings: () => this.settingsPanelRef?.emailSettingsRef,
      getPrayerSearch: () => this.settingsPanelRef?.prayerSearchRef,
      getPromptManager: () => this.settingsPanelRef?.promptManagerRef,
      getPrayerTypesManager: () => this.settingsPanelRef?.prayerTypesManagerRef,
      getMemorizeRecommendations: () => this.settingsPanelRef?.memorizeRecommendationsManagerRef,
    });
  }

  @HostListener('document:click')
  @HostListener('document:keypress')
  @HostListener('document:mousemove')
  @HostListener('document:touchstart')
  recordActivity(): void {
    this.adminAuthService.recordActivity();
  }

  ngOnInit(): void {
    this.adminDataService.data$
      .pipe(takeUntil(this.destroy$))
      .subscribe((data) => {
        this.ngZone.run(() => {
          this.adminData = data;
          this.consolidatedApprovals = buildConsolidatedApprovals(data);
          this.cdr.markForCheck();

          if (this.activeTab === 'prayers' && this.hasFetchStarted && !data.loading) {
            this.setInitialTab();
          }

          if (this.hasFetchStarted && !data.loading) {
            this.autoProgressTabs();
          }
        });
      });

    this.hasFetchStarted = true;
    this.adminDataService.fetchAdminData();

    if (this.activeTab === 'settings' && this.activeSettingsTab === 'analytics') {
      this.loadAnalytics();
    }
  }

  private setInitialTab(): void {
    if (!this.adminData) return;
    this.onTabChange(firstPendingTab(this.adminData));
  }

  private autoProgressTabs(): void {
    if (!this.adminData) return;
    const next = nextPendingTab(this.activeTab, this.adminData);
    if (next !== this.activeTab) {
      this.onTabChange(next);
    }
  }

  async loadAnalytics(): Promise<void> {
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

  onTabChange(tab: AdminTab): void {
    this.activeTab = tab;
    if (
      tab === 'settings' &&
      this.activeSettingsTab === 'analytics' &&
      this.analyticsStats.totalPageViews === 0
    ) {
      this.loadAnalytics();
    }
  }

  onSettingsTabChange(tab: AdminSettingsTab): void {
    this.activeSettingsTab = tab;
    if (tab === 'analytics' && this.analyticsStats.totalPageViews === 0) {
      this.loadAnalytics();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goToHome(): void {
    this.router.navigate(['/']);
  }

  refresh(): void {
    this.adminDataService.refresh();
  }

  async approvePrayer(id: string): Promise<void> {
    await this.runReviewAction(
      () => this.adminDataService.approvePrayer(id),
      'Error approving prayer:',
      () => this.openSendNotificationDialog('prayer', id),
    );
  }

  async denyPrayer(id: string, reason: string): Promise<void> {
    await this.runReviewAction(
      () => this.adminDataService.denyPrayer(id, reason),
      'Error denying prayer:',
    );
  }

  async approveUpdate(id: string): Promise<void> {
    await this.runReviewAction(
      () => this.adminDataService.approveUpdate(id),
      'Error approving update:',
      () => this.openSendNotificationDialog('update', id),
    );
  }

  async denyUpdate(id: string, reason: string): Promise<void> {
    await this.runReviewAction(
      () => this.adminDataService.denyUpdate(id, reason),
      'Error denying update:',
    );
  }

  async approveDeletionRequest(id: string): Promise<void> {
    await this.runReviewAction(
      () => this.adminDataService.approveDeletionRequest(id),
      'Error approving deletion request:',
    );
  }

  async denyDeletionRequest(id: string, reason: string): Promise<void> {
    await this.runReviewAction(
      () => this.adminDataService.denyDeletionRequest(id, reason),
      'Error denying deletion request:',
    );
  }

  async approveUpdateDeletionRequest(id: string): Promise<void> {
    await this.runReviewAction(
      () => this.adminDataService.approveUpdateDeletionRequest(id),
      'Error approving update deletion request:',
    );
  }

  async denyUpdateDeletionRequest(id: string, reason: string): Promise<void> {
    await this.runReviewAction(
      () => this.adminDataService.denyUpdateDeletionRequest(id, reason),
      'Error denying update deletion request:',
    );
  }

  async approveAccountRequest(requestId: string): Promise<void> {
    await this.runReviewAction(
      () => this.adminDataService.approveAccountRequest(requestId),
      'Error approving account request:',
      () => this.cdr.markForCheck(),
    );
  }

  async denyAccountRequest(requestId: string, reason: string): Promise<void> {
    await this.runReviewAction(
      () => this.adminDataService.denyAccountRequest(requestId, reason),
      'Error denying account request:',
      () => this.cdr.markForCheck(),
    );
  }

  async onConfirmSendNotification(): Promise<void> {
    try {
      if (this.sendDialogType === 'prayer' && this.sendDialogPrayerId) {
        const prayerId = this.sendDialogPrayerId;
        const prayer =
          this.adminData?.pendingPrayers.find((p) => p.id === prayerId) ||
          this.adminData?.approvedPrayers.find((p) => p.id === prayerId);
        if (prayer?.approval_status === 'approved') {
          await this.adminDataService.sendApprovedPrayerEmails(prayerId);
        } else {
          await this.adminDataService.sendBroadcastNotificationForNewPrayer(prayerId);
        }
      } else if (this.sendDialogType === 'update' && this.sendDialogUpdateId) {
        const updateId = this.sendDialogUpdateId;
        const update =
          this.adminData?.pendingUpdates.find((u) => u.id === updateId) ||
          this.adminData?.approvedUpdates.find((u) => u.id === updateId);
        if (update?.approval_status === 'approved') {
          await this.adminDataService.sendApprovedUpdateEmails(updateId);
        } else {
          await this.adminDataService.sendBroadcastNotificationForNewUpdate(updateId);
        }
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    } finally {
      this.onDeclineSendNotification();
    }
  }

  onDeclineSendNotification(): void {
    this.showSendNotificationDialog = false;
    this.sendDialogPrayerId = undefined;
    this.sendDialogUpdateId = undefined;
    this.sendDialogPrayerTitle = undefined;
    this.cdr.markForCheck();
  }

  private async runReviewAction(
    action: () => Promise<void>,
    errorLabel: string,
    after?: () => void,
  ): Promise<void> {
    try {
      await action();
      after?.();
      this.autoProgressTabs();
    } catch (error) {
      console.error(errorLabel, error);
    }
  }

  private openSendNotificationDialog(type: 'prayer' | 'update', id: string): void {
    if (type === 'prayer') {
      this.sendDialogPrayerId = id;
      this.sendDialogPrayerTitle = this.adminData?.pendingPrayers.find((p) => p.id === id)?.title;
    } else {
      this.sendDialogUpdateId = id;
      const update = this.adminData?.pendingUpdates.find((u) => u.id === id);
      this.sendDialogPrayerTitle = update?.prayer_title || update?.prayers?.title;
    }
    this.sendDialogType = type;
    this.showSendNotificationDialog = true;
    this.cdr.markForCheck();
  }
}
