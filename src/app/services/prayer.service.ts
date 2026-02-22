import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent, distinctUntilChanged, first } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';
import { EmailNotificationService } from './email-notification.service';
import { VerificationService } from './verification.service';
import { CacheService } from './cache.service';
import { BadgeService } from './badge.service';
import { UserSessionService } from './user-session.service';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type PrayerStatus = 'current' | 'answered' | 'archived';

export interface PrayerUpdate {
  id: string;
  prayer_id: string;
  content: string;
  author: string;
  author_email?: string;
  created_at: string;
  updated_at?: string;
  is_anonymous?: boolean;
  is_answered?: boolean;
  approval_status?: string;
  in_planning_center?: boolean | null;
}

export interface PrayerRequest {
  id: string;
  title: string;
  description: string;
  status: PrayerStatus;
  approval_status?: 'pending' | 'approved' | 'rejected';
  requester: string;
  prayer_for: string;
  email?: string | null;
  is_anonymous?: boolean;
  type?: 'prayer' | 'prompt';
  date_requested: string;
  date_answered?: string | null;
  created_at: string;
  updated_at: string;
  last_reminder_sent?: string | null;
  category?: string | null;
  display_order?: number;
  prayer_image?: string | null;
  updates: PrayerUpdate[];
  in_planning_center?: boolean | null;
  is_shared_personal_prayer?: boolean;
}

export interface PrayerFilters {
  status?: PrayerStatus;
  search?: string;
  type?: string;
  category?: string; // Filter personal prayers by category
}

// Category range constants for personal prayer display_order
const CATEGORY_RANGE_SIZE = 1000;
const UNCATEGORIZED_MIN = 0;
const UNCATEGORIZED_MAX = 999;

@Injectable({
  providedIn: 'root'
})
export class PrayerService {
  private allPrayersSubject = new BehaviorSubject<PrayerRequest[]>([]);
  private prayersSubject = new BehaviorSubject<PrayerRequest[]>([]);
  private allPersonalPrayersSubject = new BehaviorSubject<PrayerRequest[]>([]);
  private loadingPersonalPrayersSubject = new BehaviorSubject<boolean>(true);
  private loadingSubject = new BehaviorSubject<boolean>(true);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private realtimeChannel: RealtimeChannel | null = null;
  private currentFilters: PrayerFilters = {};
  private inactivityTimeout: any = null;
  private inactivityThresholdMs = 5 * 60 * 1000; // 5 minutes of inactivity
  private backgroundRecoveryTimeouts: Map<string, number> = new Map();
  private isInBackground = document.hidden;

  public allPrayers$ = this.allPrayersSubject.asObservable();
  public prayers$ = this.prayersSubject.asObservable();
  public allPersonalPrayers$ = this.allPersonalPrayersSubject.asObservable();
  public loadingPersonalPrayers$ = this.loadingPersonalPrayersSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  constructor(
    private supabase: SupabaseService,
    private toast: ToastService,
    private emailNotification: EmailNotificationService,
    private verificationService: VerificationService,
    private cache: CacheService,
    private badgeService: BadgeService,
    private userSessionService: UserSessionService
  ) {
    this.initializePrayers();
  }

  private async initializePrayers(): Promise<void> {
    await this.loadPrayers();
    
    // Subscribe to user session changes to auto-load personal prayers
    this.userSessionService.userSession$
      .pipe(
        // Only trigger when user email changes (not on every session field change)
        distinctUntilChanged((prev, curr) => 
          prev?.email === curr?.email
        )
      )
      .subscribe((session) => {
        if (session?.email) {
          // Automatically load personal prayers when user logs in
          this.loadPersonalPrayers().catch(err => 
            console.error('[PrayerService] Error loading personal prayers on session change:', err)
          );
        } else {
          // Clear personal prayers when user logs out
          this.allPersonalPrayersSubject.next([]);
          this.cache.invalidate('personalPrayers');
        }
      });
    
    this.setupRealtimeSubscription();
    this.setupVisibilityListener();
    this.setupInactivityListener();
    this.setupBackgroundRecoveryListener();
  }

