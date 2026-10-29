import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Badge } from '@capawesome/capacitor-badge';
import { merge } from 'rxjs';
import { AdminPendingCountService } from './admin-pending-count.service';
import { BadgeService } from './badge.service';
import { CapacitorService, isAdminPushEvent } from './capacitor.service';
import { APP_BECAME_VISIBLE_EVENT } from '../../lib/visible-page-recovery';

export interface AppIconBadgeNativeApi {
  /** False on web and on native binaries built before the plugin was added. */
  isAvailable(): boolean;
  requestPermissions(): Promise<void>;
  set(count: number): Promise<void>;
}

export function createCapawesomeAppIconBadgeNative(): AppIconBadgeNativeApi {
  return {
    isAvailable: () =>
      Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('Badge'),
    async requestPermissions() {
      await Badge.requestPermissions();
    },
    async set(count: number) {
      await Badge.set({ count });
    },
  };
}

/**
 * Native sink: in-app unread (Current + Answered + Prompts) plus, for admins,
 * pending approvals (the Settings gear number).
 * Web is a no-op. `persist` / `autoClear: false` live in capacitor.config.ts.
 *
 * The icon is only written once both parts are resolved, because on iOS setting 0
 * also clears delivered notifications. `Badge.get()` is never trusted: on iOS it
 * returns the plugin's own stored value, which a push `aps.badge` does not update,
 * so the first write and every write after resume or a push are forced.
 */
@Injectable({
  providedIn: 'root',
})
export class AppIconBadgeService {
  private native: AppIconBadgeNativeApi = createCapawesomeAppIconBadgeNative();
  private started = false;
  /** Null forces the next resolved total to be written. */
  private lastAppliedCount: number | null = null;
  private pendingApprovals: number | null = null;
  private syncQueue: Promise<void> = Promise.resolve();

  constructor(
    private badgeService: BadgeService,
    private adminPendingCount: AdminPendingCountService,
    private capacitor: CapacitorService
  ) {}

  /** Test seam so specs can inject a fake native API. */
  setNativeApiForTests(nativeApi: AppIconBadgeNativeApi): void {
    this.native = nativeApi;
    this.started = false;
    this.lastAppliedCount = null;
  }

  async start(): Promise<void> {
    if (this.started) {
      return;
    }
    this.started = true;

    if (!this.native.isAvailable()) {
      return;
    }

    try {
      await this.native.requestPermissions();
    } catch (error) {
      console.warn('[AppIconBadge] Failed to initialize native badge:', error);
    }

    merge(
      this.badgeService.getUpdateBadgesChanged$(),
      this.badgeService.getBadgeFunctionalityEnabled$()
    ).subscribe(() => {
      void this.sync();
    });

    this.adminPendingCount.iconPendingCount$.subscribe((count) => {
      this.pendingApprovals = count;
      void this.sync();
    });

    window.addEventListener(APP_BECAME_VISIBLE_EVENT, () => {
      void this.refreshPendingThenRewrite();
    });

    this.capacitor.notificationEvents$.subscribe((event) => {
      void (isAdminPushEvent(event) ? this.refreshPendingThenRewrite() : this.sync({ force: true }));
    });

    await this.sync();
  }

  /**
   * Rewriting before the fresh pending count lands would briefly put the old total back on the icon.
   * If the refresh fails, the icon is left alone: a push may already have set the right number.
   */
  private async refreshPendingThenRewrite(): Promise<void> {
    if (await this.adminPendingCount.refresh()) {
      await this.sync({ force: true });
    }
  }

  /**
   * Runs one write at a time; each reads the totals when it starts, so the last write is the newest.
   * `force` rewrites an unchanged total because the OS icon may have been changed behind our back.
   */
  sync(options: { force?: boolean } = {}): Promise<void> {
    this.syncQueue = this.syncQueue.then(() => {
      if (options.force) {
        this.lastAppliedCount = null;
      }
      return this.applyCount();
    });
    return this.syncQueue;
  }

  private async applyCount(): Promise<void> {
    if (!this.native.isAvailable()) {
      return;
    }
    if (this.pendingApprovals === null || !this.badgeService.isDisplayedTotalResolved()) {
      return;
    }
    const count = this.badgeService.getDisplayedBadgeTotal() + this.pendingApprovals;
    if (this.lastAppliedCount === count) {
      return;
    }
    try {
      await this.native.set(count);
      this.lastAppliedCount = count;
    } catch (error) {
      console.warn('[AppIconBadge] Failed to set native badge count:', error);
    }
  }
}
