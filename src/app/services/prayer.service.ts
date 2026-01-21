import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';
import { EmailNotificationService } from './email-notification.service';
import { VerificationService } from './verification.service';
import { CacheService } from './cache.service';
import { BadgeService } from './badge.service';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type PrayerStatus = 'current' | 'answered' | 'archived';

export interface PrayerUpdate {
  id: string;
  prayer_id: string;
  content: string;
  author: string;
  created_at: string;
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
  updates: PrayerUpdate[];
}

export interface PrayerFilters {
  status?: PrayerStatus;
  search?: string;
  type?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PrayerService {
  private allPrayersSubject = new BehaviorSubject<PrayerRequest[]>([]);
  private prayersSubject = new BehaviorSubject<PrayerRequest[]>([]);
  private allPersonalPrayersSubject = new BehaviorSubject<PrayerRequest[]>([]);
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
  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  constructor(
    private supabase: SupabaseService,
    private toast: ToastService,
    private emailNotification: EmailNotificationService,
    private verificationService: VerificationService,
    private cache: CacheService,
    private badgeService: BadgeService
  ) {
    this.initializePrayers();
  }

  private async initializePrayers(): Promise<void> {
    await this.loadPrayers();
    await this.loadPersonalPrayers();
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
      console.log('[PrayerService] Loading personal prayers...');
      
      const userEmail = await this.getUserEmail();
      if (!userEmail) {
        console.warn('[PrayerService] User email not available for personal prayers');
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
   * Delete a prayer
   */
  async deletePrayer(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('prayers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update local state
      const prayers = this.prayersSubject.value;
      this.prayersSubject.next(prayers.filter(p => p.id !== id));

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
   * PERSONAL PRAYERS - User-specific prayers with no admin approval workflow
   */

  /**
   * Get all personal prayers for the current user
   */
  async getPersonalPrayers(): Promise<PrayerRequest[]> {
    try {
      const userEmail = await this.getUserEmail();
      if (!userEmail) {
        console.error('User email not available');
        return [];
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
      return (data || []).map(p => ({
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

      // Get the max display_order to assign next highest value (so new prayer appears at top)
      const { data: maxData, error: maxError } = await this.supabase.client
        .from('personal_prayers')
        .select('display_order')
        .eq('user_email', userEmail)
        .order('display_order', { ascending: false })
        .limit(1)
        .single();

      const maxDisplayOrder = (!maxError && maxData?.display_order !== null && maxData?.display_order !== undefined) 
        ? maxData.display_order 
        : -1;
      const newDisplayOrder = maxDisplayOrder + 1;

      const prayerData = {
        title: prayer.title,
        description: prayer.description,
        prayer_for: prayer.prayer_for,
        category: this.sanitizeCategory(prayer.category),
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
   * Update personal prayer (title, description, and/or category)
   */
  async updatePersonalPrayer(
    id: string,
    updates: Partial<Pick<PrayerRequest, 'title' | 'description' | 'category'>>
  ): Promise<boolean> {
    try {
      const userEmail = await this.getUserEmail();
      if (!userEmail) {
        this.toast.error('User email not available');
        return false;
      }

      const updateData = {
        ...updates,
        category: updates.category !== undefined ? this.sanitizeCategory(updates.category) : undefined,
        updated_at: new Date().toISOString()
      };

      const { error } = await this.supabase.client
        .from('personal_prayers')
        .update(updateData)
        .eq('id', id)
        .eq('user_email', userEmail);

      if (error) throw error;

      // Update local state and cache
      const personalPrayers = this.allPersonalPrayersSubject.value;
      const updatedPrayers = personalPrayers.map(p =>
        p.id === id 
          ? { 
              ...p, 
              title: updates.title ?? p.title,
              description: updates.description ?? p.description,
              category: updates.category !== undefined ? updates.category : p.category,
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
   */
  async updatePersonalPrayerOrder(prayers: PrayerRequest[]): Promise<boolean> {
    try {
      const userEmail = await this.getUserEmail();
      if (!userEmail) {
        console.error('[PrayerService] User email not available for order update');
        return false;
      }

      // Batch update all prayers with new display_order
      // Reverse the index so first item (index 0) gets highest display_order value
      // This ensures correct DESC sorting: highest values appear first
      const updates = prayers.map((prayer, index) =>
        this.supabase.client
          .from('personal_prayers')
          .update({ display_order: prayers.length - 1 - index })
          .eq('id', prayer.id)
          .eq('user_email', userEmail)
      );

      const results = await Promise.all(updates);

      // Check for errors
      const errorResult = results.find(r => r.error);
      if (errorResult?.error) throw errorResult.error;

      // Update local cache and observable
      this.allPersonalPrayersSubject.next(prayers);
      this.cache.set('personalPrayers', prayers);

      console.log('[PrayerService] Personal prayer order updated successfully');
      return true;
    } catch (error) {
      console.error('[PrayerService] Error updating personal prayer order:', error);
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
      this.toast.success('Prayer update saved');
      return true;
    } catch (error) {
      console.error('Error updating personal prayer update:', error);
      this.toast.error('Failed to update prayer update');
      return false;
    }
  }


  /**
   * Get unique categories for personal prayers of current user
   */
  getUniqueCategoriesForUser(): string[] {
    const personalPrayers = this.allPersonalPrayersSubject.value;
    const categories = new Set<string>();
    
    personalPrayers.forEach(prayer => {
      if (prayer.category && prayer.category.trim()) {
        categories.add(prayer.category.trim());
      }
    });

    return Array.from(categories).sort();
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
   * Clean up subscriptions
   */
  ngOnDestroy(): void {
    if (this.realtimeChannel) {
      this.supabase.client.removeChannel(this.realtimeChannel);
    }
  }
}
