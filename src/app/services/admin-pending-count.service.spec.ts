import { DestroyRef } from '@angular/core';
import { NavigationEnd, type Event, type Router } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { BehaviorSubject, firstValueFrom, Subject } from 'rxjs';
import { EMPTY_ADMIN_DATA, type AdminData } from '../types/admin-data';
import type { AdminPendingCounts } from '../lib/admin-pending-item-count';
import type { AdminAuthService } from './admin-auth.service';
import type { AdminDataReadService } from './admin-data-read.service';
import type { AdminDataService } from './admin-data.service';
import { AdminPendingCountService } from './admin-pending-count.service';

function zeroCounts(partial: Partial<AdminPendingCounts> = {}): AdminPendingCounts {
  return {
    prayers: 0,
    updates: 0,
    deletionRequests: 0,
    updateDeletionRequests: 0,
    accountRequests: 0,
    ...partial,
  };
}

describe('AdminPendingCountService', () => {
  function setup() {
    const hasAdminEmail$ = new BehaviorSubject(false);
    const loading$ = new BehaviorSubject(false);
    const adminEligibilityResolved$ = new BehaviorSubject(true);
    const data$ = new BehaviorSubject<AdminData>({ ...EMPTY_ADMIN_DATA });
    const events = new Subject<Event>();
    const fetchPendingCounts = vi.fn().mockResolvedValue(zeroCounts());
    const service = new AdminPendingCountService(
      { hasAdminEmail$, loading$, adminEligibilityResolved$ } as unknown as AdminAuthService,
      { fetchPendingCounts } as unknown as AdminDataReadService,
      { data$ } as unknown as AdminDataService,
      { events } as Router,
      { onDestroy: () => () => undefined } as unknown as DestroyRef,
    );

    let iconCount: number | null | undefined;
    service.iconPendingCount$.subscribe((value) => {
      iconCount = value;
    });

    return {
      hasAdminEmail$,
      loading$,
      adminEligibilityResolved$,
      iconCount: () => iconCount,
      data$,
      events,
      fetchPendingCounts,
      service,
      count: () => firstValueFrom(service.pendingApprovalItemCount$),
    };
  }

  async function settle(): Promise<void> {
    await Promise.resolve();
    await Promise.resolve();
  }

  it('does not query pending counts for a non-admin', async () => {
    const { fetchPendingCounts, service, count } = setup();

    await service.refresh();

    expect(fetchPendingCounts).not.toHaveBeenCalled();
    expect(await count()).toBe(0);
  });

  it('loads the raw pending total when the email becomes an admin', async () => {
    const { hasAdminEmail$, fetchPendingCounts, count } = setup();
    fetchPendingCounts.mockResolvedValue(zeroCounts({ prayers: 1, updates: 2 }));

    hasAdminEmail$.next(true);

    await vi.waitFor(async () => {
      expect(await count()).toBe(3);
    });
    expect(fetchPendingCounts).toHaveBeenCalledTimes(1);
  });

  it('clears the count on logout and fetches again when the same admin logs back in', async () => {
    const { hasAdminEmail$, fetchPendingCounts, count } = setup();
    fetchPendingCounts.mockResolvedValue(zeroCounts({ updates: 2 }));

    hasAdminEmail$.next(true);
    await vi.waitFor(async () => {
      expect(await count()).toBe(2);
    });
    expect(fetchPendingCounts).toHaveBeenCalledTimes(1);

    hasAdminEmail$.next(false);
    expect(await count()).toBe(0);

    hasAdminEmail$.next(true);
    await vi.waitFor(async () => {
      expect(fetchPendingCounts).toHaveBeenCalledTimes(2);
    });
    expect(await count()).toBe(2);
  });

  it('drops a count that resolves after logout', async () => {
    const { hasAdminEmail$, fetchPendingCounts, count } = setup();
    let resolveFetch: (value: AdminPendingCounts) => void = () => undefined;
    fetchPendingCounts.mockImplementation(
      () =>
        new Promise<AdminPendingCounts>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    hasAdminEmail$.next(true);
    expect(fetchPendingCounts).toHaveBeenCalledTimes(1);

    hasAdminEmail$.next(false);
    expect(await count()).toBe(0);

    resolveFetch(zeroCounts({ prayers: 9 }));
    await settle();
    expect(await count()).toBe(0);
  });

  it('ignores a loading or failed admin snapshot and applies a loaded one', async () => {
    const { hasAdminEmail$, data$, fetchPendingCounts, count } = setup();
    fetchPendingCounts.mockResolvedValue(zeroCounts({ prayers: 3 }));
    hasAdminEmail$.next(true);
    await vi.waitFor(async () => {
      expect(await count()).toBe(3);
    });

    data$.next({
      ...EMPTY_ADMIN_DATA,
      loading: true,
      pendingUpdates: [{}, {}] as AdminData['pendingUpdates'],
    });
    expect(await count()).toBe(3);

    data$.next({
      ...EMPTY_ADMIN_DATA,
      loading: false,
      error: 'failed',
      pendingPrayers: [{}] as AdminData['pendingPrayers'],
    });
    expect(await count()).toBe(3);

    data$.next({
      ...EMPTY_ADMIN_DATA,
      pendingUpdates: [{}, {}] as AdminData['pendingUpdates'],
    });
    expect(await count()).toBe(2);
  });

  it('does not apply a loaded admin snapshot after logout', async () => {
    const { hasAdminEmail$, data$, fetchPendingCounts, count } = setup();
    fetchPendingCounts.mockResolvedValue(zeroCounts({ prayers: 2 }));
    hasAdminEmail$.next(true);
    await vi.waitFor(async () => {
      expect(await count()).toBe(2);
    });

    hasAdminEmail$.next(false);
    data$.next({
      ...EMPTY_ADMIN_DATA,
      pendingPrayers: [{}] as AdminData['pendingPrayers'],
    });

    expect(await count()).toBe(0);
  });

  it('keeps a fresher admin snapshot over a head-count that resolves later', async () => {
    const { hasAdminEmail$, data$, fetchPendingCounts, service, count } = setup();
    hasAdminEmail$.next(true);
    await vi.waitFor(async () => {
      expect(fetchPendingCounts).toHaveBeenCalledTimes(1);
    });

    let resolveFetch: (value: AdminPendingCounts) => void = () => undefined;
    fetchPendingCounts.mockImplementationOnce(
      () =>
        new Promise<AdminPendingCounts>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    void service.refresh();

    data$.next({ ...EMPTY_ADMIN_DATA });
    resolveFetch(zeroCounts({ prayers: 5 }));
    await settle();

    expect(await count()).toBe(0);
  });

  it('applies only the newest of overlapping refreshes', async () => {
    const { hasAdminEmail$, fetchPendingCounts, service, count } = setup();
    hasAdminEmail$.next(true);
    await vi.waitFor(async () => {
      expect(fetchPendingCounts).toHaveBeenCalledTimes(1);
    });

    const resolvers: Array<(value: AdminPendingCounts) => void> = [];
    fetchPendingCounts.mockImplementation(
      () => new Promise<AdminPendingCounts>((resolve) => resolvers.push(resolve)),
    );
    void service.refresh();
    void service.refresh();
    await settle();

    resolvers[1](zeroCounts({ updates: 1 }));
    resolvers[0](zeroCounts({ updates: 6 }));
    await settle();

    expect(await count()).toBe(1);
  });

  it('refreshes when navigation leaves /admin', async () => {
    const { hasAdminEmail$, events, fetchPendingCounts } = setup();
    hasAdminEmail$.next(true);
    await vi.waitFor(async () => {
      expect(fetchPendingCounts).toHaveBeenCalledTimes(1);
    });

    events.next(new NavigationEnd(1, '/admin', '/admin'));
    events.next(new NavigationEnd(2, '/', '/'));

    await vi.waitFor(async () => {
      expect(fetchPendingCounts).toHaveBeenCalledTimes(2);
    });
  });

  it('does not refresh when navigation stays on /admin or enters it', async () => {
    const { hasAdminEmail$, events, fetchPendingCounts } = setup();
    hasAdminEmail$.next(true);
    await vi.waitFor(async () => {
      expect(fetchPendingCounts).toHaveBeenCalledTimes(1);
    });

    events.next(new NavigationEnd(1, '/', '/'));
    events.next(new NavigationEnd(2, '/admin', '/admin'));
    events.next(new NavigationEnd(3, '/admin/settings', '/admin/settings'));
    await settle();

    expect(fetchPendingCounts).toHaveBeenCalledTimes(1);
  });

  it('keeps the previous count when a refresh fails', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { hasAdminEmail$, fetchPendingCounts, service, count } = setup();
    fetchPendingCounts.mockResolvedValueOnce(zeroCounts({ accountRequests: 4 }));
    hasAdminEmail$.next(true);
    await vi.waitFor(async () => {
      expect(await count()).toBe(4);
    });

    fetchPendingCounts.mockRejectedValueOnce(new Error('offline'));
    await service.refresh();

    expect(await count()).toBe(4);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  describe('iconPendingCount$', () => {
    it('is null while auth restore or the admin check is still running', () => {
      const { loading$, adminEligibilityResolved$, iconCount } = setup();
      loading$.next(true);
      expect(iconCount()).toBeNull();

      loading$.next(false);
      adminEligibilityResolved$.next(false);
      expect(iconCount()).toBeNull();
    });

    it('is 0 for a resolved non-admin without querying', () => {
      const { fetchPendingCounts, iconCount } = setup();
      expect(iconCount()).toBe(0);
      expect(fetchPendingCounts).not.toHaveBeenCalled();
    });

    it('stays null for an admin until the first count loads, then matches the gear total', async () => {
      const { hasAdminEmail$, fetchPendingCounts, iconCount } = setup();
      let resolveCounts: (counts: AdminPendingCounts) => void = () => undefined;
      fetchPendingCounts.mockReturnValueOnce(
        new Promise<AdminPendingCounts>((resolve) => {
          resolveCounts = resolve;
        }),
      );

      hasAdminEmail$.next(true);
      expect(iconCount()).toBeNull();

      resolveCounts(zeroCounts({ prayers: 2, accountRequests: 1 }));
      await vi.waitFor(() => {
        expect(iconCount()).toBe(3);
      });
    });

    it('drops to 0 on logout and waits for a fresh count when the same admin logs back in', async () => {
      const { hasAdminEmail$, fetchPendingCounts, iconCount } = setup();
      fetchPendingCounts.mockResolvedValue(zeroCounts({ updates: 2 }));
      hasAdminEmail$.next(true);
      await vi.waitFor(() => {
        expect(iconCount()).toBe(2);
      });

      hasAdminEmail$.next(false);
      expect(iconCount()).toBe(0);

      let resolveCounts: (counts: AdminPendingCounts) => void = () => undefined;
      fetchPendingCounts.mockReturnValueOnce(
        new Promise<AdminPendingCounts>((resolve) => {
          resolveCounts = resolve;
        }),
      );
      hasAdminEmail$.next(true);
      expect(iconCount()).toBeNull();
      resolveCounts(zeroCounts({ updates: 5 }));
      await vi.waitFor(() => {
        expect(iconCount()).toBe(5);
      });
    });
  });
});
