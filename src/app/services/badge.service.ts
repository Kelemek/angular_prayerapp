import { Injectable, Injector } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { distinctUntilChanged, startWith } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { UserSessionService } from './user-session.service';

/**
 * Prayer or Prompt object structure
 */
interface CachedItem {
  id: string;
  status?: 'current' | 'answered' | 'archived';
  type?: string;
  updated_at: string;
  updates?: Array<{ id: string; created_at: string; updated_at?: string }>;
}

/**
 * BadgeService tracks read/unread prayers and prompts to display notification badges
 * 
 * Features:
 * - Tracks read prayers and prompts in localStorage
 * - Calculates badge counts by comparing cached items to read items
 * - Handles updates since last read
 * - Observable-based API for reactive components
 * - Error handling for localStorage quota exceeded
 */
@Injectable({
  providedIn: 'root'
})
export class BadgeService {
  private readonly READ_PRAYERS_DATA_KEY = 'read_prayers_data';
  private readonly READ_PROMPTS_DATA_KEY = 'read_prompts_data';

  private badgeCountSubject$ = new Map<string, BehaviorSubject<number>>();
  private statusBadgeCountSubject$ = new Map<string, BehaviorSubject<number>>();
  private individualBadgeSubject$ = new Map<string, BehaviorSubject<boolean>>();
  private updateBadgesChanged$ = new Subject<void>();
  private badgeFunctionalityEnabled$ = new BehaviorSubject<boolean>(false);
  private storageListenerAttached = false;

  // Use Injector to avoid circular dependency with UserSessionService
  private userSessionService: UserSessionService | null = null;

  constructor(
    private supabase: SupabaseService,
    private injector: Injector
  ) {
    this.initializeBadgeSubjects();
    this.attachStorageListener();
    // Listen for user session changes to get badge preference
    this.attachUserSessionListener();
  }

  /**
   * Get UserSessionService lazily to avoid circular dependency
   */
  private getUserSessionService(): UserSessionService {
    if (!this.userSessionService) {
      this.userSessionService = this.injector.get(UserSessionService);
    }
    return this.userSessionService;
  }

