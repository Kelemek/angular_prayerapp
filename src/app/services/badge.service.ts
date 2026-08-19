import { Injectable, Injector } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, startWith } from 'rxjs/operators';
import {
  findBadgeCachedItem,
  parseBadgeCachedItems,
  parseBadgeCachedItemsByType,
} from '../lib/badge-cache';
import {
  appendItemUpdateIdsToReadPrayersData,
  appendItemUpdateIdsToReadPromptsData,
  appendUpdateIdsToReadPrayersData,
  appendUpdateIdsToReadPromptsData,
  calculateBadgeCount,
  checkIndividualBadgeForItem,
  collectBadgeUpdateIdsFromItems,
  getBadgeUnreadIds,
  isBadgePrayerUnread,
  isBadgePromptUnread,
  isBadgeUpdateUnread,
  mergeUniqueIds,
} from '../lib/badge-count';
import {
  getBadgeReadPrayersData,
  getBadgeReadPromptsData,
  setBadgeReadPrayersData,
  setBadgeReadPromptsData,
} from '../lib/badge-read-storage';
import type {
  BadgeCachedItem,
  BadgeItemType,
  BadgePrayerStatus,
} from '../lib/badge-types';
import { SupabaseService } from './supabase.service';
import { UserSessionService } from './user-session.service';

/**
 * BadgeService tracks read/unread prayers and prompts to display notification badges.
 */
@Injectable({
  providedIn: 'root',
})
export class BadgeService {
  private badgeCountSubject$ = new Map<string, BehaviorSubject<number>>();
  private statusBadgeCountSubject$ = new Map<string, BehaviorSubject<number>>();
  private individualBadgeSubject$ = new Map<string, BehaviorSubject<boolean>>();
  private updateBadgesChanged$ = new Subject<void>();
  private badgeFunctionalityEnabled$ = new BehaviorSubject<boolean>(false);
  private storageListenerAttached = false;

  private userSessionService: UserSessionService | null = null;

  constructor(
    private supabase: SupabaseService,
    private injector: Injector
  ) {
    this.initializeBadgeSubjects();
    this.attachStorageListener();
    this.attachUserSessionListener();
  }

  private getUserSessionService(): UserSessionService {
    if (!this.userSessionService) {
      this.userSessionService = this.injector.get(UserSessionService);
    }
    return this.userSessionService;
  }

  private attachUserSessionListener(): void {
    setTimeout(() => {
      this.getUserSessionService()
        .userSession$
        .pipe(
          distinctUntilChanged(
            (prev, curr) =>
              prev?.email === curr?.email &&
              prev?.badgeFunctionalityEnabled === curr?.badgeFunctionalityEnabled
          )
        )
        .subscribe((session) => {
          if (session) {
            const isEnabled = session.badgeFunctionalityEnabled ?? false;
            console.log(`[Badge] User session updated, badge functionality: ${isEnabled}`);
            this.badgeFunctionalityEnabled$.next(isEnabled);
            this.refreshBadgeCounts();
          } else {
            console.log('[Badge] No user session, disabling badges');
            this.badgeFunctionalityEnabled$.next(false);
          }
        });
    }, 0);
  }

  private initializeBadgeSubjects(): void {
    this.badgeCountSubject$.set('prayers', new BehaviorSubject<number>(0));
    this.badgeCountSubject$.set('prompts', new BehaviorSubject<number>(0));
    this.statusBadgeCountSubject$.set('prayers_current', new BehaviorSubject<number>(0));
    this.statusBadgeCountSubject$.set('prayers_answered', new BehaviorSubject<number>(0));
  }

  private attachStorageListener(): void {
    if (this.storageListenerAttached) return;

    window.addEventListener('storage', () => {
      this.refreshBadgeCounts();
    });

    this.storageListenerAttached = true;
  }

  getUpdateBadgesChanged$(): Observable<void> {
    return this.updateBadgesChanged$.asObservable();
  }

  getBadgeFunctionalityEnabled$(): Observable<boolean> {
    return this.badgeFunctionalityEnabled$.asObservable();
  }

  getPrayerBadgesChanged$(status: BadgePrayerStatus): Observable<void> {
    return this.updateBadgesChanged$.asObservable();
  }

  markPrayerAsRead(prayerId: string): void {
    this.markItemAsRead(prayerId, 'prayers');
  }

  markPromptAsRead(promptId: string): void {
    this.markItemAsRead(promptId, 'prompts');
  }

