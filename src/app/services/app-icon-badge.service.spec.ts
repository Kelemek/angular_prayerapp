import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BehaviorSubject, Subject } from 'rxjs';
import {
  AppIconBadgeService,
  createCapawesomeAppIconBadgeNative,
  type AppIconBadgeNativeApi,
} from './app-icon-badge.service';
import { BadgeService } from './badge.service';
import { AdminPendingCountService } from './admin-pending-count.service';
import { APP_BECAME_VISIBLE_EVENT } from '../../lib/visible-page-recovery';

const capacitorCore = vi.hoisted(() => ({
  isNativePlatform: vi.fn(() => false),
  isPluginAvailable: vi.fn(() => false),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: capacitorCore,
}));

const capawesomeBadge = vi.hoisted(() => ({
  requestPermissions: vi.fn(async () => ({ display: 'granted' })),
  get: vi.fn(async () => ({ count: 5 })),
  set: vi.fn(async () => undefined),
}));

vi.mock('@capawesome/capacitor-badge', () => ({
  Badge: capawesomeBadge,
}));

function createNativeMock(options: { available?: boolean; initialCount?: number } = {}) {
  return {
    isAvailable: vi.fn(() => options.available ?? true),
    requestPermissions: vi.fn(async () => undefined),
    get: vi.fn(async () => options.initialCount ?? 0),
    set: vi.fn(async () => undefined),
  } satisfies AppIconBadgeNativeApi;
}

async function flush(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
}

