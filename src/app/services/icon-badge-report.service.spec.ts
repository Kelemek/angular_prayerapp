import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BehaviorSubject, Subject } from 'rxjs';
import { IconBadgeReportService } from './icon-badge-report.service';
import { BadgeService } from './badge.service';
import { SupabaseService } from './supabase.service';
import { UserSessionService } from './user-session.service';

describe('IconBadgeReportService', () => {
  let service: IconBadgeReportService;
  let session$: BehaviorSubject<{ email: string } | null>;
  let enabled$: BehaviorSubject<boolean>;
  let updates$: Subject<void>;
  let resolved: boolean;
  let total: number;
  let rpc: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    session$ = new BehaviorSubject<{ email: string } | null>({ email: 'Me@Example.com' });
    enabled$ = new BehaviorSubject(true);
    updates$ = new Subject<void>();
    resolved = true;
    total = 4;
    rpc = vi.fn().mockResolvedValue({ error: null });

    const badgeService = {
      getUpdateBadgesChanged$: () => updates$.asObservable(),
      getBadgeFunctionalityEnabled$: () => enabled$.asObservable(),
      isBadgeFunctionalityEnabled: () => enabled$.value,
      isDisplayedTotalResolved: () => resolved,
      getDisplayedBadgeTotal: () => total,
    };
    const userSession = {
      userSession$: session$.asObservable(),
      getUserEmail: () => session$.value?.email ?? null,
    };
    service = new IconBadgeReportService(
      badgeService as unknown as BadgeService,
      userSession as unknown as UserSessionService,
      { rpc } as unknown as SupabaseService,
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function settle(): Promise<void> {
    await vi.advanceTimersByTimeAsync(2000);
  }

  it('reports the displayed total after it is resolved', async () => {
    service.start();
    await settle();
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('report_icon_badge_unread', {
      p_user_email: 'me@example.com',
      p_unread: 4,
      p_badges_enabled: true,
    });
  });

  it('does not report while the displayed total is unresolved', async () => {
    resolved = false;
    service.start();
    updates$.next();
    await settle();
    expect(rpc).not.toHaveBeenCalled();

    resolved = true;
    updates$.next();
    await settle();
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('report_icon_badge_unread', {
      p_user_email: 'me@example.com',
      p_unread: 4,
      p_badges_enabled: true,
    });
  });

  it('debounces a burst into one report of the latest total', async () => {
    service.start();
    total = 1;
    updates$.next();
    await vi.advanceTimersByTimeAsync(500);
    total = 2;
    updates$.next();
    await vi.advanceTimersByTimeAsync(500);
    total = 9;
    updates$.next();
    await vi.advanceTimersByTimeAsync(1999);
    expect(rpc).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('report_icon_badge_unread', {
      p_user_email: 'me@example.com',
      p_unread: 9,
      p_badges_enabled: true,
    });
  });

  it('skips a report when the email, total, and flag are unchanged', async () => {
    service.start();
    await settle();
    rpc.mockClear();

    updates$.next();
    await settle();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('reports again after logout and login with the same email', async () => {
    service.start();
    await settle();
    expect(rpc).toHaveBeenCalledTimes(1);
    rpc.mockClear();

    session$.next(null);
    await settle();
    expect(rpc).not.toHaveBeenCalled();

    session$.next({ email: 'me@example.com' });
    await settle();
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('report_icon_badge_unread', {
      p_user_email: 'me@example.com',
      p_unread: 4,
      p_badges_enabled: true,
    });
  });

  it('reports 0 with badges disabled when badge functionality is off', async () => {
    enabled$.next(false);
    total = 0;
    service.start();
    await settle();
    expect(rpc).toHaveBeenCalledWith('report_icon_badge_unread', {
      p_user_email: 'me@example.com',
      p_unread: 0,
      p_badges_enabled: false,
    });
  });

  it('does not throw when the rpc fails, and a later change still reports', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rpc.mockResolvedValueOnce({ error: { message: 'db down' } });
    service.start();
    await settle();
    expect(warn).toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledTimes(1);

    total = 6;
    updates$.next();
    await settle();
    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc).toHaveBeenLastCalledWith('report_icon_badge_unread', {
      p_user_email: 'me@example.com',
      p_unread: 6,
      p_badges_enabled: true,
    });
    warn.mockRestore();
  });
});