  markUpdateAsRead(updateId: string, itemId: string, type: BadgeItemType): void {
    try {
      if (type === 'prayers') {
        const data = getBadgeReadPrayersData();
        if (!data.updates.includes(updateId)) {
          data.updates.push(updateId);
          setBadgeReadPrayersData(data);
        }
      } else {
        const data = getBadgeReadPromptsData();
        if (!data.updates.includes(updateId)) {
          data.updates.push(updateId);
          setBadgeReadPromptsData(data);
        }
      }

      const items = parseBadgeCachedItemsByType(type);
      const item = findBadgeCachedItem(items, itemId);
      const itemStatus = item?.status;

      this.updateBadgeCount(type);

      if (type === 'prayers' && itemStatus) {
        this.updateStatusBadgeCount(type, itemStatus as BadgePrayerStatus);
      }

      const key = `${type}_${itemId}`;
      if (this.individualBadgeSubject$.has(key)) {
        const hasBadge = this.checkIndividualBadge(type, itemId);
        (this.individualBadgeSubject$.get(key) as BehaviorSubject<boolean>).next(hasBadge);
      }

      this.updateBadgesChanged$.next();
    } catch (error) {
      if (error instanceof Error && error.message.includes('QuotaExceededError')) {
        console.error(`localStorage quota exceeded for ${type}`);
      } else {
        console.warn(`Failed to mark update as read:`, error);
      }
    }
  }

  markAllAsRead(type: BadgeItemType): void {
    try {
      const items = parseBadgeCachedItemsByType(type);
      if (items.length === 0) {
        return;
      }

      const ids = items.map((item) => item.id);

      if (type === 'prayers') {
        const data = getBadgeReadPrayersData();
        data.prayers = mergeUniqueIds(data.prayers, ids);
        setBadgeReadPrayersData(data);
      } else {
        const data = getBadgeReadPromptsData();
        data.prompts = mergeUniqueIds(data.prompts, ids);
        setBadgeReadPromptsData(data);
      }

      this.markAllUpdatesAsRead(items, type);
      this.clearIndividualBadgesForItems(type, items);
      this.refreshBadgeCounts();
      this.updateBadgesChanged$.next();
    } catch (error) {
      console.warn(`Failed to mark all ${type} as read:`, error);
    }
  }

  markAllAsReadByStatus(type: BadgeItemType, status: BadgePrayerStatus): void {
    try {
      const items = parseBadgeCachedItemsByType(type);
      const itemsWithStatus = items.filter((item) => item.status === status);
      if (itemsWithStatus.length === 0) {
        return;
      }

      const ids = itemsWithStatus.map((item) => item.id);

      if (type === 'prayers') {
        const data = getBadgeReadPrayersData();
        data.prayers = mergeUniqueIds(data.prayers, ids);
        setBadgeReadPrayersData(data);
      } else {
        const data = getBadgeReadPromptsData();
        data.prompts = mergeUniqueIds(data.prompts, ids);
        setBadgeReadPromptsData(data);
      }

      this.markAllUpdatesAsRead(itemsWithStatus, type);
      this.clearIndividualBadgesForItems(type, itemsWithStatus);
      this.refreshBadgeCounts();
      this.updateBadgesChanged$.next();
    } catch (error) {
      console.warn(`Failed to mark all ${type} with status ${status} as read:`, error);
    }
  }

  markAllAsReadByPromptType(promptType: string): void {
    try {
      const items = parseBadgeCachedItems('prompts_cache');
      const itemsWithType = items.filter((item) => item.type === promptType);
      if (itemsWithType.length === 0) {
        return;
      }

      const ids = itemsWithType.map((item) => item.id);
      const data = getBadgeReadPromptsData();
      data.prompts = mergeUniqueIds(data.prompts, ids);
      setBadgeReadPromptsData(data);

      this.markAllUpdatesAsRead(itemsWithType, 'prompts');
      this.clearIndividualBadgesForItems('prompts', itemsWithType);
      this.refreshBadgeCounts();
      this.updateBadgesChanged$.next();
    } catch (error) {
      console.warn(`Failed to mark all prompts with type ${promptType} as read:`, error);
    }
  }

  getBadgeCount$(type: BadgeItemType, status?: BadgePrayerStatus): Observable<number> {
    return this.getBadgeCountInternal$(type, status);
  }