  /**
   * Load prayers from database with cache-first approach (Tier 1 optimization)
   * - Check cache first before hitting database
   * - For silent refreshes, skip DB if cache is recent (<20 min)
   * - Fallback to cached data on network failure
   */
  async loadPrayers(silentRefresh = false): Promise<void> {
    try {
      console.log('[PrayerService] Loading prayers...');
      // ✅ TIER 1: Check cache first
      const cachedPrayers = this.cache.get<PrayerRequest[]>('prayers');
      if (cachedPrayers && cachedPrayers.length > 0) {
        console.log(`[PrayerService] Using cached prayers (${cachedPrayers.length} items)`);
        this.allPrayersSubject.next(cachedPrayers);
        this.applyFilters(this.currentFilters);
        
        // ✅ TIER 1: If silent refresh and cache exists, skip DB query entirely
        // This is the biggest egress saver - window focus, visibility changes won't hit DB
        if (silentRefresh) {
          console.log('[PrayerService] Cache hit for silent refresh - skipping database query');
          return;
        }
      }
      
      // Only show loading if we need to fetch from DB and it's not a silent refresh
      if (!silentRefresh && !cachedPrayers) {
        this.loadingSubject.next(true);
      }
      this.errorSubject.next(null);

      const { data: prayersData, error } = await this.supabase.client
        .from('prayers')
        .select(`
          *,
          prayer_updates!prayer_updates_prayer_id_fkey(*)
        `)
        .eq('approval_status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log(`[PrayerService] Loaded ${prayersData?.length || 0} approved prayers from database`);

      const formattedPrayers = (prayersData || []).map((prayer: any) => {
        const updates = (prayer.prayer_updates || [])
          .filter((u: any) => u && u.approval_status === 'approved')
          .sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        
        return {
          id: prayer.id,
          title: prayer.title,
          description: prayer.description || 'No description provided',
          status: prayer.status,
          requester: prayer.requester,
          prayer_for: prayer.prayer_for,
          email: prayer.email,
          is_anonymous: prayer.is_anonymous,
          type: prayer.type,
          date_requested: prayer.date_requested,
          date_answered: prayer.date_answered,
          created_at: prayer.created_at,
          updated_at: prayer.updated_at,
          last_reminder_sent: prayer.last_reminder_sent,
          updates: updates.map((u: any) => ({
            id: u.id,
            prayer_id: u.prayer_id,
            content: u.content,
            author: u.author,
            is_anonymous: u.is_anonymous,
            created_at: u.created_at
          }))
        } as PrayerRequest;
      });

      // Sort by most recent activity
      const sortedPrayers = formattedPrayers
        .map(prayer => ({
          prayer,
          latestActivity: Math.max(
            new Date(prayer.created_at).getTime(),
            prayer.updates.length > 0 
              ? new Date(prayer.updates[0].created_at).getTime()
              : 0
          )
        }))
        .sort((a, b) => b.latestActivity - a.latestActivity)
        .map(({ prayer }) => prayer);

      this.allPrayersSubject.next(sortedPrayers);
      this.cache.set('prayers', sortedPrayers);
      this.applyFilters(this.currentFilters);
      
      // Refresh badge counts to ensure badges show up for new updates
      this.badgeService.refreshBadgeCounts();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load prayers';
      console.error('[PrayerService] Failed to load prayers:', err);
      
      // Try to load from cache as fallback
      const cachedPrayers = this.cache.get<PrayerRequest[]>('prayers');
      if (cachedPrayers && cachedPrayers.length > 0) {
        console.log(`[PrayerService] Showing ${cachedPrayers.length} cached prayers (error fallback)`);
        this.allPrayersSubject.next(cachedPrayers);
        this.applyFilters(this.currentFilters);
        this.errorSubject.next(null); // Clear error to show data silently
      } else {
        // No cache available
        this.errorSubject.next(errorMessage);
        this.toast.error('Failed to load prayers');
      }
    } finally {
      this.loadingSubject.next(false);
    }
  }

  /**
   * Load personal prayers from database with cache-first approach (Tier 1 optimization)
   * - Check cache first before hitting database
   * - Personal prayers only change when the current user adds them (DB updates cache immediately)
   * - For silent refreshes, skip DB if cache exists
   */
  async loadPersonalPrayers(silentRefresh = false): Promise<void> {
    try {
      this.loadingPersonalPrayersSubject.next(true);
      console.log('[PrayerService] Loading personal prayers...');
      
      const userEmail = await this.getUserEmail();
      if (!userEmail) {
        console.warn('[PrayerService] User email not available for personal prayers');
        this.loadingPersonalPrayersSubject.next(false);
        return;
      }

      // ✅ TIER 1: Check cache first
      const cachedPersonalPrayers = this.cache.get<PrayerRequest[]>('personalPrayers');
      if (cachedPersonalPrayers && cachedPersonalPrayers.length > 0) {
        console.log(`[PrayerService] Using cached personal prayers (${cachedPersonalPrayers.length} items)`);
        this.allPersonalPrayersSubject.next(cachedPersonalPrayers);
        
        // ✅ TIER 1: Skip DB for silent refresh - personal prayers only change when user adds them
        if (silentRefresh) {
          console.log('[PrayerService] Cache hit for silent refresh - skipping personal prayers database query');
          return;
        }
      }

      const { data, error } = await this.supabase.client
        .from('personal_prayers')
        .select(`
          id,
          title,
          description,
          category,
          prayer_for,
          user_email,
          display_order,
          created_at,
          updated_at,
          personal_prayer_updates (
            id,
            content,
            author,
            author_email,
            mark_as_answered,
            created_at
          )
        `)
        .eq('user_email', userEmail)
        .order('display_order', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const personalPrayers = (data || []).map(p => ({
        id: p.id,
        title: p.title,
        description: p.description,
        category: p.category,
        status: (p.category === 'Answered' ? 'answered' : 'current') as PrayerStatus,
        prayer_for: p.prayer_for,
        requester: p.user_email,
        email: p.user_email,
        user_email: p.user_email,
        is_anonymous: false,
        date_requested: p.created_at,
        created_at: p.created_at,
        updated_at: p.updated_at,
        approval_status: 'approved' as const,
        type: 'prayer' as const,
        display_order: p.display_order,
        updates: (p.personal_prayer_updates || []).map((u: any) => ({
          id: u.id,
          prayer_id: p.id,
          content: u.content,
          author: u.author,
          author_email: u.author_email,
          is_anonymous: false,
          mark_as_answered: u.mark_as_answered,
          created_at: u.created_at,
          approval_status: 'approved' as const
        }))
      }));

      // Use the database ordering (by display_order DESC, then created_at DESC)
      // Don't re-sort by activity as it would override user's manual ordering
      console.log(`[PrayerService] Loaded ${personalPrayers.length} personal prayers from database`);
      this.allPersonalPrayersSubject.next(personalPrayers);
      this.cache.set('personalPrayers', personalPrayers);
      this.loadingPersonalPrayersSubject.next(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load personal prayers';
      console.error('[PrayerService] Failed to load personal prayers:', err);
      
      // Try to load from cache as fallback - but only if it belongs to the current user
      const userEmail = await this.getUserEmail();
      const cachedPersonalPrayers = this.cache.get<PrayerRequest[]>('personalPrayers');
      
      if (cachedPersonalPrayers && cachedPersonalPrayers.length > 0) {
        // Safety check: verify cached prayers belong to current user
        const allCachedPrayersMatchCurrentUser = cachedPersonalPrayers.every(p => p.email === userEmail);
        
        if (allCachedPrayersMatchCurrentUser) {
          console.log(`[PrayerService] Showing ${cachedPersonalPrayers.length} cached personal prayers`);
          this.allPersonalPrayersSubject.next(cachedPersonalPrayers);
        } else {
          console.warn('[PrayerService] Cached personal prayers do not match current user - discarding cache');
          this.cache.invalidate('personalPrayers');
          this.allPersonalPrayersSubject.next([]);
        }
      }
      this.loadingPersonalPrayersSubject.next(false);
    }
  }
  async getPrayersByMonth(year: number, month: number): Promise<PrayerRequest[]> {
    try {
      // Create date range for the month
      const startDate = new Date(year, month - 1, 1).toISOString();
      const endDate = new Date(year, month, 1).toISOString();

      const { data: prayersData, error } = await this.supabase.client
        .from('prayers')
        .select(`
          *,
          prayer_updates!prayer_updates_prayer_id_fkey(*)
        `)
        .or(`(updated_at.gte.${startDate},updated_at.lt.${endDate}),(created_at.gte.${startDate},created_at.lt.${endDate})`)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Format the data same as loadPrayers
      const formattedPrayers = (prayersData || []).map((prayer: any) => ({
        ...prayer,
        updates: prayer.prayer_updates || []
      }));

      // Sort by latest activity
      return formattedPrayers
        .map(prayer => ({
          prayer,
          latestActivity: Math.max(
            new Date(prayer.created_at).getTime(),
            prayer.updates.length > 0 
              ? new Date(prayer.updates[0].created_at).getTime()
              : 0
          )
        }))
        .sort((a, b) => b.latestActivity - a.latestActivity)
        .map(({ prayer }) => prayer);
    } catch (err) {
      console.error(`[PrayerService] Failed to load prayers for ${year}-${month}:`, err);
      return [];
    }
  }

  /**
   * Refresh data when window regains focus or after inactivity
   */
  private setupInactivityListener(): void {
    // Refresh when window regains focus (tab becomes visible again)
    fromEvent(window, 'focus').subscribe(() => {
      console.log('[PrayerService] Window regained focus, refreshing data');
      this.loadPrayers(true).catch(err => {
        console.debug('[PrayerService] Background refresh failed:', err);
        // Silently fail - keep showing cached data
      });
    });

    // Track inactivity - reset timer on any user activity
    const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    
    const resetInactivityTimer = () => {
      clearTimeout(this.inactivityTimeout);
      this.inactivityTimeout = setTimeout(() => {
        console.log('[PrayerService] Inactivity detected, next activity will trigger refresh');
      }, this.inactivityThresholdMs);
    };

    // Set up initial inactivity timer
    resetInactivityTimer();

    // Reset timer on any activity
    activityEvents.forEach(event => {
      fromEvent(document, event).subscribe(() => {
        resetInactivityTimer();
      });
    });

    // When document gains focus after being in background, trigger refresh
    fromEvent(document, 'visibilitychange').subscribe(() => {
      if (!document.hidden) {
        console.log('[PrayerService] Window regained focus, refreshing data');
        this.loadPrayers(true).catch(err => {
          console.debug('[PrayerService] Background refresh failed:', err);
        });
      }
    });
  }

  /**
   * Handle background/foreground transitions for Edge on iOS
   * Edge may suspend the app and lose connections, so we need to actively recover
   */
  private setupBackgroundRecoveryListener(): void {
    // Listen for visibility changes
    fromEvent(document, 'visibilitychange').subscribe(() => {
      if (document.hidden) {
        this.isInBackground = true;
        console.log('[PrayerService] App going to background - pausing aggressive operations');
        
        // Clear any pending recovery timeouts
        this.backgroundRecoveryTimeouts.forEach(timeout => clearTimeout(timeout));
        this.backgroundRecoveryTimeouts.clear();
      } else {
        this.isInBackground = false;
        console.log('[PrayerService] App returning from background - triggering recovery');
        
        // Trigger immediate recovery
        this.triggerBackgroundRecovery();
      }
    });

    // Listen for app visibility event (custom event from AppComponent)
    window.addEventListener('app-became-visible', () => {
      if (!document.hidden) {
        console.log('[PrayerService] Received app-became-visible event, triggering recovery');
        this.triggerBackgroundRecovery();
      }
    });
  }

  /**
   * Trigger background recovery - refresh data and ensure connections are healthy
   */
  private triggerBackgroundRecovery(): void {
    try {
      console.log('[PrayerService] Background recovery triggered');
      
      // Ensure we have cached data to show while refreshing
      const cachedPrayers = this.cache.get<PrayerRequest[]>('prayers');
      if (cachedPrayers && cachedPrayers.length > 0) {
        console.log('[PrayerService] Using cached data during recovery');
        this.allPrayersSubject.next(cachedPrayers);
        this.applyFilters(this.currentFilters);
      }
      
      // Silently refresh data in the background
      this.loadPrayers(true).catch(err => {
        console.debug('[PrayerService] Recovery refresh failed, keeping cached data visible:', err);
        // If refresh fails, ensure cached data is shown
        const cached = this.cache.get<PrayerRequest[]>('prayers');
        if (cached && cached.length > 0) {
          this.allPrayersSubject.next(cached);
          this.applyFilters(this.currentFilters);
        }
      });
      
      // Restart realtime subscription if it was lost
      if (!this.realtimeChannel) {
        console.log('[PrayerService] Restarting realtime subscription after background');
        this.setupRealtimeSubscription();
      }
    } catch (err) {
      console.error('[PrayerService] Background recovery failed:', err);
      // Still try to show cached data
      const cached = this.cache.get<PrayerRequest[]>('prayers');
      if (cached && cached.length > 0) {
        console.log('[PrayerService] Showing cached data as fallback');
        this.allPrayersSubject.next(cached);
        this.applyFilters(this.currentFilters);
      }
    }
  }

  /**
   * Apply filters to prayers list
   */
  applyFilters(filters: PrayerFilters): void {
    this.currentFilters = filters;
    let filtered = this.allPrayersSubject.getValue();

    // Filter by status
    if (filters.status) {
      filtered = filtered.filter(p => p.status === filters.status);
    }

    // Filter by type (prompt)
    if (filters.type === 'prompt') {
      filtered = filtered.filter(p => p.type === 'prompt');
    }

    // Filter by search term
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(p => {
        // Check prayer fields
        const prayerMatch = p.title.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower) ||
          p.requester.toLowerCase().includes(searchLower);
        
        // Also check prayer updates
        const updateMatch = p.updates && p.updates.length > 0 &&
          p.updates.some(update =>
            update.content && update.content.toLowerCase().includes(searchLower)
          );

        return prayerMatch || updateMatch;
      });
    }

    // Filter by category (for personal prayers)
    if (filters.category) {
      filtered = filtered.filter(p => p.category === filters.category);
    }

    this.prayersSubject.next(filtered);
  }

  /**
   * Add a new prayer request
   */
  async addPrayer(prayer: Omit<PrayerRequest, 'id' | 'date_requested' | 'created_at' | 'updated_at' | 'updates'>): Promise<boolean> {
    try {
      const prayerData: any = {
        title: prayer.title,
        description: prayer.description,
        status: prayer.status,
        requester: prayer.requester,
        prayer_for: prayer.prayer_for,
        approval_status: 'pending',
        email: prayer.email || null,
        is_anonymous: prayer.is_anonymous || false
      };

      const { data, error } = await this.supabase.client
        .from('prayers')
        .insert(prayerData)
        .select()
        .single();

      if (error) throw error;

      // Auto-subscribe user to email notifications if email provided
      if (prayer.email) {
        try {
          const { data: existing } = await this.supabase.client
            .from('email_subscribers')
            .select('id')
            .eq('email', prayer.email.toLowerCase().trim())
            .maybeSingle();

          if (!existing) {
            await this.supabase.client
              .from('email_subscribers')
              .insert({
                name: prayer.requester,
                email: prayer.email.toLowerCase().trim(),
                is_active: true,
                is_admin: false
              });
          }
        } catch (subscribeError) {
          console.error('Failed to auto-subscribe user:', subscribeError);
        }
      }

      // Send email notification to admins (don't let email failures block prayer submission)
      this.emailNotification.sendAdminNotification({
        type: 'prayer',
        title: prayer.title,
        description: prayer.description,
        requester: prayer.requester,
        requestId: data.id
      }).catch(err => console.error('Failed to send admin notification:', err));

      this.toast.success('Prayer request submitted for approval');
      return true;
    } catch (error) {
      console.error('Error adding prayer:', error);
      this.toast.error('Failed to submit prayer request');
      return false;
    }
  }

  /**
   * Update prayer status
   */
  async updatePrayerStatus(id: string, status: PrayerStatus): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('prayers')
        .update({ 
          status,
          date_answered: status === 'answered' ? new Date().toISOString() : null
        })
        .eq('id', id);

      if (error) throw error;

      // Update local state
      const prayers = this.prayersSubject.value;
      const updatedPrayers = prayers.map(p => 
        p.id === id ? { ...p, status, date_answered: status === 'answered' ? new Date().toISOString() : null } : p
      );
      this.prayersSubject.next(updatedPrayers);

      this.toast.success(`Prayer marked as ${status}`);
      return true;
    } catch (error) {
      console.error('Error updating prayer status:', error);
      this.toast.error('Failed to update prayer status');
      return false;
    }
  }

  /**
   * Add an update to a prayer
   */
  async addPrayerUpdate(prayerId: string, content: string, author: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.client
        .from('prayer_updates')
        .insert({
          prayer_id: prayerId,
          content,
          author,
          approval_status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Get prayer title for notification
      const { data: prayer } = await this.supabase.client
        .from('prayers')
        .select('title')
        .eq('id', prayerId)
        .single();

      // Send email notification to admins (don't let email failures block update submission)
      if (prayer) {
        this.emailNotification.sendAdminNotification({
          type: 'update',
          title: prayer.title,
          author,
          content,
          requestId: data.id
        }).catch(err => console.error('Failed to send admin notification:', err));
      }

      this.toast.success('Update submitted for approval');
      return true;
    } catch (error) {
      console.error('Error adding prayer update:', error);
      this.toast.error('Failed to add update');
      return false;
    }
  }

  /**
   * Add an update to a Planning Center member prayer card
   */
  async addMemberPrayerUpdate(personId: string, memberName: string, content: string, author: string, authorEmail: string = '', isAnswered: boolean = false, listId?: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.client
        .from('member_prayer_updates')
        .insert({
          person_id: personId,
          content,
          is_answered: isAnswered
        })
        .select()
        .single();

      if (error) throw error;

      // Clear both caches
      this.cache.invalidate('memberPrayerUpdates');
      if (listId) {
        this.clearPlanningCenterListDataCache(listId);
      }

      this.toast.success('Update added successfully');
      return true;
    } catch (error) {
      console.error('Error adding member prayer update:', error);
      this.toast.error('Failed to add update');
      return false;
    }
  }

  /**
   * Get updates for Planning Center members by batch fetching
   * Fetches updates only for specified person IDs (much faster than fetching all)
   * Returns a map keyed by person_id for easy access
   */
  async getMemberPrayerUpdatesBatch(personIds: string[]): Promise<Record<string, any[]>> {
    try {
      if (personIds.length === 0) {
        return {};
      }

      // Batch fetch updates for specific members only
      const { data, error } = await this.supabase.client
        .from('member_prayer_updates')
        .select('id, person_id, content, created_at, updated_at, is_answered')
        .in('person_id', personIds)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group updates by person_id for efficient access
      const updatesMap: Record<string, any[]> = {};
      (data || []).forEach(update => {
        if (!updatesMap[update.person_id]) {
          updatesMap[update.person_id] = [];
        }
        updatesMap[update.person_id].push({
          id: update.id,
          content: update.content,
          created_at: update.created_at,
          updated_at: update.updated_at,
          is_answered: update.is_answered
        });
      });

      // Cache the batch results
      this.cache.set('memberPrayerUpdates', updatesMap);

      console.log(`[PrayerService] Batch loaded updates for ${personIds.length} members`);
      return updatesMap;
    } catch (error) {
      console.error('Error fetching batch member prayer updates:', error);
      return {};
    }
  }

  /**
   * Get updates for a Planning Center member by person_id
   * Uses cache first, falls back to batch fetch if needed
   */
  async getMemberPrayerUpdates(personId: string): Promise<any[]> {
    try {
      // Try to get from cache first
      const cachedUpdates = this.cache.get('memberPrayerUpdates') as Record<string, any[]> | undefined;
      if (cachedUpdates && cachedUpdates[personId]) {
        return cachedUpdates[personId];
      }

      // Cache miss - fetch just this person's updates
      const { data, error } = await this.supabase.client
        .from('member_prayer_updates')
        .select('id, person_id, content, created_at, updated_at, is_answered')
        .eq('person_id', personId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const updates = (data || []).map(u => ({
        id: u.id,
        content: u.content,
        created_at: u.created_at,
        updated_at: u.updated_at,
        is_answered: u.is_answered
      }));

      // Update cache
      const cachedMap = cachedUpdates || {};
      cachedMap[personId] = updates;
      this.cache.set('memberPrayerUpdates', cachedMap);

      return updates;
    } catch (error) {
      console.error('Error fetching member prayer updates:', error);
      return [];
    }
  }

  /**
   * Clear cache for Planning Center list data (call after adding/editing/deleting member updates)
   * Clears the consolidated list cache so it refetches with updated member updates
   * Note: listId needed because member updates are cached at the list level
   */
  clearPlanningCenterListDataCache(listId: string): void {
    const cacheKey = `planningCenterListData_${listId}`;
    this.cache.invalidate(cacheKey);
  }

  /**
   * Delete a member prayer update by ID and clear cache
   */
  async deleteMemberPrayerUpdate(updateId: string, personId: string, listId?: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('member_prayer_updates')
        .delete()
        .eq('id', updateId);

      if (error) {
        console.error('[PrayerService] Error deleting member update:', error);
        throw error;
      }

      // Clear both caches
      this.cache.invalidate('memberPrayerUpdates');
      if (listId) {
        this.clearPlanningCenterListDataCache(listId);
      }
      
      this.toast.success('Update deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting member prayer update:', error);
      this.toast.error('Failed to delete update');
      return false;
    }
  }

  /**
   * Update a member prayer update
   */
  async updateMemberPrayerUpdate(updateId: string, personId: string, updates: Partial<PrayerUpdate>, listId?: string): Promise<boolean> {
    try {
      const updateData: any = {};
      if (updates.content) updateData.content = updates.content;
      if (updates.is_answered !== undefined) updateData.is_answered = updates.is_answered;

      const { data, error } = await this.supabase.client
        .from('member_prayer_updates')
        .update(updateData)
        .eq('id', updateId)
        .select();

      if (error) {
        throw error;
      }

      // Clear both caches
      this.cache.invalidate('memberPrayerUpdates');
      if (listId) {
        this.clearPlanningCenterListDataCache(listId);
      }

      this.toast.success('Update saved successfully');
      return true;
    } catch (error) {
      console.error('Error updating member prayer update:', error);
      this.toast.error('Failed to save update');
      return false;
    }
  }

  /**
   * Delete a prayer
   */
  async deletePrayer(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('prayers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update local state immediately for responsive UI
      const filteredPrayers = this.prayersSubject.value.filter(p => p.id !== id);
      this.prayersSubject.next(filteredPrayers);

      // Also update the canonical allPrayers$ stream and cache so counts and filters stay in sync
      const filteredAllPrayers = this.allPrayersSubject.value.filter(p => p.id !== id);
      this.allPrayersSubject.next(filteredAllPrayers);
      this.cache.set('prayers', filteredAllPrayers);
      this.applyFilters(this.currentFilters);
      this.badgeService.refreshBadgeCounts();

      this.toast.success('Prayer deleted');
      return true;
    } catch (error) {
      console.error('Error deleting prayer:', error);
      this.toast.error('Failed to delete prayer');
      return false;
    }
  }

  /**
   * Delete a prayer update
   */
  async deletePrayerUpdate(updateId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('prayer_updates')
        .delete()
        .eq('id', updateId);

      if (error) throw error;

      // Reload prayers to reflect the change
      await this.loadPrayers();
      
      this.toast.success('Update deleted');
      return true;
    } catch (error) {
      console.error('Error deleting prayer update:', error);
      this.toast.error('Failed to delete update');
      return false;
    }
  }

  /**
   * Get filtered prayers
   */
  getFilteredPrayers(filters: PrayerFilters): PrayerRequest[] {
    let filtered = this.prayersSubject.value;

    if (filters.status) {
      filtered = filtered.filter(p => p.status === filters.status);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(p => {
        // Check prayer fields
        const prayerMatch = p.title.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower) ||
          p.requester.toLowerCase().includes(searchLower) ||
          p.prayer_for.toLowerCase().includes(searchLower);
        
        // Also check prayer updates
        const updateMatch = p.updates && p.updates.length > 0 &&
          p.updates.some(update =>
            update.content && update.content.toLowerCase().includes(searchLower)
          );

        return prayerMatch || updateMatch;
      });
    }

    return filtered;
  }

  /**
   * Set up real-time subscription for prayer changes
   */
  private setupRealtimeSubscription(): void {
    try {
      console.log('[PrayerService] Setting up realtime subscription...');
      
      this.realtimeChannel = this.supabase.client
        .channel('prayers-channel')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'prayers'
          },
          (payload) => {
            console.log('[PrayerService] Prayer changed:', payload);
            this.loadPrayers(true).catch(err => {
              console.error('[PrayerService] Error reloading after prayer change:', err);
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'prayer_updates'
          },
          (payload) => {
            console.log('[PrayerService] Prayer update changed:', payload);
            this.loadPrayers(true).catch(err => {
              console.error('[PrayerService] Error reloading after update change:', err);
            });
          }
        )
        .subscribe((status) => {
          console.log('[PrayerService] Realtime subscription status:', status);
          if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            console.warn('[PrayerService] Realtime subscription disconnected, will retry on next activity');
          }
        });
    } catch (error) {
      console.error('[PrayerService] Error setting up realtime subscription:', error);
      // Continue without realtime - fallback to polling
    }
  }

  /**
   * Clean up subscriptions and resources when service is destroyed
   */
  async cleanup(): Promise<void> {
    console.log('[PrayerService] Cleaning up...');
    try {
      if (this.realtimeChannel) {
        await this.supabase.client.removeChannel(this.realtimeChannel);
        this.realtimeChannel = null;
      }
      if (this.inactivityTimeout) {
        clearTimeout(this.inactivityTimeout);
      }
    } catch (error) {
      console.error('[PrayerService] Error during cleanup:', error);
    }
  }

  /**
   * Reload prayers when page becomes visible (ALWAYS silent refresh in background)
   * This keeps the UI visible with cached data while fetching fresh data
   */
  private setupVisibilityListener(): void {
    fromEvent(document, 'visibilitychange').subscribe(() => {
      if (document.visibilityState === 'visible') {
        console.log('[PrayerService] Page became visible, silently refreshing data in background');
        // ALWAYS use silent refresh (true) to keep UI visible - never show loading state for auto-refresh
        this.loadPrayers(true).catch(err => {
          console.debug('[PrayerService] Silent refresh failed, keeping cached data visible:', err);
          // Fallback: show cached data if available
          const cached = this.cache.get<PrayerRequest[]>('prayers');
          if (cached && cached.length > 0) {
            console.log('[PrayerService] Showing cached data while refresh failed');
            this.allPrayersSubject.next(cached);
            this.applyFilters(this.currentFilters);
          }
        });
      }
    });
  }

  /**
   * Add an update to a prayer with full details
   */
  async addUpdate(updateData: any): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.client
        .from('prayer_updates')
        .insert({
          prayer_id: updateData.prayer_id,
          content: updateData.content,
          author: updateData.author,
          author_email: updateData.author_email,
          is_anonymous: updateData.is_anonymous,
          mark_as_answered: updateData.mark_as_answered,
          approval_status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Get prayer title for admin notification
      const { data: prayer } = await this.supabase.client
        .from('prayers')
        .select('title')
        .eq('id', updateData.prayer_id)
        .single();

      // Send email notification to admins (don't let email failures block update submission)
      if (prayer) {
        this.emailNotification.sendAdminNotification({
          type: 'update',
          title: prayer.title,
          author: updateData.author,
          content: updateData.content,
          requestId: data.id
        }).catch(err => console.error('Failed to send admin notification:', err));
      }

      this.toast.success('Update submitted for approval');
      return true;
    } catch (error) {
      console.error('Error adding update:', error);
      this.toast.error('Failed to add update');
      return false;
    }
  }

  /**
   * Delete an update
   */
  async deleteUpdate(updateId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('prayer_updates')
        .delete()
        .eq('id', updateId);

      if (error) throw error;

      this.toast.success('Update deleted');
      await this.loadPrayers();
      return true;
    } catch (error) {
      console.error('Error deleting update:', error);
      this.toast.error('Failed to delete update');
      return false;
    }
  }

  /**
   * Request deletion of a prayer
   */
  async requestDeletion(requestData: any): Promise<boolean> {
    try {
      const fullName = `${requestData.requester_first_name} ${requestData.requester_last_name}`;
      
      const { data, error } = await this.supabase.client
        .from('deletion_requests')
        .insert({
          prayer_id: requestData.prayer_id,
          requested_by: fullName,
          requested_email: requestData.requester_email,
          reason: requestData.reason
        })
        .select('id')
        .single();

      if (error) throw error;

      // Fetch the prayer info for admin notification (best-effort)
      try {
        const { data: prayerRow } = await this.supabase.client
          .from('prayers')
          .select('title')
          .eq('id', requestData.prayer_id)
          .single();

        const title = prayerRow?.title || 'Unknown Prayer';

        // Send admin notification (don't let email failures block the request)
        this.emailNotification.sendAdminNotification({
          type: 'deletion',
          title,
          reason: requestData.reason,
          requester: fullName,
          requestId: data?.id
        }).catch(err => console.error('Failed to send admin notification for prayer deletion request:', err));
      } catch (notifyErr) {
        console.warn('Could not fetch prayer details for notification:', notifyErr);
      }

      this.toast.success('Deletion request submitted for review');
      return true;
    } catch (error) {
      console.error('Error requesting deletion:', error);
      this.toast.error('Failed to submit deletion request');
      return false;
    }
  }

  /**
   * Request deletion of a prayer update
   */
  async requestUpdateDeletion(requestData: any): Promise<boolean> {
    try {
      const fullName = `${requestData.requester_first_name} ${requestData.requester_last_name}`;
      
      const { data, error } = await this.supabase.client
        .from('update_deletion_requests')
        .insert({
          update_id: requestData.update_id,
          requested_by: fullName,
          requested_email: requestData.requester_email,
          reason: requestData.reason
        })
        .select('id')
        .single();

      if (error) throw error;

      // Fetch the update/prayer info for admin notification (best-effort)
      try {
        const { data: updateRow } = await this.supabase.client
          .from('prayer_updates')
          .select('*, prayers!inner(title)')
          .eq('id', requestData.update_id)
          .single();

        const title = updateRow?.prayers?.title || 'Unknown Prayer';
        const author = updateRow?.author || undefined;
        const content = updateRow?.content || undefined;

        // Send admin notification (don't let email failures block the request)
        this.emailNotification.sendAdminNotification({
          type: 'deletion',
          title,
          reason: requestData.reason,
          requester: fullName,
          author,
          content,
          requestId: data?.id
        }).catch(err => console.error('Failed to send admin notification for update deletion request:', err));
      } catch (notifyErr) {
        console.warn('Could not fetch update/prayer details for notification:', notifyErr);
      }

      this.toast.success('Update deletion request submitted for review');
      return true;
    } catch (error) {
      console.error('Error requesting update deletion:', error);
      this.toast.error('Failed to submit update deletion request');
      return false;
    }
  }

  /**
   * Validate and sanitize category name (50 character max)
   */
  private sanitizeCategory(category: string | null | undefined): string | null {
    if (!category || typeof category !== 'string') {
      return null;
    }
    
    const trimmed = category.trim();
    if (trimmed.length === 0) {
      return null;
    }
    
    // Enforce 50 character limit
    if (trimmed.length > 50) {
      console.warn(`Category name exceeds 50 characters, truncating: "${trimmed}"`);
      return trimmed.substring(0, 50);
    }
    
    return trimmed;
  }

  /**
   * Get the display_order range for a category (category-scoped range system)
   * Uncategorized (null): 0-999
   * Categories assigned sequentially by creation order: 1000-1999, 2000-2999, etc.
   */
  private async getCategoryRange(category: string | null | undefined): Promise<{ min: number; max: number }> {
    if (!category || category.trim().length === 0) {
      // Uncategorized prayers use 0-999 range
      return { min: UNCATEGORIZED_MIN, max: UNCATEGORIZED_MAX };
    }

    const userEmail = await this.getUserEmail();
    if (!userEmail) {
      throw new Error('User email not available');
    }

    // Get the actual min/max display_order for this category
    // This ensures we use the correct range after category swaps
    const { data: categoryPrayers, error } = await this.supabase.client
      .from('personal_prayers')
      .select('display_order')
      .eq('user_email', userEmail)
      .eq('category', category);

    if (error) throw error;

    if (!categoryPrayers || categoryPrayers.length === 0) {
      // New category - find the next available range
      // Get all categories with their min display_order to find gaps
      const { data: allCategoryData, error: allError } = await this.supabase.client
        .from('personal_prayers')
        .select('category, display_order')
        .eq('user_email', userEmail)
        .not('category', 'is', null)
        .gte('display_order', UNCATEGORIZED_MAX + 1);

      if (allError) throw allError;

      // Find the highest prefix in use
      let maxPrefix = 0;
      (allCategoryData || []).forEach((row: any) => {
        const prefix = Math.floor(row.display_order / 1000);
        maxPrefix = Math.max(maxPrefix, prefix);
      });

      // Assign next prefix
      const nextPrefix = maxPrefix + 1;
      const min = nextPrefix * 1000;
      const max = min + CATEGORY_RANGE_SIZE - 1;
      return { min, max };
    }

    // Existing category - determine its range from actual display_order values
    const displayOrders = categoryPrayers.map(p => p.display_order || 0);
    const minOrder = Math.min(...displayOrders);
    const prefix = Math.floor(minOrder / 1000);
    const min = prefix * 1000;
    const max = min + CATEGORY_RANGE_SIZE - 1;
    
    return { min, max };
  }

  /**
   * Count how many personal prayers exist in a category's display_order range
   */
  private async getCategoryPrayerCount(category: string | null | undefined): Promise<number> {
    const userEmail = await this.getUserEmail();
    if (!userEmail) {
      return 0;
    }

    // Get all personal prayers for the user in this category
    const { data: prayers, error } = await this.supabase.client
      .from('personal_prayers')
      .select('id')
      .eq('user_email', userEmail)
      .eq('category', category || null); // null for uncategorized

    if (error) {
      console.error('Error counting category prayers:', error);
      return 0;
    }

    return (prayers || []).length;
  }

  /**
   * Migrate existing personal prayers to category-scoped display_order ranges
   * NOTE: This migration is handled by Supabase SQL migration file instead
   * File: supabase/migrations/20260121_migrate_personal_prayers_to_category_ranges.sql
   */
  private async migratePersonalPrayersToRanges(): Promise<void> {
    // This function is kept for reference but not called
    // The SQL migration handles reassignment of all existing prayers to category ranges
    console.log('[Migration] Data migration handled by SQL migration file');
  }

  /**
   * PERSONAL PRAYERS - User-specific prayers with no admin approval workflow
   */

  /**
   * Get all personal prayers for the current user
   */
  async getPersonalPrayers(forceRefresh: boolean = false): Promise<PrayerRequest[]> {
    try {
      const userEmail = await this.getUserEmail();
      if (!userEmail) {
        console.error('User email not available');
        return [];
      }

      // Check cache first to reduce database egress (unless force refresh)
      if (!forceRefresh) {
        const cached = this.cache.get<PrayerRequest[]>('personalPrayers');
        if (cached) {
          return cached;
        }
      }

      const { data, error } = await this.supabase.client
        .from('personal_prayers')
        .select(`
          id,
          title,
          description,
          category,
          prayer_for,
          user_email,
          display_order,
          created_at,
          updated_at,
          personal_prayer_updates (
            id,
            content,
            author,
            author_email,
            mark_as_answered,
            created_at
          )
        `)
        .eq('user_email', userEmail)
        .order('display_order', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[PrayerService] Error querying personal_prayers:', error);
        throw error;
      }

      // Transform personal prayers to PrayerRequest format for reuse
      const prayers = (data || []).map(p => ({
        id: p.id,
        title: p.title,
        description: p.description,
        category: p.category,
        status: (p.category === 'Answered' ? 'answered' : 'current') as PrayerStatus,
        prayer_for: p.prayer_for,
        requester: p.user_email,
        email: p.user_email,
        is_anonymous: false,
        date_requested: p.created_at,
        created_at: p.created_at,
        updated_at: p.updated_at,
        approval_status: 'approved' as const,
        type: 'prayer' as const,
        display_order: p.display_order,
        updates: (p.personal_prayer_updates || []).map((u: any) => ({
          id: u.id,
          prayer_id: p.id,
          content: u.content,
          author: u.author,
          author_email: u.author_email,
          is_anonymous: false,
          mark_as_answered: u.mark_as_answered,
          created_at: u.created_at,
          approval_status: 'approved' as const
        }))
      }));
      
      // Cache the prayers for future requests
      this.cache.set('personalPrayers', prayers);
      
      return prayers;
    } catch (error) {
      console.error('[PrayerService] Failed to load personal prayers:', error);
      return [];
    }
  }

  /**
   * Add a new personal prayer
   */
  async addPersonalPrayer(prayer: Omit<PrayerRequest, 'id' | 'date_requested' | 'created_at' | 'updated_at' | 'updates' | 'approval_status'>): Promise<boolean> {
    try {
      const userEmail = await this.getUserEmail();
      if (!userEmail) {
        this.toast.error('User email not available');
        return false;
      }

      console.log('Adding personal prayer for email:', userEmail);

      // Validate category limit (max 1000 prayers per category)
      const category = this.sanitizeCategory(prayer.category);
      const categoryCount = await this.getCategoryPrayerCount(category);
      if (categoryCount >= CATEGORY_RANGE_SIZE) {
        const categoryName = category || 'Uncategorized';
        this.toast.error(`Category '${categoryName}' has reached its limit of 1,000 prayers. Please archive or delete some prayers, or organize into multiple categories.`);
        return false;
      }

      // Get the category range for display_order assignment
      const range = await this.getCategoryRange(category);

      // Get the max display_order within this category's range
      const { data: maxData, error: maxError } = await this.supabase.client
        .from('personal_prayers')
        .select('display_order')
        .eq('user_email', userEmail)
        .eq('category', category || null)
        .gte('display_order', range.min)
        .lte('display_order', range.max)
        .order('display_order', { ascending: false })
        .limit(1)
        .single();

      const maxDisplayOrderInRange = (!maxError && maxData?.display_order !== null && maxData?.display_order !== undefined) 
        ? maxData.display_order 
        : range.min - 1;
      
      // Check if we're at the top of the range (no room for new prayers)
      if (maxDisplayOrderInRange >= range.max) {
        const categoryName = category || 'Uncategorized';
        this.toast.error(`Category '${categoryName}' is full (display order at maximum). Please reorder prayers or use a different category.`);
        return false;
      }
      
      const newDisplayOrder = maxDisplayOrderInRange + 1;

      const prayerData = {
        title: prayer.title,
        description: prayer.description,
        prayer_for: prayer.prayer_for,
        category: category,
        user_email: userEmail,
        display_order: newDisplayOrder
      };

      const { data, error } = await this.supabase.client
        .from('personal_prayers')
        .insert(prayerData)
        .select()
        .single();

      if (error) throw error;

      // Add to observable and cache immediately (no approval needed)
      const newPrayer: PrayerRequest = {
        id: data.id,
        title: data.title,
        description: data.description,
        status: 'current',
        prayer_for: data.prayer_for,
        category: data.category,
        requester: userEmail,
        email: userEmail,
        is_anonymous: false,
        date_requested: data.created_at,
        created_at: data.created_at,
        updated_at: data.updated_at,
        approval_status: 'approved' as const,
        updates: [],
        display_order: data.display_order || newDisplayOrder
      };

      // Add to the beginning of the list (most recent first)
      const currentPrayers = this.allPersonalPrayersSubject.value;
      const updatedPrayers = [newPrayer, ...currentPrayers];
      this.allPersonalPrayersSubject.next(updatedPrayers);
      this.cache.set('personalPrayers', updatedPrayers);

      // No email notifications or badge notifications for personal prayers
      // Just show success message
      this.toast.success('Personal prayer added successfully');
      return true;
    } catch (error) {
      console.error('Error adding personal prayer:', error);
      let errorMessage = 'Unknown error';
      
      // Handle Supabase error objects
      if (error && typeof error === 'object') {
        if ('message' in error) {
          errorMessage = (error as any).message;
        } else if ('error' in error) {
          errorMessage = (error as any).error;
        } else {
          errorMessage = JSON.stringify(error);
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      this.toast.error(`Failed to add personal prayer: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Delete a personal prayer
   */
  async deletePersonalPrayer(id: string): Promise<boolean> {
    try {
      const userEmail = await this.getUserEmail();
      if (!userEmail) {
        this.toast.error('User email not available');
        return false;
      }

      const { error } = await this.supabase.client
        .from('personal_prayers')
        .delete()
        .eq('id', id)
        .eq('user_email', userEmail);

      if (error) throw error;

      // Update local state and cache
      const personalPrayers = this.allPersonalPrayersSubject.value;
      this.allPersonalPrayersSubject.next(personalPrayers.filter(p => p.id !== id));
      this.cache.set('personalPrayers', personalPrayers.filter(p => p.id !== id));

      this.toast.success('Personal prayer deleted');
      return true;
    } catch (error) {
      console.error('Error deleting personal prayer:', error);
      this.toast.error('Failed to delete personal prayer');
      return false;
    }
  }

  /**
   * Update personal prayer (title, prayer_for, description, and/or category)
   */
  async updatePersonalPrayer(
    id: string,
    updates: Partial<Pick<PrayerRequest, 'title' | 'prayer_for' | 'description' | 'category'>>
  ): Promise<boolean> {
    try {
      const userEmail = await this.getUserEmail();
      if (!userEmail) {
        this.toast.error('User email not available');
        return false;
      }

      // Get the current prayer to check if category is changing
      const currentPrayer = this.allPersonalPrayersSubject.value.find(p => p.id === id);
      if (!currentPrayer) {
        this.toast.error('Prayer not found');
        return false;
      }

      const newCategory = updates.category !== undefined ? this.sanitizeCategory(updates.category) : currentPrayer.category;
      const categoryChanged = newCategory !== currentPrayer.category;

      // If category changed, validate new category limit and assign new display_order
      let newDisplayOrder = currentPrayer.display_order;
      if (categoryChanged && updates.category !== undefined) {
        // Validate new category doesn't exceed limit
        const newCategoryCount = await this.getCategoryPrayerCount(newCategory);
        if (newCategoryCount >= CATEGORY_RANGE_SIZE) {
          const categoryName = newCategory || 'Uncategorized';
          this.toast.error(`Category '${categoryName}' has reached its limit of 1,000 prayers. Please archive or delete some prayers, or organize into multiple categories.`);
          return false;
        }

        // Get the new category's range and assign display_order
        const newRange = await this.getCategoryRange(newCategory);
        const { data: maxData, error: maxError } = await this.supabase.client
          .from('personal_prayers')
          .select('display_order')
          .eq('user_email', userEmail)
          .eq('category', newCategory || null)
          .gte('display_order', newRange.min)
          .lte('display_order', newRange.max)
          .order('display_order', { ascending: false })
          .limit(1)
          .single();

        const maxDisplayOrderInRange = (!maxError && maxData?.display_order !== null && maxData?.display_order !== undefined) 
          ? maxData.display_order 
          : newRange.min - 1;
        newDisplayOrder = Math.min(maxDisplayOrderInRange + 1, newRange.max);
      }

      const updateData = {
        ...updates,
        category: newCategory,
        ...(categoryChanged && { display_order: newDisplayOrder }),
        updated_at: new Date().toISOString()
      };

      const { error } = await this.supabase.client
        .from('personal_prayers')
        .update(updateData)
        .eq('id', id)
        .eq('user_email', userEmail);

      if (error) throw error;

      // Update local state and cache (include prayer_for and title so card title updates immediately)
      const personalPrayers = this.allPersonalPrayersSubject.value;
      const updatedPrayers = personalPrayers.map(p =>
        p.id === id 
          ? { 
              ...p, 
              title: updates.title ?? p.title,
              prayer_for: updates.prayer_for ?? p.prayer_for,
              description: updates.description ?? p.description,
              category: newCategory,
              display_order: newDisplayOrder,
              updated_at: updateData.updated_at
            } 
          : p
      );
      this.allPersonalPrayersSubject.next(updatedPrayers);
      this.cache.set('personalPrayers', updatedPrayers);

      console.log('[PrayerService] Personal prayer updated successfully');
      this.toast.success('Personal prayer updated');
      return true;
    } catch (error) {
      console.error('Error updating personal prayer:', error);
      this.toast.error('Failed to update personal prayer');
      return false;
    }
  }

  /**
   * Update display order for personal prayers (used for drag-drop reordering)
   * Enforces category range boundaries - reordering stays within that category's range
   */
  async updatePersonalPrayerOrder(prayers: PrayerRequest[], categoryFilter?: string): Promise<boolean> {
    try {
      const userEmail = await this.getUserEmail();
      if (!userEmail) {
        console.error('[PrayerService] User email not available for order update');
        return false;
      }

      // Group prayers by category to handle cross-category reordering
      // When viewing multiple categories together, prayers array may contain multiple categories
      const prayersByCategory = new Map<string | null | undefined, PrayerRequest[]>();
      
      for (const prayer of prayers) {
        const category = prayer.category as string | null | undefined;
        if (!prayersByCategory.has(category)) {
          prayersByCategory.set(category, []);
        }
        prayersByCategory.get(category)!.push(prayer);
      }

      // Process each category group using RPC for efficiency
      for (const [category, categoryPrayers] of prayersByCategory) {
        // Extract prayer IDs in their desired order
        const orderedPrayerIds = categoryPrayers.map(p => p.id);

        // Use RPC for maximum efficiency - single server-side transaction per category
        const { data, error } = await this.supabase.client
          .rpc('reorder_personal_prayers', {
            p_user_email: userEmail,
            p_ordered_prayer_ids: orderedPrayerIds,
            p_category: category || null
          });

        if (error) {
          console.error('[PrayerService] RPC error reordering prayers:', error);
          // Fall back to client-side implementation if RPC fails
          return await this.updatePersonalPrayerOrderFallback(prayers, categoryFilter);
        }

        if (data && data.length > 0) {
          const result = data[0];
          if (!result.success) {
            console.error('[PrayerService] Reorder prayers failed:', result.message);
            return false;
          }
          console.log('[PrayerService]', result.message);
        }
      }

      // Note: Do NOT update cache here - the prayers array may be filtered
      // Component will invalidate cache and reload all prayers after successful update

      console.log('[PrayerService] Personal prayer order updated successfully');
      return true;
    } catch (error) {
      console.error('[PrayerService] Error updating personal prayer order:', error);
      // Fall back to client-side implementation
      return await this.updatePersonalPrayerOrderFallback(prayers, categoryFilter);
    }
  }

  /**
   * Fallback method for updating prayer order using client-side batch updates
   * Used if the RPC function is not available or fails
   */
  private async updatePersonalPrayerOrderFallback(prayers: PrayerRequest[], categoryFilter?: string): Promise<boolean> {
    try {
      console.log('[PrayerService] Using fallback method for prayer order update');
      
      const userEmail = await this.getUserEmail();
      if (!userEmail) return false;

      // Group prayers by category to handle cross-category reordering
      const prayersByCategory = new Map<string | null | undefined, PrayerRequest[]>();
      
      for (const prayer of prayers) {
        const category = prayer.category as string | null | undefined;
        if (!prayersByCategory.has(category)) {
          prayersByCategory.set(category, []);
        }
        prayersByCategory.get(category)!.push(prayer);
      }

      // Process each category group separately with its own range
      const updates: Promise<any>[] = [];
      
      for (const [category, categoryPrayers] of prayersByCategory) {
        // Get the range for this category
        const range = await this.getCategoryRange(category);

        // Batch update all prayers in this category with new display_order within their category's range
        // Reverse the index so first item (index 0) gets highest display_order value
        // This ensures correct DESC sorting: highest values appear first
        categoryPrayers.forEach((prayer, index) => {
          const orderWithinRange = categoryPrayers.length - 1 - index;
          const displayOrder = Math.min(range.min + orderWithinRange, range.max);

          updates.push(
            Promise.resolve(
              this.supabase.client
                .from('personal_prayers')
                .update({ display_order: displayOrder })
                .eq('id', prayer.id)
                .eq('user_email', userEmail)
            )
          );
        });
      }

      const results = await Promise.all(updates);

      // Check for errors
      const errorResult = results.find(r => r.error);
      if (errorResult?.error) throw errorResult.error;

      // Note: Do NOT update cache here - the prayers array may be filtered
      // Component will invalidate cache and reload all prayers after successful update

      return true;
    } catch (error) {
      console.error('[PrayerService] Fallback prayer order update failed:', error);
      return false;
    }
  }

  /**
   * Update personal prayer update (content and/or author)
   */
  async updatePersonalPrayerUpdate(
    updateId: string,
    prayerId: string,
    updates: Partial<Pick<PrayerUpdate, 'content'>>
  ): Promise<boolean> {
    try {
      const userEmail = await this.getUserEmail();
      if (!userEmail) {
        this.toast.error('User email not available');
        return false;
      }

      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      const { error } = await this.supabase.client
        .from('personal_prayer_updates')
        .update(updateData)
        .eq('id', updateId);

      if (error) throw error;

      // Update local state and cache
      const personalPrayers = this.allPersonalPrayersSubject.value;
      const updatedPrayers = personalPrayers.map(p =>
        p.id === prayerId 
          ? { 
              ...p, 
              updates: (p.updates || []).map(u =>
                u.id === updateId
                  ? {
                      ...u,
                      content: updates.content ?? u.content
                    }
                  : u
              )
            } 
          : p
      );
      this.allPersonalPrayersSubject.next(updatedPrayers);
      this.cache.set('personalPrayers', updatedPrayers);

      console.log('[PrayerService] Personal prayer update updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating personal prayer update:', error);
      this.toast.error('Failed to update prayer update');
      return false;
    }
  }


  /**
   * Get unique categories for personal prayers of current user, sorted by range (descending)
   * Categories with higher ranges appear first (newer categories appear at top)
   */
  async getUniqueCategoriesForUser(prayers?: PrayerRequest[]): Promise<string[]> {
    const personalPrayers = prayers || this.allPersonalPrayersSubject.value;
    const categories = new Map<string, number>(); // category -> min display_order for that category
    
    personalPrayers.forEach(prayer => {
      if (prayer.category && prayer.category.trim()) {
        const cat = prayer.category.trim();
        const displayOrder = prayer.display_order ?? 0;
        const current = categories.get(cat);
        // Track the minimum display_order for each category (represents its position)
        if (current === undefined || displayOrder < current) {
          categories.set(cat, displayOrder);
        }
      }
    });

    // Don't add null category - only return actual categories
    // Uncategorized prayers will still show in "All Categories" view without filter buttons

    // Sort categories by their minimum display_order (descending - highest display_order first)
    const sortedCategories = Array.from(categories.entries())
      .sort((a, b) => b[1] - a[1]) // Descending by display_order
      .map(entry => entry[0] as string);

    return sortedCategories;
  }

  /**
   * Add update to personal prayer
   */
  async addPersonalPrayerUpdate(
    personalPrayerId: string,
    content: string,
    author: string,
    authorEmail: string,
    markAsAnswered: boolean = false
  ): Promise<boolean> {
    try {
      const updateData = {
        personal_prayer_id: personalPrayerId,
        content,
        author,
        author_email: authorEmail,
        mark_as_answered: markAsAnswered
      };

      console.log('Adding personal prayer update with data:', updateData);

      const { data, error } = await this.supabase.client
        .from('personal_prayer_updates')
        .insert(updateData)
        .select();

      if (error) throw error;

      console.log('Personal prayer update added successfully:', data);

      // Add to observable and cache immediately (no approval needed)
      const currentPrayers = this.allPersonalPrayersSubject.value;
      const updatedPrayers = currentPrayers.map(prayer => {
        if (prayer.id === personalPrayerId) {
          const newUpdate = {
            id: data[0].id,
            prayer_id: personalPrayerId,
            content: data[0].content,
            author: data[0].author,
            author_email: data[0].author_email,
            is_anonymous: false,
            mark_as_answered: data[0].mark_as_answered,
            created_at: data[0].created_at,
            approval_status: 'approved' as const
          };
          return {
            ...prayer,
            updates: [newUpdate, ...(prayer.updates || [])]
          };
        }
        return prayer;
      });
      this.allPersonalPrayersSubject.next(updatedPrayers);
      this.cache.set('personalPrayers', updatedPrayers);

      this.toast.success('Update added to personal prayer');
      return true;
    } catch (error) {
      console.error('Error adding personal prayer update:', error);
      let errorMessage = 'Unknown error';
      
      if (error && typeof error === 'object') {
        if ('message' in error) {
          errorMessage = (error as any).message;
        } else if ('error' in error) {
          errorMessage = (error as any).error;
        } else {
          errorMessage = JSON.stringify(error);
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      this.toast.error(`Failed to add update: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Delete personal prayer update
   */
  async deletePersonalPrayerUpdate(updateId: string): Promise<boolean> {
    try {
      const userEmail = await this.getUserEmail();
      if (!userEmail) {
        this.toast.error('User email not available');
        return false;
      }

      // Verify user owns the prayer before deleting the update
      const { error: deleteError } = await this.supabase.client
        .from('personal_prayer_updates')
        .delete()
        .eq('id', updateId)
        .eq('author_email', userEmail);

      if (deleteError) throw deleteError;

      // Update local state - remove the update from all personal prayers
      const personalPrayers = this.allPersonalPrayersSubject.value;
      const updatedPrayers = personalPrayers.map(prayer => ({
        ...prayer,
        updates: (prayer.updates || []).filter(u => u.id !== updateId)
      }));
      this.allPersonalPrayersSubject.next(updatedPrayers);
      this.cache.set('personalPrayers', updatedPrayers);
      
      this.toast.success('Update deleted');
      return true;
    } catch (error) {
      console.error('Error deleting personal prayer update:', error);
      this.toast.error('Failed to delete update');
      return false;
    }
  }

  /**
   * Mark personal prayer update as answered
   */
  async markPersonalPrayerUpdateAsAnswered(updateId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('personal_prayer_updates')
        .update({ mark_as_answered: true, updated_at: new Date().toISOString() })
        .eq('id', updateId);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Error marking personal prayer update as answered:', error);
      this.toast.error('Failed to mark update as answered');
      return false;
    }
  }

  /**
   * Get user email from session
   */
  private async getUserEmail(): Promise<string | null> {
    // Try to get from Supabase auth session first
    try {
      const { data: { session } } = await this.supabase.client.auth.getSession();
      if (session?.user?.email) {
        return session.user.email;
      }
    } catch (error) {
      console.error('Error getting session:', error);
    }

    // Fallback to localStorage for MFA authenticated users
    const mfaEmail = localStorage.getItem('mfa_authenticated_email');
    if (mfaEmail) {
      return mfaEmail;
    }

    return null;
  }

  /**
   * Reorder all categories based on the provided order array
   * Assigns new prefix values to match the desired order
   */
  async reorderCategories(orderedCategories: (string | null)[]): Promise<boolean> {
    try {
      const userEmail = await this.getUserEmail();
      if (!userEmail) {
        console.error('[PrayerService] User email not available for category reorder');
        return false;
      }

      // Filter out null categories for the RPC call
      const validCategories = orderedCategories.filter(c => c !== null && c !== undefined) as string[];
      
      if (validCategories.length === 0) {
        console.warn('[PrayerService] No valid categories to reorder');
        return true;
      }

      // Use RPC for maximum efficiency - single server-side transaction
      const { data, error } = await this.supabase.client
        .rpc('reorder_personal_prayer_categories', {
          p_user_email: userEmail,
          p_ordered_categories: validCategories
        });

      if (error) {
        console.error('[PrayerService] RPC error reordering categories:', error);
        // Fall back to client-side implementation if RPC fails
        return await this.reorderCategoriesFallback(orderedCategories);
      }

      if (data && data.length > 0) {
        const result = data[0];
        if (!result.success) {
          console.error('[PrayerService] Reorder failed:', result.message);
          return false;
        }
        console.log('[PrayerService]', result.message);
      }

      // Update local state and cache only (no refetch = no egress)
      this.applyCategoryReorderLocally(orderedCategories);
      return true;
    } catch (error) {
      console.error('[PrayerService] Error reordering categories:', error);
      // Fall back to client-side implementation
      return await this.reorderCategoriesFallback(orderedCategories);
    }
  }

  /**
   * Fallback method for reordering categories using client-side batch updates
   * Used if the RPC function is not available or fails
   */
  private async reorderCategoriesFallback(orderedCategories: (string | null)[]): Promise<boolean> {
    try {
      console.log('[PrayerService] Using fallback method for category reorder');
      
      const userEmail = await this.getUserEmail();
      if (!userEmail) return false;

      // Get all personal prayers
      const allPrayers = this.allPersonalPrayersSubject.value;
      
      // Build updates for each category based on its new position
      // Position 0 gets prefix (length), position 1 gets prefix (length-1), etc.
      // This maintains descending sort order
      const updates: any[] = [];
      
      for (let newIndex = 0; newIndex < orderedCategories.length; newIndex++) {
        const category = orderedCategories[newIndex];
        if (!category) continue;
        
        // Calculate new prefix: higher position = higher prefix (for DESC sort)
        const newPrefix = orderedCategories.length - newIndex;
        
        // Get all prayers in this category
        const categoryPrayers = allPrayers.filter(p => p.category === category);
        
        // Update each prayer's display_order to use the new prefix
        for (const prayer of categoryPrayers) {
          const lastThreeDigits = (prayer.display_order ?? 0) % 1000;
          const newDisplayOrder = newPrefix * 1000 + lastThreeDigits;
          
          updates.push(
            this.supabase.client
              .from('personal_prayers')
              .update({ display_order: newDisplayOrder })
              .eq('id', prayer.id)
          );
        }
      }

      // Execute all updates in parallel
      const results = await Promise.all(updates);
      const error = results.find(r => r.error);
      if (error?.error) throw error.error;

      // Update local state and cache only (no refetch = no egress)
      this.applyCategoryReorderLocally(orderedCategories);
      return true;
    } catch (error) {
      console.error('[PrayerService] Fallback reorder failed:', error);
      return false;
    }
  }

  /**
   * Update in-memory state and cache after a category swap (no refetch).
   * Keeps UI in sync and avoids Supabase egress from loadPersonalPrayers().
   */
  private applyCategorySwapLocally(categoryA: string, categoryB: string): void {
    const allPrayers = this.allPersonalPrayersSubject.value;
    const prayersA = allPrayers.filter(p => p.category === categoryA);
    const prayersB = allPrayers.filter(p => p.category === categoryB);
    if (prayersA.length === 0 || prayersB.length === 0) return;

    const minOrderA = Math.min(...prayersA.map(p => p.display_order ?? 0));
    const minOrderB = Math.min(...prayersB.map(p => p.display_order ?? 0));
    const prefixA = Math.floor(minOrderA / 1000);
    const prefixB = Math.floor(minOrderB / 1000);

    const updated = allPrayers.map(p => {
      const cat = p.category as string | null | undefined;
      if (cat === categoryA) {
        const lastThree = (p.display_order ?? 0) % 1000;
        return { ...p, display_order: prefixB * 1000 + lastThree };
      }
      if (cat === categoryB) {
        const lastThree = (p.display_order ?? 0) % 1000;
        return { ...p, display_order: prefixA * 1000 + lastThree };
      }
      return p;
    });
    const sorted = [...updated].sort((a, b) => {
      const oa = a.display_order ?? 0;
      const ob = b.display_order ?? 0;
      if (ob !== oa) return ob - oa;
      return (b.created_at || '').localeCompare(a.created_at || '');
    });
    this.allPersonalPrayersSubject.next(sorted);
    this.cache.set('personalPrayers', sorted);
  }

  /**
   * Update in-memory state and cache after a full category reorder (no refetch).
   * Keeps UI in sync and avoids Supabase egress from loadPersonalPrayers().
   */
  private applyCategoryReorderLocally(orderedCategories: (string | null)[]): void {
    const allPrayers = this.allPersonalPrayersSubject.value;
    const updated = allPrayers.map(p => {
      const idx = orderedCategories.indexOf(p.category as string | null);
      if (idx === -1) return p;
      const newPrefix = orderedCategories.length - idx;
      const lastThree = (p.display_order ?? 0) % 1000;
      return { ...p, display_order: newPrefix * 1000 + lastThree };
    });
    const sorted = [...updated].sort((a, b) => {
      const oa = a.display_order ?? 0;
      const ob = b.display_order ?? 0;
      if (ob !== oa) return ob - oa;
      return (b.created_at || '').localeCompare(a.created_at || '');
    });
    this.allPersonalPrayersSubject.next(sorted);
    this.cache.set('personalPrayers', sorted);
  }

  /**
   * Swap display_order ranges between two categories
   * Used when user drags a category button to reorder categories
   * Example: If A has 2000-2999 and B has 1000-1999, swapping gives A 1000-1999 and B 2000-2999
   */
  async swapCategoryRanges(categoryA: string | null | undefined, categoryB: string | null | undefined): Promise<boolean> {
    const userEmail = await this.getUserEmail();
    
    if (!userEmail) {
      console.error('[PrayerService] User email not available for category swap');
      return false;
    }

    if (!categoryA || !categoryB) {
      console.error('[PrayerService] Both categories required for swap');
      return false;
    }

    try {
      // Use RPC for maximum efficiency - single server-side transaction
      const { data, error } = await this.supabase.client
        .rpc('swap_personal_prayer_categories', {
          p_user_email: userEmail,
          p_category_a: categoryA,
          p_category_b: categoryB
        });

      if (error) {
        console.error('[PrayerService] RPC error swapping categories:', error);
        // Fall back to client-side implementation if RPC fails
        return await this.swapCategoryRangesFallback(categoryA, categoryB);
      }

      if (data && data.length > 0) {
        const result = data[0];
        if (!result.success) {
          console.error('[PrayerService] Swap failed:', result.message);
          return false;
        }
        console.log('[PrayerService]', result.message);
      }

      // Update local state and cache only (no refetch = no egress)
      this.applyCategorySwapLocally(categoryA, categoryB);
      return true;
    } catch (error) {
      console.error('[PrayerService] Exception swapping categories:', error);
      // Fall back to client-side implementation
      return await this.swapCategoryRangesFallback(categoryA, categoryB);
    }
  }

  /**
   * Fallback method for swapping categories using client-side batch updates
   * Used if the RPC function is not available or fails
   */
  private async swapCategoryRangesFallback(categoryA: string, categoryB: string): Promise<boolean> {
    try {
      console.log('[PrayerService] Using fallback method for category swap');
      
      const userEmail = await this.getUserEmail();
      if (!userEmail) return false;

      // Get all personal prayers
      const allPrayers = this.allPersonalPrayersSubject.value;
      
      // Get prayers in each category
      const prayersA = allPrayers.filter(p => p.category === categoryA);
      const prayersB = allPrayers.filter(p => p.category === categoryB);

      if (prayersA.length === 0 || prayersB.length === 0) {
        return true;
      }

      // Extract prefixes from the actual display_order values
      const minOrderA = Math.min(...prayersA.map(p => p.display_order ?? 0));
      const minOrderB = Math.min(...prayersB.map(p => p.display_order ?? 0));

      const prefixA = Math.floor(minOrderA / 1000);
      const prefixB = Math.floor(minOrderB / 1000);
      const tempPrefix = 999;

      // Step 1: Move Category A to temp prefix (parallel batch)
      const step1Updates = prayersA.map(prayer => {
        const lastThreeDigits = (prayer.display_order ?? 0) % 1000;
        const newDisplayOrder = tempPrefix * 1000 + lastThreeDigits;
        return this.supabase.client
          .from('personal_prayers')
          .update({ display_order: newDisplayOrder })
          .eq('id', prayer.id);
      });
      
      const step1Results = await Promise.all(step1Updates);
      const step1Error = step1Results.find(r => r.error);
      if (step1Error?.error) throw step1Error.error;

      // Step 2: Move Category B to Category A's prefix (parallel batch)
      const step2Updates = prayersB.map(prayer => {
        const lastThreeDigits = (prayer.display_order ?? 0) % 1000;
        const newDisplayOrder = prefixA * 1000 + lastThreeDigits;
        return this.supabase.client
          .from('personal_prayers')
          .update({ display_order: newDisplayOrder })
          .eq('id', prayer.id);
      });
      
      const step2Results = await Promise.all(step2Updates);
      const step2Error = step2Results.find(r => r.error);
      if (step2Error?.error) throw step2Error.error;

      // Step 3: Move Category A from temp to Category B's prefix (parallel batch)
      const step3Updates = prayersA.map(prayer => {
        const lastThreeDigits = (prayer.display_order ?? 0) % 1000;
        const newDisplayOrder = prefixB * 1000 + lastThreeDigits;
        return this.supabase.client
          .from('personal_prayers')
          .update({ display_order: newDisplayOrder })
          .eq('id', prayer.id);
      });
      
      const step3Results = await Promise.all(step3Updates);
      const step3Error = step3Results.find(r => r.error);
      if (step3Error?.error) throw step3Error.error;

      // Update local state and cache only (no refetch = no egress)
      this.applyCategorySwapLocally(categoryA, categoryB);
      return true;
    } catch (error) {
      console.error('[PrayerService] Fallback swap failed:', error);
      return false;
    }
  }

  /**
   * Share a personal prayer - create public copy for approval without deleting personal
   * The personal prayer stays in the user's account for their reference
   * The public prayer will go through the normal approval process
   * @param personalPrayerId The ID of the personal prayer to share
   */
  async sharePrayerForApproval(personalPrayerId: string): Promise<string> {
    try {
      // Step 1: Fetch the personal prayer with its updates
      const { data: personalPrayer, error: fetchError } = await this.supabase.client
        .from('personal_prayers')
        .select(`
          id,
          title,
          description,
          prayer_for,
          user_email,
          category,
          created_at,
          personal_prayer_updates (
            id,
            content,
            author,
            author_email,
            mark_as_answered,
            created_at
          )
        `)
        .eq('id', personalPrayerId)
        .single();

      if (fetchError) throw new Error(`Failed to fetch personal prayer: ${fetchError.message}`);
      if (!personalPrayer) throw new Error('Personal prayer not found');

      // Step 2: Get the user's name from the session
      const session = await this.userSessionService.userSession$.pipe(first()).toPromise();
      let requesterName = session?.fullName || personalPrayer.user_email;
      
      // If no fullName in session, extract from email
      if (!session?.fullName) {
        const emailPart = personalPrayer.user_email.split('@')[0];
        requesterName = emailPart
          .replace(/[._-]/g, ' ')
          .split(' ')
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
      }
      
      // Step 3: Create a new public prayer in the normal prayers table with pending status
      const publicPrayerData = {
        title: personalPrayer.title,
        description: personalPrayer.description,
        status: personalPrayer.category === 'Answered' ? 'answered' : 'current' as PrayerStatus,
        requester: requesterName,
        prayer_for: personalPrayer.prayer_for,
        email: personalPrayer.user_email,
        is_anonymous: false,
        approval_status: 'pending' as const,
        is_shared_personal_prayer: true
      };

      const { data: newPrayer, error: createError } = await this.supabase.client
        .from('prayers')
        .insert(publicPrayerData)
        .select()
        .single();

      if (createError) throw new Error(`Failed to create public prayer: ${createError.message}`);
      if (!newPrayer) throw new Error('Failed to create public prayer');

      // Step 3: Copy all updates from personal prayer to public prayer
      const updates = personalPrayer.personal_prayer_updates || [];
      if (updates.length > 0) {
        const updatesCopy = updates.map((update: any) => ({
          prayer_id: newPrayer.id,
          content: update.content,
          author: update.author,
          author_email: update.author_email || null,
          is_anonymous: false,
          approval_status: 'pending' as const,
          created_at: update.created_at
        }));

        const { error: updatesCopyError } = await this.supabase.client
          .from('prayer_updates')
          .insert(updatesCopy);

        if (updatesCopyError) {
          console.error('Failed to copy updates, but public prayer was created:', updatesCopyError);
          // Don't throw here - the prayer was created successfully
        }
      }

      // Step 4: Keep the personal prayer - user can see it in their account and edit if needed
      // Step 5: Send admin notification about the new public prayer request
      this.emailNotification.sendAdminNotification({
        type: 'prayer',
        title: personalPrayer.title,
        description: personalPrayer.description,
        requester: requesterName,
        requestId: newPrayer.id
      }).catch(err => console.error('Failed to send admin notification:', err));

      // Refresh user's personal prayers
      await this.loadPersonalPrayers();

      this.toast.success('Prayer shared! It has been submitted for admin approval.');
      return newPrayer.id;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to share prayer';
      console.error('[PrayerService] Error sharing prayer:', error);
      this.toast.error(errorMessage);
      throw error;
    }
  }

  /**
   * Clean up subscriptions
   */
  ngOnDestroy(): void {
    if (this.realtimeChannel) {
      this.supabase.client.removeChannel(this.realtimeChannel);
    }
  }
}