describe('AppIconBadgeService', () => {
  let service: AppIconBadgeService;
  let updateBadgesChanged$: Subject<void>;
  let badgesEnabled$: BehaviorSubject<boolean>;
  let pendingApprovals$: BehaviorSubject<number | null>;
  let adminPendingCount: { iconPendingCount$: BehaviorSubject<number | null>; refresh: ReturnType<typeof vi.fn> };
  let badgeService: {
    getUpdateBadgesChanged$: ReturnType<typeof vi.fn>;
    getBadgeFunctionalityEnabled$: ReturnType<typeof vi.fn>;
    isDisplayedTotalResolved: ReturnType<typeof vi.fn>;
    getDisplayedBadgeTotal: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    updateBadgesChanged$ = new Subject<void>();
    badgesEnabled$ = new BehaviorSubject(true);
    badgeService = {
      getUpdateBadgesChanged$: vi.fn(() => updateBadgesChanged$.asObservable()),
      getBadgeFunctionalityEnabled$: vi.fn(() => badgesEnabled$.asObservable()),
      isDisplayedTotalResolved: vi.fn(() => true),
      getDisplayedBadgeTotal: vi.fn(() => (badgesEnabled$.value ? 4 : 0)),
    };
    pendingApprovals$ = new BehaviorSubject<number | null>(0);
    adminPendingCount = {
      iconPendingCount$: pendingApprovals$,
      refresh: vi.fn(async () => undefined),
    };
    service = new AppIconBadgeService(
      badgeService as unknown as BadgeService,
      adminPendingCount as unknown as AdminPendingCountService
    );
  });

  it('adds pending approvals to unread for admins', async () => {
    pendingApprovals$.next(3);
    const native = createNativeMock();
    service.setNativeApiForTests(native);
    await service.start();
    expect(native.set).toHaveBeenLastCalledWith(7);

    pendingApprovals$.next(1);
    await flush();
    expect(native.set).toHaveBeenLastCalledWith(5);
  });

  it('shows pending approvals even when the admin has no unread', async () => {
    badgeService.getDisplayedBadgeTotal.mockReturnValue(0);
    pendingApprovals$.next(2);
    const native = createNativeMock();
    service.setNativeApiForTests(native);
    await service.start();
    expect(native.set).toHaveBeenLastCalledWith(2);
  });

  it('does not write while the pending count is still loading', async () => {
    badgeService.getDisplayedBadgeTotal.mockReturnValue(0);
    pendingApprovals$.next(null);
    const native = createNativeMock({ initialCount: 4 });
    service.setNativeApiForTests(native);
    await service.start();
    updateBadgesChanged$.next();
    await flush();
    expect(native.set).not.toHaveBeenCalled();

    pendingApprovals$.next(4);
    await flush();
    expect(native.set).not.toHaveBeenCalled();
  });

  it('refreshes pending approvals when the app becomes visible', async () => {
    const native = createNativeMock();
    service.setNativeApiForTests(native);
    await service.start();
    window.dispatchEvent(new CustomEvent(APP_BECAME_VISIBLE_EVENT));
    expect(adminPendingCount.refresh).toHaveBeenCalled();
  });

  it('does not touch native APIs on web or binaries without the plugin', async () => {
    const native = createNativeMock({ available: false });
    service.setNativeApiForTests(native);
    await service.start();
    await service.sync();
    expect(native.requestPermissions).not.toHaveBeenCalled();
    expect(native.get).not.toHaveBeenCalled();
    expect(native.set).not.toHaveBeenCalled();
  });

  it('sets the icon to the displayed in-app total on start', async () => {
    const native = createNativeMock();
    service.setNativeApiForTests(native);
    await service.start();
    expect(native.requestPermissions).toHaveBeenCalled();
    expect(native.set).toHaveBeenCalledWith(4);
  });

  it('does not write 0 at launch before the total is resolved', async () => {
    badgeService.isDisplayedTotalResolved.mockReturnValue(false);
    badgeService.getDisplayedBadgeTotal.mockReturnValue(0);
    const native = createNativeMock({ initialCount: 6 });
    service.setNativeApiForTests(native);
    await service.start();
    updateBadgesChanged$.next();
    window.dispatchEvent(new CustomEvent(APP_BECAME_VISIBLE_EVENT));
    await flush();
    expect(native.set).not.toHaveBeenCalled();
  });

  it('skips set when the persisted icon already matches the total', async () => {
    const native = createNativeMock({ initialCount: 4 });
    service.setNativeApiForTests(native);
    await service.start();
    expect(native.set).not.toHaveBeenCalled();
  });

  it('re-syncs on mark-read changes and never clears just because the app became visible', async () => {
    const native = createNativeMock();
    service.setNativeApiForTests(native);
    await service.start();
    native.set.mockClear();

    badgeService.getDisplayedBadgeTotal.mockReturnValue(2);
    updateBadgesChanged$.next();
    await flush();
    expect(native.set).toHaveBeenCalledWith(2);

    native.set.mockClear();
    window.dispatchEvent(new CustomEvent(APP_BECAME_VISIBLE_EVENT));
    await flush();
    expect(native.set).not.toHaveBeenCalled();
  });

  it('sets 0 when badge functionality is turned off even with unread items', async () => {
    const native = createNativeMock();
    service.setNativeApiForTests(native);
    await service.start();
    native.set.mockClear();

    badgesEnabled$.next(false);
    await flush();
    expect(native.set).toHaveBeenCalledWith(0);
  });

  it('keeps working when permission or native calls fail', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const native = createNativeMock();
    native.requestPermissions.mockRejectedValue(new Error('denied'));
    native.set.mockRejectedValueOnce(new Error('native fail'));
    service.setNativeApiForTests(native);

    await expect(service.start()).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();

    await service.sync();
    expect(native.set).toHaveBeenLastCalledWith(4);
    warnSpy.mockRestore();
  });

  it('waits for an in-flight write and finishes on the newest total', async () => {
    const native = createNativeMock();
    service.setNativeApiForTests(native);
    await service.start();
    native.set.mockClear();

    let finishFirstWrite: () => void = () => undefined;
    native.set.mockImplementationOnce(
      () => new Promise<void>((resolve) => (finishFirstWrite = resolve)),
    );
    badgeService.getDisplayedBadgeTotal.mockReturnValue(7);
    const first = service.sync();
    await flush();
    badgeService.getDisplayedBadgeTotal.mockReturnValue(5);
    const second = service.sync();
    await flush();
    expect(native.set.mock.calls).toEqual([[7]]);

    finishFirstWrite();
    await Promise.all([first, second]);
    expect(native.set.mock.calls).toEqual([[7], [5]]);
  });

  it('start is idempotent', async () => {
    const native = createNativeMock();
    service.setNativeApiForTests(native);
    await service.start();
    native.requestPermissions.mockClear();
    await service.start();
    expect(native.requestPermissions).not.toHaveBeenCalled();
  });
});

describe('createCapawesomeAppIconBadgeNative', () => {
  it('is unavailable unless native and the Badge plugin is registered', () => {
    const api = createCapawesomeAppIconBadgeNative();
    capacitorCore.isNativePlatform.mockReturnValue(true);
    capacitorCore.isPluginAvailable.mockReturnValue(false);
    expect(api.isAvailable()).toBe(false);
    capacitorCore.isPluginAvailable.mockReturnValue(true);
    expect(api.isAvailable()).toBe(true);
  });

  it('delegates permissions, get, and set to Capawesome Badge', async () => {
    const api = createCapawesomeAppIconBadgeNative();
    await api.requestPermissions();
    await expect(api.get()).resolves.toBe(5);
    await api.set(3);
    expect(capawesomeBadge.requestPermissions).toHaveBeenCalled();
    expect(capawesomeBadge.set).toHaveBeenCalledWith({ count: 3 });
  });
});