  hasIndividualBadge$(type: BadgeItemType, id: string): Observable<boolean> {
    const key = `${type}_${id}`;

    if (!this.individualBadgeSubject$.has(key)) {
      this.individualBadgeSubject$.set(key, new BehaviorSubject<boolean>(false));
    }

    return (this.individualBadgeSubject$.get(key) as BehaviorSubject<boolean>).asObservable().pipe(
      startWith(this.checkIndividualBadge(type, id))
    );
  }

  getUnreadIds(type: BadgeItemType): string[] {
    try {
      const items = parseBadgeCachedItemsByType(type);
      const readPrayers = getBadgeReadPrayersData();
      const readPrompts = getBadgeReadPromptsData();
      return getBadgeUnreadIds(items, type, readPrayers, readPrompts);
    } catch (error) {
      console.warn(`Failed to get unread IDs for ${type}:`, error);
      return [];
    }
  }

  isUpdateUnread(updateId: string): boolean {
    return isBadgeUpdateUnread(updateId, getBadgeReadPrayersData());
  }

  isPrayerUnread(prayerId: string): boolean {
    return isBadgePrayerUnread(prayerId, getBadgeReadPrayersData());
  }

  isPromptUnread(promptId: string): boolean {
    return isBadgePromptUnread(promptId, getBadgeReadPromptsData());
  }

  refreshBadgeCounts(): void {
    this.preCreateIndividualBadgeSubjects();

    this.badgeCountSubject$.forEach((subject, key) => {
      if (key === 'prayers' || key === 'prompts') {
        subject.next(this.calculateBadgeCount(key));
      }
    });

    this.statusBadgeCountSubject$.forEach((subject, key) => {
      const [type, status] = key.split('_') as [BadgeItemType, BadgePrayerStatus];
      subject.next(this.calculateBadgeCount(type, status));
    });

    this.individualBadgeSubject$.forEach((subject, key) => {
      const [type, ...idParts] = key.split('_');
      const id = idParts.join('_');
      subject.next(this.checkIndividualBadge(type as BadgeItemType, id));
    });

    this.updateBadgesChanged$.next();
  }

  private markItemAsRead(itemId: string, type: BadgeItemType): void {
    try {
      let itemStatus: string | undefined;

      if (type === 'prayers') {
        const data = getBadgeReadPrayersData();
        if (!data.prayers.includes(itemId)) {
          data.prayers.push(itemId);
          setBadgeReadPrayersData(data);

          const items = parseBadgeCachedItemsByType('prayers');
          const item = findBadgeCachedItem(items, itemId);
          itemStatus = item?.status;
        }
      } else {
        const data = getBadgeReadPromptsData();
        if (!data.prompts.includes(itemId)) {
          data.prompts.push(itemId);
          setBadgeReadPromptsData(data);
        }
      }

      this.markItemUpdatesAsRead(itemId, type);
      this.updateBadgeCount(type);

      if (type === 'prayers' && itemStatus) {
        this.updateStatusBadgeCount(type, itemStatus as BadgePrayerStatus);
      }

      const key = `${type}_${itemId}`;
      if (this.individualBadgeSubject$.has(key)) {
        (this.individualBadgeSubject$.get(key) as BehaviorSubject<boolean>).next(false);
      }

      this.updateBadgesChanged$.next();
    } catch (error) {
      if (error instanceof Error && error.message.includes('QuotaExceededError')) {
        console.error(`localStorage quota exceeded for ${type}`);
      } else {
        console.warn(`Failed to mark ${itemId} as read:`, error);
      }
    }
  }

  private getBadgeCountInternal$(
    type: BadgeItemType,
    status?: BadgePrayerStatus
  ): Observable<number> {
    const key = status ? `${type}_${status}` : type;

    let subject = status
      ? this.statusBadgeCountSubject$.get(key)
      : this.badgeCountSubject$.get(type);

    if (!subject) {
      subject = new BehaviorSubject<number>(0);
      if (status) {
        this.statusBadgeCountSubject$.set(key, subject);
      } else {
        this.badgeCountSubject$.set(type, subject);
      }
    }

    subject.next(this.calculateBadgeCount(type, status));
    return subject.asObservable();
  }

