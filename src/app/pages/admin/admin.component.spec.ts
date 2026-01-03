import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Subject, of } from 'rxjs';
import { AdminComponent } from './admin.component';

describe('AdminComponent', () => {
  let component: AdminComponent;
  let adminDataService: any;
  let analyticsService: any;
  let adminAuthService: any;
  let router: any;
  let cdr: any;

  beforeEach(() => {
    adminDataService = {
      data$: new Subject<any>(),
      fetchAdminData: vi.fn(),
      refresh: vi.fn(),
      approvePrayer: vi.fn().mockResolvedValue(undefined),
      denyPrayer: vi.fn().mockResolvedValue(undefined),
      editPrayer: vi.fn().mockResolvedValue(undefined),
      approveUpdate: vi.fn().mockResolvedValue(undefined),
      denyUpdate: vi.fn().mockResolvedValue(undefined),
      editUpdate: vi.fn().mockResolvedValue(undefined),
      approveDeletionRequest: vi.fn().mockResolvedValue(undefined),
      denyDeletionRequest: vi.fn().mockResolvedValue(undefined),
      approveUpdateDeletionRequest: vi.fn().mockResolvedValue(undefined),
      denyUpdateDeletionRequest: vi.fn().mockResolvedValue(undefined),
      approveAccountRequest: vi.fn().mockResolvedValue(undefined),
      denyAccountRequest: vi.fn().mockResolvedValue(undefined),
    };

    analyticsService = {
      getStats: vi.fn().mockResolvedValue({
        todayPageViews: 1,
        weekPageViews: 2,
        monthPageViews: 3,
        yearPageViews: 4,
        totalPageViews: 5,
        totalPrayers: 6,
        currentPrayers: 7,
        answeredPrayers: 8,
        archivedPrayers: 9,
        totalSubscribers: 10,
        activeEmailSubscribers: 11,
        loading: false
      })
    };

    adminAuthService = {
      user$: of({ email: 'admin@example.com' }),
      recordActivity: vi.fn()
    };

    router = { navigate: vi.fn() };
    cdr = { markForCheck: vi.fn() };

    component = new AdminComponent(router, adminDataService, analyticsService, adminAuthService, cdr);
  });

  it('subscribes and fetches admin data on init', () => {
    const autoSpy = vi.spyOn(component as any, 'autoProgressTabs');

    component.ngOnInit();

    expect(adminDataService.fetchAdminData).toHaveBeenCalled();

    // push data through observable and ensure handler runs
    adminDataService.data$.next({ pendingPrayers: [], pendingUpdates: [] });
    expect(component['adminData']).toBeTruthy();
    expect(cdr.markForCheck).toHaveBeenCalled();
    expect(autoSpy).toHaveBeenCalled();
  });

  it('autoProgressTabs moves tabs based on data (prayers -> updates)', () => {
    component.activeTab = 'prayers';
    component['adminData'] = { pendingPrayers: [], pendingUpdates: [{ id: 'u1' }], pendingDeletions: [] };
    const tabSpy = vi.spyOn(component, 'onTabChange');
    component['autoProgressTabs']();
    expect(tabSpy).toHaveBeenCalledWith('updates');
  });

  it('autoProgressTabs cycles correctly for updates and deletions', () => {
    component.activeTab = 'updates';
    component['adminData'] = { pendingUpdates: [], pendingDeletions: [{ id: 'd1' }], pendingPrayers: [] };
    const tabSpy = vi.spyOn(component, 'onTabChange');
    component['autoProgressTabs']();
    expect(tabSpy).toHaveBeenCalledWith('deletions');

    component.activeTab = 'deletions';
    component['adminData'] = { pendingDeletions: [], pendingPrayers: [{ id: 'p1' }], pendingUpdates: [] };
    component['autoProgressTabs']();
    expect(tabSpy).toHaveBeenCalledWith('prayers');
  });

  it('loadAnalytics sets stats on success and toggles loading', async () => {
    component.analyticsStats.loading = false;
    await component.loadAnalytics();
    expect(analyticsService.getStats).toHaveBeenCalled();
    expect(component.analyticsStats.totalPageViews).toBe(5);
    expect(cdr.markForCheck).toHaveBeenCalled();
  });

  it('loadAnalytics handles errors without throwing', async () => {
    analyticsService.getStats = vi.fn().mockRejectedValue(new Error('fail'));
    component.analyticsStats.loading = false;
    await component.loadAnalytics();
    expect(component.analyticsStats.loading).toBe(false);
  });

  it('onTabChange triggers loadAnalytics for settings', () => {
    const loadSpy = vi.spyOn(component, 'loadAnalytics');
    component.activeSettingsTab = 'analytics';
    component.analyticsStats.totalPageViews = 0;
    component.onTabChange('settings');
    expect(component.activeTab).toBe('settings');
    expect(loadSpy).toHaveBeenCalled();
  });

  it('onSettingsTabChange triggers loadAnalytics when analytics selected', () => {
    const loadSpy = vi.spyOn(component, 'loadAnalytics');
    component.analyticsStats.totalPageViews = 0;
    component.onSettingsTabChange('analytics');
    expect(component.activeSettingsTab).toBe('analytics');
    expect(loadSpy).toHaveBeenCalled();
  });

  it('totalPendingCount returns correct sum', () => {
    component['adminData'] = {
      pendingPrayers: [1, 2],
      pendingUpdates: [1],
      pendingDeletionRequests: [1, 2, 3],
      pendingUpdateDeletionRequests: [],
      pendingAccountRequests: [1]
    };
    expect(component.totalPendingCount).toBe(7);
  });

  it('goToHome navigates to root', () => {
    component.goToHome();
    expect(router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('refresh calls adminDataService.refresh', () => {
    component.refresh();
    expect(adminDataService.refresh).toHaveBeenCalled();
  });

  it('approvePrayer/denyPrayer call service and autoProgressTabs', async () => {
    const autoSpy = vi.spyOn(component as any, 'autoProgressTabs');
    await component.approvePrayer('p1');
    expect(adminDataService.approvePrayer).toHaveBeenCalledWith('p1');
    expect(autoSpy).toHaveBeenCalled();

    await component.denyPrayer('p2', 'reason');
    expect(adminDataService.denyPrayer).toHaveBeenCalledWith('p2', 'reason');
    expect(autoSpy).toHaveBeenCalled();
  });

  it('trackBy functions return ids', () => {
    expect(component.trackByPrayerId(0, { id: 'a' })).toBe('a');
    expect(component.trackByUpdateId(0, { id: 'b' })).toBe('b');
    expect(component.trackByDeletionRequestId(0, { id: 'c' })).toBe('c');
    expect(component.trackByAccountRequestId(0, { id: 'd' })).toBe('d');
  });

  it('approveAccountRequest and denyAccountRequest call service and markForCheck', async () => {
    await component.approveAccountRequest('acct1');
    expect(adminDataService.approveAccountRequest).toHaveBeenCalledWith('acct1');
    expect(cdr.markForCheck).toHaveBeenCalled();

    await component.denyAccountRequest('acct2', 'no');
    expect(adminDataService.denyAccountRequest).toHaveBeenCalledWith('acct2', 'no');
    expect(cdr.markForCheck).toHaveBeenCalled();
  });

  it('getAdminEmail reads from localStorage keys in priority', () => {
    localStorage.clear();
    localStorage.setItem('prayerapp_user_email', 'p@x.com');
    expect(component.getAdminEmail()).toBe('p@x.com');

    localStorage.setItem('userEmail', 'u@x.com');
    expect(component.getAdminEmail()).toBe('u@x.com');

    localStorage.setItem('approvalAdminEmail', 'a@x.com');
    expect(component.getAdminEmail()).toBe('a@x.com');
  });

  it('ngOnDestroy calls next and complete on destroy$', () => {
    const next = vi.fn();
    const complete = vi.fn();
    (component as any).destroy$ = { next, complete };
    component.ngOnDestroy();
    expect(next).toHaveBeenCalled();
    expect(complete).toHaveBeenCalled();
  });

  it('recordActivity calls adminAuthService.recordActivity', () => {
    component.recordActivity();
    expect(adminAuthService.recordActivity).toHaveBeenCalled();
  });

  it('handles service errors in various async methods without throwing', async () => {
    const error = new Error('boom');
    // spy on console.error to ensure catch blocks run
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    adminDataService.approvePrayer = vi.fn().mockRejectedValue(error);
    await component.approvePrayer('pX');
    expect(adminDataService.approvePrayer).toHaveBeenCalledWith('pX');

    adminDataService.denyPrayer = vi.fn().mockRejectedValue(error);
    await component.denyPrayer('pY', 'r');
    expect(adminDataService.denyPrayer).toHaveBeenCalledWith('pY', 'r');

    adminDataService.editPrayer = vi.fn().mockRejectedValue(error);
    await component.editPrayer('pZ', { foo: 'bar' });
    expect(adminDataService.editPrayer).toHaveBeenCalledWith('pZ', { foo: 'bar' });

    adminDataService.approveUpdate = vi.fn().mockRejectedValue(error);
    await component.approveUpdate('uX');
    expect(adminDataService.approveUpdate).toHaveBeenCalledWith('uX');

    adminDataService.denyUpdate = vi.fn().mockRejectedValue(error);
    await component.denyUpdate('uY', 'r');
    expect(adminDataService.denyUpdate).toHaveBeenCalledWith('uY', 'r');

    adminDataService.editUpdate = vi.fn().mockRejectedValue(error);
    await component.editUpdate('uZ', { up: 1 });
    expect(adminDataService.editUpdate).toHaveBeenCalledWith('uZ', { up: 1 });

    adminDataService.approveDeletionRequest = vi.fn().mockRejectedValue(error);
    await component.approveDeletionRequest('dX');
    expect(adminDataService.approveDeletionRequest).toHaveBeenCalledWith('dX');

    adminDataService.denyDeletionRequest = vi.fn().mockRejectedValue(error);
    await component.denyDeletionRequest('dY', 'r');
    expect(adminDataService.denyDeletionRequest).toHaveBeenCalledWith('dY', 'r');

    adminDataService.approveUpdateDeletionRequest = vi.fn().mockRejectedValue(error);
    await component.approveUpdateDeletionRequest('udX');
    expect(adminDataService.approveUpdateDeletionRequest).toHaveBeenCalledWith('udX');

    adminDataService.denyUpdateDeletionRequest = vi.fn().mockRejectedValue(error);
    await component.denyUpdateDeletionRequest('udY', 'r');
    expect(adminDataService.denyUpdateDeletionRequest).toHaveBeenCalledWith('udY', 'r');

    // account approve/deny error paths
    adminDataService.approveAccountRequest = vi.fn().mockRejectedValue(error);
    await component.approveAccountRequest('acctX');
    expect(adminDataService.approveAccountRequest).toHaveBeenCalledWith('acctX');

    adminDataService.denyAccountRequest = vi.fn().mockRejectedValue(error);
    await component.denyAccountRequest('acctY', 'no');
    expect(adminDataService.denyAccountRequest).toHaveBeenCalledWith('acctY', 'no');

    // restore console
    errSpy.mockRestore();
  });

  it('does not call loadAnalytics when totalPageViews non-zero', () => {
    const loadSpy = vi.spyOn(component, 'loadAnalytics');
    component.analyticsStats.totalPageViews = 10;
    component.onTabChange('settings');
    expect(loadSpy).not.toHaveBeenCalled();

    component.analyticsStats.totalPageViews = 10;
    component.onSettingsTabChange('analytics');
    expect(loadSpy).not.toHaveBeenCalled();
  });

  it('ngOnInit triggers loadAnalytics when already on settings/analytics', () => {
    const loadSpy = vi.spyOn(component, 'loadAnalytics');
    component.activeTab = 'settings';
    component.activeSettingsTab = 'analytics';
    component.analyticsStats.totalPageViews = 0;
    component.ngOnInit();
    expect(adminDataService.fetchAdminData).toHaveBeenCalled();
    expect(loadSpy).toHaveBeenCalled();
  });

  it('handle*Save methods are callable and log', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    component.handleBrandingSave();
    component.handlePromptManagerSave();
    component.handlePrayerTypesManagerSave();
    component.handleEmailSettingsSave();
    component.handleUserManagementSave();
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('getAdminEmail returns empty string when no keys', () => {
    localStorage.clear();
    expect(component.getAdminEmail()).toBe('');
  });

  it('autoProgressTabs returns early when no adminData', () => {
    (component as any).adminData = null;
    const spy = vi.spyOn(component, 'onTabChange');
    component['autoProgressTabs']();
    expect(spy).not.toHaveBeenCalled();
  });

  it('autoProgressTabs moves prayers->deletions when updates empty but deletions exist', () => {
    component.activeTab = 'prayers';
    component['adminData'] = { pendingPrayers: [], pendingUpdates: [], pendingDeletions: [{ id: 'del1' }] };
    const tabSpy = vi.spyOn(component, 'onTabChange');
    component['autoProgressTabs']();
    expect(tabSpy).toHaveBeenCalledWith('deletions');
  });

  it('autoProgressTabs moves updates->prayers when deletions empty but prayers exist', () => {
    component.activeTab = 'updates';
    component['adminData'] = { pendingUpdates: [], pendingDeletions: [], pendingPrayers: [{ id: 'p1' }] };
    const tabSpy = vi.spyOn(component, 'onTabChange');
    component['autoProgressTabs']();
    expect(tabSpy).toHaveBeenCalledWith('prayers');
  });

  it('autoProgressTabs moves deletions->updates when deletions empty but updates exist', () => {
    component.activeTab = 'deletions';
    component['adminData'] = { pendingDeletions: [], pendingPrayers: [], pendingUpdates: [{ id: 'u1' }] };
    const tabSpy = vi.spyOn(component, 'onTabChange');
    component['autoProgressTabs']();
    expect(tabSpy).toHaveBeenCalledWith('updates');
  });

  it('totalPendingCount returns 0 when adminData is null or missing fields', () => {
    (component as any).adminData = null;
    expect(component.totalPendingCount).toBe(0);

    component['adminData'] = {};
    expect(component.totalPendingCount).toBe(0);
  });

  it('onTabChange does not call loadAnalytics when settings selected but not analytics tab', () => {
    const loadSpy = vi.spyOn(component, 'loadAnalytics');
    component.activeSettingsTab = 'email';
    component.analyticsStats.totalPageViews = 0;
    component.onTabChange('settings');
    expect(loadSpy).not.toHaveBeenCalled();
  });

  it('autoProgressTabs does nothing when there are no pending items', () => {
    const tabSpy = vi.spyOn(component, 'onTabChange');
    component.activeTab = 'prayers';
    component['adminData'] = { pendingPrayers: [], pendingUpdates: [], pendingDeletions: [] };
    component['autoProgressTabs']();
    expect(tabSpy).not.toHaveBeenCalled();

    component.activeTab = 'updates';
    component['adminData'] = { pendingUpdates: [], pendingDeletions: [], pendingPrayers: [] };
    component['autoProgressTabs']();
    expect(tabSpy).not.toHaveBeenCalled();

    component.activeTab = 'deletions';
    component['adminData'] = { pendingDeletions: [], pendingPrayers: [], pendingUpdates: [] };
    component['autoProgressTabs']();
    expect(tabSpy).not.toHaveBeenCalled();
  });

  it('autoProgressTabs handles undefined fields and non-admin tabs gracefully', () => {
    const tabSpy = vi.spyOn(component, 'onTabChange');

    component.activeTab = 'prayers';
    component['adminData'] = { pendingPrayers: undefined, pendingUpdates: undefined, pendingDeletions: undefined };
    component['autoProgressTabs']();
    expect(tabSpy).not.toHaveBeenCalled();

    component.activeTab = 'updates';
    component['adminData'] = { pendingUpdates: undefined, pendingDeletions: undefined, pendingPrayers: undefined };
    component['autoProgressTabs']();
    expect(tabSpy).not.toHaveBeenCalled();

    component.activeTab = 'deletions';
    component['adminData'] = { pendingDeletions: undefined, pendingPrayers: undefined, pendingUpdates: undefined };
    component['autoProgressTabs']();
    expect(tabSpy).not.toHaveBeenCalled();

    // if activeTab is unrelated, nothing should happen
    component.activeTab = 'accounts' as any;
    component['adminData'] = { pendingPrayers: [], pendingUpdates: [], pendingDeletions: [] };
    component['autoProgressTabs']();
    expect(tabSpy).not.toHaveBeenCalled();
  });

  it('autoProgressTabs does not change tabs when pending lists are non-empty (prayers)', () => {
    const tabSpy = vi.spyOn(component, 'onTabChange');
    component.activeTab = 'prayers';
    component['adminData'] = { pendingPrayers: [{ id: 'p1' }], pendingUpdates: [], pendingDeletions: [] };
    component['autoProgressTabs']();
    expect(tabSpy).not.toHaveBeenCalled();
  });

  it('autoProgressTabs does not change tabs when pending lists are non-empty (updates)', () => {
    const tabSpy = vi.spyOn(component, 'onTabChange');
    component.activeTab = 'updates';
    component['adminData'] = { pendingUpdates: [{ id: 'u1' }], pendingDeletions: [], pendingPrayers: [] };
    component['autoProgressTabs']();
    expect(tabSpy).not.toHaveBeenCalled();
  });

  it('autoProgressTabs does not change tabs when pending lists are non-empty (deletions)', () => {
    const tabSpy = vi.spyOn(component, 'onTabChange');
    component.activeTab = 'deletions';
    component['adminData'] = { pendingDeletions: [{ id: 'd1' }], pendingPrayers: [], pendingUpdates: [] };
    component['autoProgressTabs']();
    expect(tabSpy).not.toHaveBeenCalled();
  });

  it('async methods call service on success and trigger autoProgressTabs where appropriate', async () => {
    const autoSpy = vi.spyOn(component as any, 'autoProgressTabs');

    adminDataService.approveUpdate = vi.fn().mockResolvedValue(undefined);
    await component.approveUpdate('u1');
    expect(adminDataService.approveUpdate).toHaveBeenCalledWith('u1');
    expect(autoSpy).toHaveBeenCalled();

    adminDataService.denyUpdate = vi.fn().mockResolvedValue(undefined);
    await component.denyUpdate('u2', 'r');
    expect(adminDataService.denyUpdate).toHaveBeenCalledWith('u2', 'r');
    expect(autoSpy).toHaveBeenCalled();

    adminDataService.editUpdate = vi.fn().mockResolvedValue(undefined);
    await component.editUpdate('u3', { a: 1 });
    expect(adminDataService.editUpdate).toHaveBeenCalledWith('u3', { a: 1 });

    adminDataService.approveDeletionRequest = vi.fn().mockResolvedValue(undefined);
    await component.approveDeletionRequest('d1');
    expect(adminDataService.approveDeletionRequest).toHaveBeenCalledWith('d1');
    expect(autoSpy).toHaveBeenCalled();

    adminDataService.denyDeletionRequest = vi.fn().mockResolvedValue(undefined);
    await component.denyDeletionRequest('d2', 'r');
    expect(adminDataService.denyDeletionRequest).toHaveBeenCalledWith('d2', 'r');
    expect(autoSpy).toHaveBeenCalled();

    adminDataService.approveUpdateDeletionRequest = vi.fn().mockResolvedValue(undefined);
    await component.approveUpdateDeletionRequest('ud1');
    expect(adminDataService.approveUpdateDeletionRequest).toHaveBeenCalledWith('ud1');
    expect(autoSpy).toHaveBeenCalled();

    adminDataService.denyUpdateDeletionRequest = vi.fn().mockResolvedValue(undefined);
    await component.denyUpdateDeletionRequest('ud2', 'r');
    expect(adminDataService.denyUpdateDeletionRequest).toHaveBeenCalledWith('ud2', 'r');
    expect(autoSpy).toHaveBeenCalled();
  });

  describe('getAdminEmail', () => {
    it('should return admin email from localStorage', () => {
      localStorage.setItem('approvalAdminEmail', 'admin@test.com');
      const email = component.getAdminEmail();
      expect(email).toBe('admin@test.com');
      localStorage.clear();
    });

    it('should return empty string when no email in localStorage', () => {
      localStorage.clear();
      const email = component.getAdminEmail();
      expect(email).toBe('');
    });
  });

  describe('denyPrayer', () => {
    it('should call adminDataService.denyPrayer and trigger autoProgressTabs', async () => {
      const autoSpy = vi.spyOn(component as any, 'autoProgressTabs');
      adminDataService.denyPrayer = vi.fn().mockResolvedValue(undefined);

      await component.denyPrayer('p1', 'invalid content');

      expect(adminDataService.denyPrayer).toHaveBeenCalledWith('p1', 'invalid content');
      expect(autoSpy).toHaveBeenCalled();
    });

    it('should handle errors when denying prayer', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      adminDataService.denyPrayer = vi.fn().mockRejectedValue(new Error('API error'));

      await component.denyPrayer('p1', 'reason');

      expect(consoleSpy).toHaveBeenCalledWith('Error denying prayer:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('editPrayer', () => {
    it('should call adminDataService.editPrayer with data', async () => {
      const prayerData = { title: 'Updated Prayer', description: 'Updated description' };
      adminDataService.editPrayer = vi.fn().mockResolvedValue(undefined);

      await component.editPrayer('p1', prayerData);

      expect(adminDataService.editPrayer).toHaveBeenCalledWith('p1', prayerData);
    });

    it('should show send notification dialog after editing prayer', async () => {
      component['adminData'] = {
        pendingPrayers: [{ id: 'p1', title: 'Test Prayer', approval_status: 'pending' }]
      };
      adminDataService.editPrayer = vi.fn().mockResolvedValue(undefined);

      await component.editPrayer('p1', { title: 'Updated' });

      expect(component.showSendNotificationDialog).toBe(true);
      expect(component.sendDialogType).toBe('prayer');
    });
  });

  describe('approveAccountRequest', () => {
    it('should call adminDataService.approveAccountRequest and mark for check', async () => {
      const markSpy = vi.spyOn(component.cdr, 'markForCheck');
      adminDataService.approveAccountRequest = vi.fn().mockResolvedValue(undefined);

      await component.approveAccountRequest('acc1');

      expect(adminDataService.approveAccountRequest).toHaveBeenCalledWith('acc1');
      expect(markSpy).toHaveBeenCalled();
    });

    it('should handle errors when approving account request', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      adminDataService.approveAccountRequest = vi.fn().mockRejectedValue(new Error('API error'));

      await component.approveAccountRequest('acc1');

      expect(consoleSpy).toHaveBeenCalledWith('Error approving account request:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('denyAccountRequest', () => {
    it('should call adminDataService.denyAccountRequest with reason', async () => {
      const markSpy = vi.spyOn(component.cdr, 'markForCheck');
      adminDataService.denyAccountRequest = vi.fn().mockResolvedValue(undefined);

      await component.denyAccountRequest('acc1', 'invalid email');

      expect(adminDataService.denyAccountRequest).toHaveBeenCalledWith('acc1', 'invalid email');
      expect(markSpy).toHaveBeenCalled();
    });

    it('should handle errors when denying account request', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      adminDataService.denyAccountRequest = vi.fn().mockRejectedValue(new Error('API error'));

      await component.denyAccountRequest('acc1', 'reason');

      expect(consoleSpy).toHaveBeenCalledWith('Error denying account request:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('onConfirmSendNotification', () => {
    it('should call sendApprovedPrayerEmails for approved prayer', async () => {
      component.sendDialogType = 'prayer';
      component.sendDialogPrayerId = 'p1';
      component['adminData'] = {
        pendingPrayers: [{ id: 'p1', approval_status: 'approved' }]
      };
      adminDataService.sendApprovedPrayerEmails = vi.fn().mockResolvedValue(undefined);

      await component.onConfirmSendNotification();

      expect(adminDataService.sendApprovedPrayerEmails).toHaveBeenCalledWith('p1');
    });

    it('should call sendBroadcastNotificationForNewPrayer for pending prayer', async () => {
      component.sendDialogType = 'prayer';
      component.sendDialogPrayerId = 'p1';
      component['adminData'] = {
        pendingPrayers: [{ id: 'p1', approval_status: 'pending' }]
      };
      adminDataService.sendBroadcastNotificationForNewPrayer = vi.fn().mockResolvedValue(undefined);

      await component.onConfirmSendNotification();

      expect(adminDataService.sendBroadcastNotificationForNewPrayer).toHaveBeenCalledWith('p1');
    });

    it('should call sendApprovedUpdateEmails for approved update', async () => {
      component.sendDialogType = 'update';
      component.sendDialogUpdateId = 'u1';
      component['adminData'] = {
        pendingUpdates: [{ id: 'u1', approval_status: 'approved' }]
      };
      adminDataService.sendApprovedUpdateEmails = vi.fn().mockResolvedValue(undefined);

      await component.onConfirmSendNotification();

      expect(adminDataService.sendApprovedUpdateEmails).toHaveBeenCalledWith('u1');
    });

    it('should close dialog after sending notification', async () => {
      const declineSpy = vi.spyOn(component, 'onDeclineSendNotification');
      component.sendDialogType = 'prayer';
      component.sendDialogPrayerId = 'p1';
      component['adminData'] = {
        pendingPrayers: [{ id: 'p1', approval_status: 'approved' }]
      };
      adminDataService.sendApprovedPrayerEmails = vi.fn().mockResolvedValue(undefined);

      await component.onConfirmSendNotification();

      expect(declineSpy).toHaveBeenCalled();
    });
  });

  describe('onDeclineSendNotification', () => {
    it('should close notification dialog and clear state', () => {
      component.showSendNotificationDialog = true;
      component.sendDialogPrayerId = 'p1';
      component.sendDialogUpdateId = 'u1';

      component.onDeclineSendNotification();

      expect(component.showSendNotificationDialog).toBe(false);
      expect(component.sendDialogPrayerId).toBeUndefined();
      expect(component.sendDialogUpdateId).toBeUndefined();
    });
  });

  describe('Tab management', () => {
    it('should initialize with prayers as active tab', () => {
      expect(component.activeTab).toBe('prayers');
    });

    it('should initialize with analytics as active settings tab', () => {
      expect(component.activeSettingsTab).toBe('analytics');
    });

    it('should update activeTab when onTabChange is called', () => {
      component.onTabChange('updates');
      expect(component.activeTab).toBe('updates');

      component.onTabChange('deletions');
      expect(component.activeTab).toBe('deletions');

      component.onTabChange('accounts');
      expect(component.activeTab).toBe('accounts');

      component.onTabChange('settings');
      expect(component.activeTab).toBe('settings');
    });

    it('should update activeSettingsTab when onSettingsTabChange is called', () => {
      component.onSettingsTabChange('email');
      expect(component.activeSettingsTab).toBe('email');

      component.onSettingsTabChange('users');
      expect(component.activeSettingsTab).toBe('users');

      component.onSettingsTabChange('content');
      expect(component.activeSettingsTab).toBe('content');
    });
  });

  describe('Component initialization', () => {
    it('should have correct initial state for analytics stats', () => {
      expect(component.analyticsStats).toBeDefined();
      expect(component.analyticsStats.loading).toBe(false);
    });

    it('should have correct initial counts', () => {
      expect(component.totalPendingCount).toBe(0);
    });

    it('should initialize with default active tabs', () => {
      expect(component.activeTab).toBe('prayers');
      expect(component.activeSettingsTab).toBe('analytics');
    });
  });

  describe('Service method integration', () => {
    it('should properly pass through all prayer approval operations', async () => {
      adminDataService.approvePrayer = vi.fn().mockResolvedValue(undefined);
      await component.approvePrayer('prayer-123');
      expect(adminDataService.approvePrayer).toHaveBeenCalledWith('prayer-123');
    });

    it('should properly pass through all prayer denial operations', async () => {
      adminDataService.denyPrayer = vi.fn().mockResolvedValue(undefined);
      await component.denyPrayer('prayer-456', 'inappropriate content');
      expect(adminDataService.denyPrayer).toHaveBeenCalledWith('prayer-456', 'inappropriate content');
    });

    it('should properly pass through all update approval operations', async () => {
      adminDataService.approveUpdate = vi.fn().mockResolvedValue(undefined);
      await component.approveUpdate('update-789');
      expect(adminDataService.approveUpdate).toHaveBeenCalledWith('update-789');
    });
  });

  describe('Error handling', () => {
    it('should handle loadAnalytics errors gracefully', async () => {
      analyticsService.getStats = vi.fn().mockRejectedValue(new Error('Network error'));
      await component.loadAnalytics();
      expect(component.analyticsStats.loading).toBe(false);
    });

    it('should handle approvePrayer errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      adminDataService.approvePrayer = vi.fn().mockRejectedValue(new Error('API error'));

      await component.approvePrayer('p1');

      expect(consoleSpy).toHaveBeenCalledWith('Error approving prayer:', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('should handle editUpdate errors', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      adminDataService.editUpdate = vi.fn().mockRejectedValue(new Error('API error'));

      await component.editUpdate('u1', {});

      expect(consoleSpy).toHaveBeenCalledWith('Error editing update:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('UI State management', () => {
    it('should manage notification dialog visibility correctly', () => {
      expect(component.showSendNotificationDialog).toBe(false);

      component.sendDialogPrayerId = 'p1';
      component.showSendNotificationDialog = true;
      expect(component.showSendNotificationDialog).toBe(true);

      component.onDeclineSendNotification();
      expect(component.showSendNotificationDialog).toBe(false);
    });

    it('should track active tabs correctly', () => {
      const tabs: Array<'prayers' | 'updates' | 'deletions' | 'accounts' | 'settings'> = [
        'prayers',
        'updates',
        'deletions',
        'accounts',
        'settings'
      ];

      tabs.forEach(tab => {
        component.onTabChange(tab);
        expect(component.activeTab).toBe(tab);
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to home when goToHome is called', () => {
      component.goToHome();
      expect(router.navigate).toHaveBeenCalledWith(['/']);
    });
  });

  describe('Refresh functionality', () => {
    it('should call admin data service refresh method', () => {
      component.refresh();
      expect(adminDataService.refresh).toHaveBeenCalled();
    });
  });

  describe('approveUpdate with notification dialog', () => {
    it('should show notification dialog after approving update', async () => {
      component['adminData'] = {
        pendingUpdates: [{ id: 'u1', prayer_title: 'Test Prayer', approval_status: 'pending' }]
      };
      adminDataService.approveUpdate = vi.fn().mockResolvedValue(undefined);

      await component.approveUpdate('u1');

      expect(component.showSendNotificationDialog).toBe(true);
      expect(component.sendDialogType).toBe('update');
      expect(component.sendDialogUpdateId).toBe('u1');
    });

    it('should handle error when approving update', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      adminDataService.approveUpdate = vi.fn().mockRejectedValue(new Error('API error'));

      await component.approveUpdate('u1');

      expect(consoleSpy).toHaveBeenCalledWith('Error approving update:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('Deletion requests', () => {
    it('should approve deletion requests and trigger autoProgressTabs', async () => {
      const autoSpy = vi.spyOn(component as any, 'autoProgressTabs');
      adminDataService.approveDeletionRequest = vi.fn().mockResolvedValue(undefined);

      await component.approveDeletionRequest('d1');

      expect(adminDataService.approveDeletionRequest).toHaveBeenCalledWith('d1');
      expect(autoSpy).toHaveBeenCalled();
    });

    it('should deny deletion requests with reason', async () => {
      const autoSpy = vi.spyOn(component as any, 'autoProgressTabs');
      adminDataService.denyDeletionRequest = vi.fn().mockResolvedValue(undefined);

      await component.denyDeletionRequest('d1', 'not enough context');

      expect(adminDataService.denyDeletionRequest).toHaveBeenCalledWith('d1', 'not enough context');
      expect(autoSpy).toHaveBeenCalled();
    });

    it('should approve update deletion requests', async () => {
      const autoSpy = vi.spyOn(component as any, 'autoProgressTabs');
      adminDataService.approveUpdateDeletionRequest = vi.fn().mockResolvedValue(undefined);

      await component.approveUpdateDeletionRequest('ud1');

      expect(adminDataService.approveUpdateDeletionRequest).toHaveBeenCalledWith('ud1');
      expect(autoSpy).toHaveBeenCalled();
    });

    it('should deny update deletion requests with reason', async () => {
      const autoSpy = vi.spyOn(component as any, 'autoProgressTabs');
      adminDataService.denyUpdateDeletionRequest = vi.fn().mockResolvedValue(undefined);

      await component.denyUpdateDeletionRequest('ud1', 'not approved for deletion');

      expect(adminDataService.denyUpdateDeletionRequest).toHaveBeenCalledWith('ud1', 'not approved for deletion');
      expect(autoSpy).toHaveBeenCalled();
    });
  });

  describe('Data loading and refresh', () => {
    it('should refresh admin data', () => {
      component.refresh();
      expect(adminDataService.refresh).toHaveBeenCalled();
    });

    it('should load analytics on demand', async () => {
      analyticsService.getStats = vi.fn().mockResolvedValue({});
      await component.loadAnalytics();
      expect(analyticsService.getStats).toHaveBeenCalled();
    });
  });
});