  /**
   * Listen for user session changes to update badge functionality
   * This automatically handles both OAuth and MFA authentication
   */
  private attachUserSessionListener(): void {
    // Use setTimeout to defer subscription until after services are initialized
    setTimeout(() => {
      this.getUserSessionService().userSession$
        .pipe(distinctUntilChanged((prev, curr) => 
          prev?.email === curr?.email && 
          prev?.badgeFunctionalityEnabled === curr?.badgeFunctionalityEnabled
        ))
        .subscribe(session => {
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

  /**
   * Initialize BehaviorSubjects for badge tracking
   */
  private initializeBadgeSubjects(): void {
    // Initialize prayer and prompt badge count subjects
    this.badgeCountSubject$.set('prayers', new BehaviorSubject<number>(0));
    this.badgeCountSubject$.set('prompts', new BehaviorSubject<number>(0));
    
    // Initialize status-specific badge count subjects
    this.statusBadgeCountSubject$.set('prayers_current', new BehaviorSubject<number>(0));
    this.statusBadgeCountSubject$.set('prayers_answered', new BehaviorSubject<number>(0));
  }

  /**
   * Attach a single storage event listener for reactive updates
   */
  private attachStorageListener(): void {
    if (this.storageListenerAttached) return;

    window.addEventListener('storage', () => {
      this.refreshBadgeCounts();
    });

    this.storageListenerAttached = true;
  }

  /**
   * Get an observable that emits whenever update badges change
   * Prayer cards can use this to react to batch updates
   */
  getUpdateBadgesChanged$(): Observable<void> {
    return this.updateBadgesChanged$.asObservable();
  }

  /**
   * Get badge functionality enabled state as observable
   */
  getBadgeFunctionalityEnabled$(): Observable<boolean> {
    return this.badgeFunctionalityEnabled$.asObservable();
  }

  /**
   * Get an observable that emits whenever prayer badges change (by status)
   */
  getPrayerBadgesChanged$(status: 'current' | 'answered'): Observable<void> {
    return this.updateBadgesChanged$.asObservable();
  }

  /**
   * Mark a single prayer as read
   */
  markPrayerAsRead(prayerId: string): void {
    this.markItemAsRead(prayerId, 'prayers');
  }

  /**
   * Mark a single prompt as read
   */
  markPromptAsRead(promptId: string): void {
    this.markItemAsRead(promptId, 'prompts');
  }

  /**
   * Mark a single update as read
   */
  markUpdateAsRead(updateId: string, itemId: string, type: 'prayers' | 'prompts'): void {
    try {
      let data: any;
      
      if (type === 'prayers') {
        data = this.getReadPrayersData();
        if (!data.updates.includes(updateId)) {
          data.updates.push(updateId);
          this.setReadPrayersData(data);
        }
      } else {
        data = this.getReadPromptsData();
        if (!data.updates.includes(updateId)) {
          data.updates.push(updateId);
          this.setReadPromptsData(data);
        }
      }

      // Get the item to update status-specific badge
      const cacheKey = type === 'prayers' ? 'prayers_cache' : 'prompts_cache';
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        const items = parsedCache?.data || parsedCache || [];
        const item = items.find((i: CachedItem) => i.id === itemId);
        const itemStatus = item?.status;
        
        // Update badge count
        this.updateBadgeCount(type);
        
        // Update status-specific badge if this is a prayer with a status
        if (type === 'prayers' && itemStatus) {
          this.updateStatusBadgeCount(type, itemStatus as 'current' | 'answered');
        }
      }

      // Update individual badge for the item
      const key = `${type}_${itemId}`;
      if (this.individualBadgeSubject$.has(key)) {
        const hasBadge = this.checkIndividualBadge(type, itemId);
        (this.individualBadgeSubject$.get(key) as BehaviorSubject<boolean>).next(hasBadge);
      }

      // Emit update badges changed event
      this.updateBadgesChanged$.next();
    } catch (error) {
      if (error instanceof Error && error.message.includes('QuotaExceededError')) {
        console.error(`localStorage quota exceeded for ${type}`);
      } else {
        console.warn(`Failed to mark update as read:`, error);
      }
    }
  }

  /**
   * Mark all prayers or prompts as read
   */
  markAllAsRead(type: 'prayers' | 'prompts'): void {
    const cacheKey = type === 'prayers' ? 'prayers_cache' : 'prompts_cache';

    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        const items = parsedCache?.data || parsedCache || [];

        if (Array.isArray(items)) {
          const ids = items.map((item: CachedItem) => item.id);
          
          if (type === 'prayers') {
            const data = this.getReadPrayersData();
            data.prayers = Array.from(new Set([...data.prayers, ...ids]));
            this.setReadPrayersData(data);
          } else {
            const data = this.getReadPromptsData();
            data.prompts = Array.from(new Set([...data.prompts, ...ids]));
            this.setReadPromptsData(data);
          }

          // Also mark all updates as read
          this.markAllUpdatesAsRead(items, type);

          // Update individual badges for these items
          items.forEach((item: CachedItem) => {
            const key = `${type}_${item.id}`;
            if (this.individualBadgeSubject$.has(key)) {
              (this.individualBadgeSubject$.get(key) as BehaviorSubject<boolean>).next(false);
            }
          });

          // Refresh all badge counts
          this.refreshBadgeCounts();

          // Emit update badges changed event
          this.updateBadgesChanged$.next();
        }
      }
    } catch (error) {
      console.warn(`Failed to mark all ${type} as read:`, error);
    }
  }

  /**
   * Mark all prayers/prompts with a specific status as read
   */
  markAllAsReadByStatus(type: 'prayers' | 'prompts', status: 'current' | 'answered'): void {
    const cacheKey = type === 'prayers' ? 'prayers_cache' : 'prompts_cache';

    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        const items = parsedCache?.data || parsedCache || [];

        if (Array.isArray(items)) {
          // Filter items by status
          const itemsWithStatus = items.filter((item: CachedItem) => item.status === status);
          const ids = itemsWithStatus.map((item: CachedItem) => item.id);
          
          if (type === 'prayers') {
            const data = this.getReadPrayersData();
            data.prayers = Array.from(new Set([...data.prayers, ...ids]));
            this.setReadPrayersData(data);
          } else {
            const data = this.getReadPromptsData();
            data.prompts = Array.from(new Set([...data.prompts, ...ids]));
            this.setReadPromptsData(data);
          }

          // Also mark all updates for these items as read
          this.markAllUpdatesAsRead(itemsWithStatus, type);

          // Update individual badges for these items
          itemsWithStatus.forEach((item: CachedItem) => {
            const key = `${type}_${item.id}`;
            if (this.individualBadgeSubject$.has(key)) {
              (this.individualBadgeSubject$.get(key) as BehaviorSubject<boolean>).next(false);
            }
          });

          // Refresh all badge counts
          this.refreshBadgeCounts();

          // Emit update badges changed event
          this.updateBadgesChanged$.next();
        }
      }
    } catch (error) {
      console.warn(`Failed to mark all ${type} with status ${status} as read:`, error);
    }
  }

