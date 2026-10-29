import { DestroyRef, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  pairwise,
  skip,
  type Observable,
} from 'rxjs';
import {
  pendingApprovalItemsFromAdminData,
  sumPendingApprovalItems,
} from '../lib/admin-pending-item-count';
import { AdminAuthService } from './admin-auth.service';
import { AdminDataReadService } from './admin-data-read.service';
import { AdminDataService } from './admin-data.service';
import { CapacitorService, isAdminPushEvent } from './capacitor.service';

@Injectable({ providedIn: 'root' })
export class AdminPendingCountService {
  /** Null until the first count loads for the current admin, and after logout. */
  private readonly countSubject = new BehaviorSubject<number | null>(null);
  readonly pendingApprovalItemCount$: Observable<number> = this.countSubject.pipe(
    map((count) => count ?? 0),
    distinctUntilChanged(),
  );

  /**
   * Same total for the native app icon, but null until it is known: auth restore and
   * the admin check have finished and, for an admin, the first count has loaded.
   * Non-admins resolve to 0.
   */
  readonly iconPendingCount$: Observable<number | null>;

  private eligible = false;
  // Every write source bumps this so only the newest result lands: a head-count that
  // resolves after logout or after a fresher admin snapshot cannot repaint the badge.
  private epoch = 0;

  constructor(
    private readonly adminAuth: AdminAuthService,
    private readonly read: AdminDataReadService,
    private readonly adminData: AdminDataService,
    private readonly router: Router,
    capacitor: CapacitorService,
    destroyRef: DestroyRef,
  ) {
    this.iconPendingCount$ = combineLatest([
      this.adminAuth.loading$,
      this.adminAuth.adminEligibilityResolved$,
      this.adminAuth.hasAdminEmail$,
      this.countSubject,
    ]).pipe(
      map(([authLoading, eligibilityResolved, isAdmin, count]) => {
        if (authLoading || !eligibilityResolved) {
          return null;
        }
        return isAdmin ? count : 0;
      }),
      distinctUntilChanged(),
    );

    this.adminAuth.hasAdminEmail$
      .pipe(distinctUntilChanged(), takeUntilDestroyed(destroyRef))
      .subscribe((eligible) => {
        this.eligible = eligible;
        if (!eligible) {
          this.epoch += 1;
          this.countSubject.next(null);
          return;
        }
        void this.refresh();
      });

    // data$ replays its current value. Skip that so the startup snapshot is not
    // treated as a fresh queue after construction.
    this.adminData.data$
      .pipe(
        skip(1),
        filter((data) => this.eligible && !data.loading && data.error == null),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe((data) => {
        this.epoch += 1;
        this.countSubject.next(pendingApprovalItemsFromAdminData(data));
      });

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        pairwise(),
        filter(
          ([previous, next]) =>
            previous.urlAfterRedirects.startsWith('/admin') &&
            !next.urlAfterRedirects.startsWith('/admin'),
        ),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe(() => {
        void this.refresh();
      });

    // Admin pushes are sent after the pending row is saved, so one arriving means the queue changed.
    capacitor.notificationEvents$
      .pipe(
        filter(isAdminPushEvent),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe(() => {
        void this.refresh();
      });
  }

  async refresh(): Promise<void> {
    if (!this.eligible) {
      return;
    }
    const epoch = ++this.epoch;
    try {
      const counts = await this.read.fetchPendingCounts();
      if (epoch !== this.epoch || !this.eligible) {
        return;
      }
      this.countSubject.next(sumPendingApprovalItems(counts));
    } catch (error) {
      console.error('Error fetching pending approval counts:', error);
    }
  }
}
