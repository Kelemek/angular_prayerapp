import { BehaviorSubject, type Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import type { BadgeService } from '../services/badge.service';
import type { PrayerRequest } from '../services/prayer.service';
import type { PrayerUpdateRecord } from './prayer-update-header';

export class PrayerCardBadgeWire {
  readonly updateBadges$ = new Map<string, BehaviorSubject<boolean>>();
  readonly prayerBadge$: Observable<boolean>;

  private storageListener: ((event: StorageEvent) => void) | null = null;

  constructor(
    private readonly badgeService: BadgeService,
    private readonly getPrayer: () => PrayerRequest
  ) {
    this.prayerBadgeSubject$ = new BehaviorSubject<boolean>(false);
    this.prayerBadge$ = this.prayerBadgeSubject$.asObservable();
  }

  private readonly prayerBadgeSubject$: BehaviorSubject<boolean>;

  init(destroy$: Subject<void>): void {
    this.syncPrayerBadge();
    this.seedUpdateBadges(this.getPrayer().updates);

    this.badgeService
      .getUpdateBadgesChanged$()
      .pipe(takeUntil(destroy$))
      .subscribe(() => {
        this.syncPrayerBadge();
        this.syncAllUpdateBadges(this.getPrayer().updates);
      });

    this.storageListener = (event: StorageEvent) => {
      if (event.key === 'read_prayers_data') {
        this.syncAllUpdateBadges(this.getPrayer().updates);
      }
    };
    window.addEventListener('storage', this.storageListener);
  }

  destroy(): void {
    if (this.storageListener) {
      window.removeEventListener('storage', this.storageListener);
      this.storageListener = null;
    }
  }

  onPrayerChanged(
    previousPrayer: PrayerRequest | undefined,
    currentPrayer: PrayerRequest
  ): void {
    if (previousPrayer?.id !== currentPrayer.id) {
      this.rebindPrayer(currentPrayer);
      return;
    }

    const previousUpdateIds = previousPrayer?.updates?.map((u) => u.id) ?? [];
    const currentUpdateIds = currentPrayer.updates?.map((u) => u.id) ?? [];
    const newUpdateIds = currentUpdateIds.filter(
      (id) => !previousUpdateIds.includes(id)
    );

    if (newUpdateIds.length === 0) {
      return;
    }

    for (const newUpdateId of newUpdateIds) {
      const update = currentPrayer.updates?.find((u) => u.id === newUpdateId);
      if (update && !this.updateBadges$.has(update.id)) {
        this.ensureUpdateBadge(update.id);
      }
    }
    this.syncAllUpdateBadges(currentPrayer.updates);
  }

  /** Virtual scroll reuses card instances; reset badge state when the row prayer changes. */
  rebindPrayer(prayer: PrayerRequest): void {
    this.prayerBadgeSubject$.next(false);
    this.updateBadges$.clear();
    this.syncPrayerBadge();
    this.seedUpdateBadges(prayer.updates);
  }

  markUpdateRead(updateId: string, prayerId: string): void {
    this.badgeService.markUpdateAsRead(updateId, prayerId, 'prayers');
    const subject = this.updateBadges$.get(updateId);
    if (subject) {
      subject.next(false);
    }
  }

  private seedUpdateBadges(updates: PrayerUpdateRecord[] | undefined): void {
    if (!updates?.length) {
      return;
    }
    updates.forEach((update) => this.ensureUpdateBadge(update.id));
  }

  private ensureUpdateBadge(updateId: string): void {
    if (!this.updateBadges$.has(updateId)) {
      this.updateBadges$.set(
        updateId,
        new BehaviorSubject<boolean>(
          this.badgeService.isUpdateUnread(updateId)
        )
      );
      return;
    }
    this.syncUpdateBadge(updateId);
  }

  private syncPrayerBadge(): void {
    const prayer = this.getPrayer();
    if (!prayer?.id) {
      return;
    }
    this.prayerBadgeSubject$.next(
      this.badgeService.isPrayerUnread(prayer.id)
    );
  }

  private syncUpdateBadge(updateId: string): void {
    const subject = this.updateBadges$.get(updateId);
    if (subject) {
      subject.next(this.badgeService.isUpdateUnread(updateId));
    }
  }

  private syncAllUpdateBadges(updates: PrayerUpdateRecord[] | undefined): void {
    if (!updates?.length) {
      return;
    }
    updates.forEach((update) => this.syncUpdateBadge(update.id));
  }
}