  private preCreateIndividualBadgeSubjects(): void {
    try {
      const prayers = parseBadgeCachedItems('prayers_cache');
      prayers.forEach((prayer) => {
        const key = `prayers_${prayer.id}`;
        if (!this.individualBadgeSubject$.has(key)) {
          this.individualBadgeSubject$.set(key, new BehaviorSubject<boolean>(false));
        }
      });

      const prompts = parseBadgeCachedItems('prompts_cache');
      prompts.forEach((prompt) => {
        const key = `prompts_${prompt.id}`;
        if (!this.individualBadgeSubject$.has(key)) {
          this.individualBadgeSubject$.set(key, new BehaviorSubject<boolean>(false));
        }
      });
    } catch (error) {
      console.warn('[Badge] Failed to pre-create individual badge subjects:', error);
    }
  }

  private calculateBadgeCount(type: BadgeItemType, status?: BadgePrayerStatus): number {
    try {
      const items = parseBadgeCachedItemsByType(type);
      if (items.length === 0) {
        return 0;
      }

      return calculateBadgeCount(
        items,
        type,
        getBadgeReadPrayersData(),
        getBadgeReadPromptsData(),
        status
      );
    } catch (error) {
      console.warn(`Failed to calculate badge count for ${type}:`, error);
      return 0;
    }
  }

  private checkIndividualBadge(type: BadgeItemType, id: string): boolean {
    try {
      const items = parseBadgeCachedItemsByType(type);
      return checkIndividualBadgeForItem(
        items,
        type,
        id,
        getBadgeReadPrayersData(),
        getBadgeReadPromptsData()
      );
    } catch (error) {
      console.warn(`Failed to check individual badge for ${type}:${id}:`, error);
      return false;
    }
  }

  private markAllUpdatesAsRead(items: BadgeCachedItem[], type: BadgeItemType): void {
    const allUpdateIds = collectBadgeUpdateIdsFromItems(items);
    if (allUpdateIds.length === 0) {
      return;
    }

    try {
      if (type === 'prayers') {
        const data = appendUpdateIdsToReadPrayersData(
          getBadgeReadPrayersData(),
          allUpdateIds
        );
        setBadgeReadPrayersData(data);
      } else {
        const data = appendUpdateIdsToReadPromptsData(
          getBadgeReadPromptsData(),
          allUpdateIds
        );
        setBadgeReadPromptsData(data);
      }
    } catch (error) {
      console.warn(`Failed to mark all updates as read for ${type}:`, error);
    }
  }

  private markItemUpdatesAsRead(itemId: string, type: BadgeItemType): void {
    try {
      const items = parseBadgeCachedItemsByType(type);
      const item = findBadgeCachedItem(items, itemId);
      if (!item) {
        return;
      }

      if (type === 'prayers') {
        const data = appendItemUpdateIdsToReadPrayersData(item, getBadgeReadPrayersData());
        setBadgeReadPrayersData(data);
      } else {
        const data = appendItemUpdateIdsToReadPromptsData(item, getBadgeReadPromptsData());
        setBadgeReadPromptsData(data);
      }
    } catch (error) {
      console.warn(`Failed to mark item updates as read:`, error);
    }
  }

  private clearIndividualBadgesForItems(type: BadgeItemType, items: BadgeCachedItem[]): void {
    items.forEach((item) => {
      const key = `${type}_${item.id}`;
      if (this.individualBadgeSubject$.has(key)) {
        (this.individualBadgeSubject$.get(key) as BehaviorSubject<boolean>).next(false);
      }
    });
  }

  private updateBadgeCount(type: BadgeItemType): void {
    const count = this.calculateBadgeCount(type);
    const subject = this.badgeCountSubject$.get(type);
    if (subject) {
      subject.next(count);
    }
  }

  private updateStatusBadgeCount(type: BadgeItemType, status?: BadgePrayerStatus): void {
    if (!status || type !== 'prayers') return;

    const key = `${type}_${status}`;
    const count = this.calculateBadgeCount(type, status);
    const subject = this.statusBadgeCountSubject$.get(key);
    if (subject) {
      subject.next(count);
    }
  }

  /** Spec and legacy callers access read-state through the service. */
  private getReadPrayersData() {
    return getBadgeReadPrayersData();
  }

  private setReadPrayersData(data: ReturnType<typeof getBadgeReadPrayersData>): void {
    setBadgeReadPrayersData(data);
  }

  private getReadPromptsData() {
    return getBadgeReadPromptsData();
  }

  private setReadPromptsData(data: ReturnType<typeof getBadgeReadPromptsData>): void {
    setBadgeReadPromptsData(data);
  }
}