  /**
   * Mark all prompts with a specific type/category as read
   */
  markAllAsReadByPromptType(promptType: string): void {
    const cacheKey = 'prompts_cache';

    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        const items = parsedCache?.data || parsedCache || [];

        if (Array.isArray(items)) {
          const itemsWithType = items.filter(
            (item: CachedItem) => item.type === promptType
          );
          const ids = itemsWithType.map((item: CachedItem) => item.id);

          const data = this.getReadPromptsData();
          data.prompts = Array.from(new Set([...data.prompts, ...ids]));
          this.setReadPromptsData(data);

          this.markAllUpdatesAsRead(itemsWithType, 'prompts');

          itemsWithType.forEach((item: CachedItem) => {
            const key = `prompts_${item.id}`;
            if (this.individualBadgeSubject$.has(key)) {
              (this.individualBadgeSubject$.get(key) as BehaviorSubject<boolean>).next(false);
            }
          });

          this.refreshBadgeCounts();
          this.updateBadgesChanged$.next();
        }
      }
    } catch (error) {
      console.warn(`Failed to mark all prompts with type ${promptType} as read:`, error);
    }
  }

  /**
   * Get badge count for prayers or prompts
   * Optionally filter by status for prayers
   */
  getBadgeCount$(type: 'prayers' | 'prompts', status?: 'current' | 'answered'): Observable<number> {
    return this.getBadgeCountInternal$(type, status);
  }

  /**
   * Check if a specific prayer or prompt has a badge
   */
  hasIndividualBadge$(type: 'prayers' | 'prompts', id: string): Observable<boolean> {
    const key = `${type}_${id}`;

    if (!this.individualBadgeSubject$.has(key)) {
      this.individualBadgeSubject$.set(key, new BehaviorSubject<boolean>(false));
    }

    return (this.individualBadgeSubject$.get(key) as BehaviorSubject<boolean>).asObservable().pipe(
      startWith(this.checkIndividualBadge(type, id))
    );
  }

  /**
   * Get array of unread IDs for a given type
   */
  getUnreadIds(type: 'prayers' | 'prompts'): string[] {
    const cacheKey = type === 'prayers' ? 'prayers_cache' : 'prompts_cache';

    try {
      const cached = localStorage.getItem(cacheKey);
      if (!cached) {
        return [];
      }

      const parsedCache = JSON.parse(cached);
      const items = parsedCache?.data || parsedCache || [];

      if (!Array.isArray(items)) {
        return [];
      }

      let readIds: string[] = [];
      if (type === 'prayers') {
        const readData = this.getReadPrayersData();
        readIds = readData.prayers;
      } else {
        const readData = this.getReadPromptsData();
        readIds = (readData as any).prompts || [];
      }

      return items
        .filter((item: CachedItem) => !readIds.includes(item.id))
        .map((item: CachedItem) => item.id);
    } catch (error) {
      console.warn(`Failed to get unread IDs for ${type}:`, error);
      return [];
    }
  }

  /**
   * Private helper: Mark a single item as read
   */
  private markItemAsRead(itemId: string, type: 'prayers' | 'prompts'): void {
    try {
      let data: any;
      let itemStatus: string | undefined;
      
      if (type === 'prayers') {
        data = this.getReadPrayersData();
        if (!data.prayers.includes(itemId)) {
          data.prayers.push(itemId);
          this.setReadPrayersData(data);
          
          // Get the prayer's status to update status-specific badge
          const cacheKey = 'prayers_cache';
          const cached = localStorage.getItem(cacheKey);
          if (cached) {
            const parsedCache = JSON.parse(cached);
            const items = parsedCache?.data || parsedCache || [];
            const item = items.find((i: CachedItem) => i.id === itemId);
            itemStatus = item?.status;
          }
        }
      } else {
        data = this.getReadPromptsData();
        if (!data.prompts.includes(itemId)) {
          data.prompts.push(itemId);
          this.setReadPromptsData(data);
        }
      }

      // Mark updates as read for this item
      this.markItemUpdatesAsRead(itemId, type);

      // Update badge count
      this.updateBadgeCount(type);
      
      // Update status-specific badge if this is a prayer with a status
      if (type === 'prayers' && itemStatus) {
        this.updateStatusBadgeCount(type, itemStatus as 'current' | 'answered');
      }

      // Update individual badge
      const key = `${type}_${itemId}`;
      if (this.individualBadgeSubject$.has(key)) {
        (this.individualBadgeSubject$.get(key) as BehaviorSubject<boolean>).next(false);
      }

      // Emit update badges changed event so prayer cards update their badges
      this.updateBadgesChanged$.next();
    } catch (error) {
      if (error instanceof Error && error.message.includes('QuotaExceededError')) {
        console.error(`localStorage quota exceeded for ${type}`);
      } else {
        console.warn(`Failed to mark ${itemId} as read:`, error);
      }
    }
  }

  /**
   * Private helper: Get badge count observable
   */
  private getBadgeCountInternal$(type: 'prayers' | 'prompts', status?: 'current' | 'answered'): Observable<number> {
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

    // Return current count immediately, then update when data changes
    const currentCount = this.calculateBadgeCount(type, status);
    subject.next(currentCount);

    return subject.asObservable();
  }

  /**
   * Trigger a manual update of badge counts
   * Called when prayers/prompts data is loaded or changed
   */
  refreshBadgeCounts(): void {
    // First, pre-create individual badge subjects for all items in cache
    this.preCreateIndividualBadgeSubjects();
    
    // Refresh aggregate badge counts
    this.badgeCountSubject$.forEach((subject, key) => {
      if (key === 'prayers') {
        const count = this.calculateBadgeCount('prayers');
        subject.next(count);
      } else if (key === 'prompts') {
        const count = this.calculateBadgeCount('prompts');
        subject.next(count);
      }
    });

    // Refresh status-specific badge counts
    this.statusBadgeCountSubject$.forEach((subject, key) => {
      const [type, status] = key.split('_') as ['prayers' | 'prompts', 'current' | 'answered'];
      const count = this.calculateBadgeCount(type, status);
      subject.next(count);
    });

    // Refresh individual badge indicators
    this.individualBadgeSubject$.forEach((subject, key) => {
      // Key format is "type_id" (e.g., "prayers_ed94331d-6ed7...")
      const [type, ...idParts] = key.split('_');
      const id = idParts.join('_'); // Rejoin in case ID has underscores
      
      const hasBadge = this.checkIndividualBadge(type as 'prayers' | 'prompts', id);
      subject.next(hasBadge);
    });

    // Notify prayer cards to update their update badges
    this.updateBadgesChanged$.next();
  }

  /**
   * Pre-create individual badge subjects for all cached items
   * This ensures subjects exist before prayer cards render
   */
  private preCreateIndividualBadgeSubjects(): void {
    try {
      // Create subjects for all prayers
      const prayersCached = localStorage.getItem('prayers_cache');
      if (prayersCached) {
        const parsedCache = JSON.parse(prayersCached);
        const prayers = parsedCache?.data || parsedCache || [];
        if (Array.isArray(prayers)) {
          prayers.forEach((prayer: CachedItem) => {
            const key = `prayers_${prayer.id}`;
            if (!this.individualBadgeSubject$.has(key)) {
              this.individualBadgeSubject$.set(key, new BehaviorSubject<boolean>(false));
            }
          });
        }
      }

      // Create subjects for all prompts
      const promptsCached = localStorage.getItem('prompts_cache');
      if (promptsCached) {
        const parsedCache = JSON.parse(promptsCached);
        const prompts = parsedCache?.data || parsedCache || [];
        if (Array.isArray(prompts)) {
          prompts.forEach((prompt: CachedItem) => {
            const key = `prompts_${prompt.id}`;
            if (!this.individualBadgeSubject$.has(key)) {
              this.individualBadgeSubject$.set(key, new BehaviorSubject<boolean>(false));
            }
          });
        }
      }
    } catch (error) {
      console.warn('[Badge] Failed to pre-create individual badge subjects:', error);
    }
  }

  /**
   * Private helper: Calculate the badge count
   * Counts unread prayers + unread updates as individual items
   */
  private calculateBadgeCount(type: 'prayers' | 'prompts', status?: 'current' | 'answered'): number {
    const cacheKey = type === 'prayers' ? 'prayers_cache' : 'prompts_cache';

    try {
      const cached = localStorage.getItem(cacheKey);
      if (!cached) {
        return 0;
      }

      const parsedCache = JSON.parse(cached);
      const items = parsedCache?.data || parsedCache || [];

      if (!Array.isArray(items)) {
        return 0;
      }

      let readIds: string[] = [];
      let readUpdateIds: string[] = [];
      
      if (type === 'prayers') {
        const readData = this.getReadPrayersData();
        readIds = readData.prayers;
        readUpdateIds = readData.updates;
      } else {
        const readData = this.getReadPromptsData();
        readIds = (readData as any).prompts || [];
        readUpdateIds = readData.updates;
      }
      
      let count = 0;
      
      items.forEach((item: CachedItem) => {
        // Filter by status if provided (only for prayers)
        if (status && item.status !== status) {
          return;
        }

        // Count unread prayer itself
        if (!readIds.includes(item.id)) {
          count++;
        }

        // Count unread updates for this item
        if (item.updates && Array.isArray(item.updates)) {
          item.updates.forEach((update: any) => {
            if (!readUpdateIds.includes(update.id)) {
              count++;
            }
          });
        }
      });

      return count;
    } catch (error) {
      console.warn(`Failed to calculate badge count for ${type}:`, error);
      return 0;
    }
  }

  /**
   * Public method: Check if a specific update (by ID) is unread
   */
  isUpdateUnread(updateId: string): boolean {
    const readData = this.getReadPrayersData();
    const readUpdateIds = readData.updates || [];
    return !readUpdateIds.includes(updateId);
  }

  /**
   * Public method: Check if a specific prayer (by ID) is unread
   */
  isPrayerUnread(prayerId: string): boolean {
    const readData = this.getReadPrayersData();
    const readPrayerIds = readData.prayers || [];
    return !readPrayerIds.includes(prayerId);
  }

  /**
   * Public method: Check if a specific prompt (by ID) is unread
   */
  isPromptUnread(promptId: string): boolean {
    const readData = this.getReadPromptsData();
    const readPromptIds = (readData as any).prompts || [];
    return !readPromptIds.includes(promptId);
  }

  /**
   * Private helper: Check if an individual item has a badge
   */
  private checkIndividualBadge(type: 'prayers' | 'prompts', id: string): boolean {
    const cacheKey = type === 'prayers' ? 'prayers_cache' : 'prompts_cache';

    try {
      const cached = localStorage.getItem(cacheKey);
      if (!cached) {
        return false;
      }

      const parsedCache = JSON.parse(cached);
      const items = parsedCache?.data || parsedCache || [];

      if (!Array.isArray(items)) {
        return false;
      }

      const item = items.find((i: CachedItem) => i.id === id);
      if (!item) {
        return false;
      }

      let readIds: string[] = [];
      if (type === 'prayers') {
        const readData = this.getReadPrayersData();
        readIds = readData.prayers;
      } else {
        const readData = this.getReadPromptsData();
        readIds = (readData as any).prompts || [];
      }
      const isRead = readIds.includes(id);

      // Only show badge if the prayer/prompt itself is unread
      // Do not show badge just because it has unread updates
      return !isRead;
    } catch (error) {
      console.warn(`Failed to check individual badge for ${type}:${id}:`, error);
      return false;
    }
  }

  /**
   * Private helper: Mark all updates in items as read
   */
  private markAllUpdatesAsRead(items: CachedItem[], type: 'prayers' | 'prompts'): void {
    const allUpdateIds: string[] = [];

    items.forEach((item: CachedItem) => {
      if (item.updates && Array.isArray(item.updates)) {
        item.updates.forEach((update: any) => {
          if (update.id && !allUpdateIds.includes(update.id)) {
            allUpdateIds.push(update.id);
          }
        });
      }
    });

    if (allUpdateIds.length > 0) {
      try {
        if (type === 'prayers') {
          const data = this.getReadPrayersData();
          data.updates = Array.from(new Set([...data.updates, ...allUpdateIds]));
          this.setReadPrayersData(data);
        } else {
          const data = this.getReadPromptsData();
          data.updates = Array.from(new Set([...data.updates, ...allUpdateIds]));
          this.setReadPromptsData(data);
        }
      } catch (error) {
        console.warn(`Failed to mark all updates as read for ${type}:`, error);
      }
    }
  }

  /**
   * Private helper: Mark updates for a specific item as read
   */
  private markItemUpdatesAsRead(itemId: string, type: 'prayers' | 'prompts'): void {
    const cacheKey = type === 'prayers' ? 'prayers_cache' : 'prompts_cache';

    try {
      const cached = localStorage.getItem(cacheKey);
      if (!cached) {
        return;
      }

      const parsedCache = JSON.parse(cached);
      const items = parsedCache?.data || parsedCache || [];

      if (!Array.isArray(items)) {
        return;
      }

      const item = items.find((i: CachedItem) => i.id === itemId);
      if (!item || !item.updates || !Array.isArray(item.updates)) {
        return;
      }

      let data: any;
      
      if (type === 'prayers') {
        data = this.getReadPrayersData();
        item.updates.forEach((update: any) => {
          if (update.id && !data.updates.includes(update.id)) {
            data.updates.push(update.id);
          }
        });
        this.setReadPrayersData(data);
      } else {
        data = this.getReadPromptsData();
        item.updates.forEach((update: any) => {
          if (update.id && !data.updates.includes(update.id)) {
            data.updates.push(update.id);
          }
        });
        this.setReadPromptsData(data);
      }
    } catch (error) {
      console.warn(`Failed to mark item updates as read:`, error);
    }
  }

  /**
   * Private helper: Get read IDs from localStorage
   */
  /**
   * Private helper: Get read prayers data (includes both prayer and update IDs)
   */
  private getReadPrayersData(): { prayers: string[]; updates: string[] } {
    try {
      const stored = localStorage.getItem(this.READ_PRAYERS_DATA_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          prayers: Array.isArray(parsed?.prayers) ? parsed.prayers : [],
          updates: Array.isArray(parsed?.updates) ? parsed.updates : []
        };
      }
      
      // Migration: Check for old separate keys (only if new key doesn't exist)
      const oldPrayersKey = localStorage.getItem('read_prayers');
      const oldUpdatesKey = localStorage.getItem('read_prayer_updates');
      
      if (!oldPrayersKey && !oldUpdatesKey) {
        // No old data to migrate
        return { prayers: [], updates: [] };
      }
      
      const prayers = oldPrayersKey ? JSON.parse(oldPrayersKey) : [];
      const updates = oldUpdatesKey ? JSON.parse(oldUpdatesKey) : [];
      
      const migratedData = {
        prayers: Array.isArray(prayers) ? prayers : [],
        updates: Array.isArray(updates) ? updates : []
      };
      
      // Save migrated data to new key
      this.setReadPrayersData(migratedData);
      // Clean up old keys
      localStorage.removeItem('read_prayers');
      localStorage.removeItem('read_prayer_updates');
      
      return migratedData;
    } catch (error) {
      console.warn('Failed to parse read prayers data:', error);
      return { prayers: [], updates: [] };
    }
  }

  /**
   * Private helper: Set read prayers data
   */
  private setReadPrayersData(data: { prayers: string[]; updates: string[] }): void {
    try {
      localStorage.setItem(this.READ_PRAYERS_DATA_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to set read prayers data:', error);
    }
  }

  /**
   * Private helper: Get read prompts data (includes both prompt and update IDs)
   */
  private getReadPromptsData(): { prompts: string[]; updates: string[] } {
    try {
      const stored = localStorage.getItem(this.READ_PROMPTS_DATA_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          prompts: Array.isArray(parsed?.prompts) ? parsed.prompts : [],
          updates: Array.isArray(parsed?.updates) ? parsed.updates : []
        };
      }
      
      // Migration: Check for old separate keys (only if new key doesn't exist)
      const oldPromptsKey = localStorage.getItem('read_prompts');
      const oldUpdatesKey = localStorage.getItem('read_prompt_updates');
      
      if (!oldPromptsKey && !oldUpdatesKey) {
        // No old data to migrate
        return { prompts: [], updates: [] };
      }
      
      const prompts = oldPromptsKey ? JSON.parse(oldPromptsKey) : [];
      const updates = oldUpdatesKey ? JSON.parse(oldUpdatesKey) : [];
      
      const migratedData = {
        prompts: Array.isArray(prompts) ? prompts : [],
        updates: Array.isArray(updates) ? updates : []
      };
      
      // Save migrated data to new key
      this.setReadPromptsData(migratedData);
      // Clean up old keys
      localStorage.removeItem('read_prompts');
      localStorage.removeItem('read_prompt_updates');
      
      return migratedData;
    } catch (error) {
      console.warn('Failed to parse read prompts data:', error);
      return { prompts: [], updates: [] };
    }
  }

  /**
   * Private helper: Set read prompts data
   */
  private setReadPromptsData(data: { prompts: string[]; updates: string[] }): void {
    try {
      localStorage.setItem(this.READ_PROMPTS_DATA_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to set read prompts data:', error);
    }
  }

  /**
   * Private helper: Get read IDs from the legacy format (for backward compatibility)
   */
  /**
   * Private helper: Update badge count observable
   */
  private updateBadgeCount(type: 'prayers' | 'prompts'): void {
    const count = this.calculateBadgeCount(type);
    const subject = this.badgeCountSubject$.get(type);
    if (subject) {
      subject.next(count);
    }
  }

  /**
   * Private helper: Update status-specific badge count observable
   */
  private updateStatusBadgeCount(type: 'prayers' | 'prompts', status?: 'current' | 'answered'): void {
    if (!status || type !== 'prayers') return;
    
    const key = `${type}_${status}`;
    const count = this.calculateBadgeCount(type, status);
    const subject = this.statusBadgeCountSubject$.get(key);
    if (subject) {
      subject.next(count);
    }
  }
}
