import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, fromEvent } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';
import { EmailNotificationService } from './email-notification.service';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type PrayerStatus = 'current' | 'answered';

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
  requester: string;
  prayer_for: string;
  email?: string | null;
  is_anonymous?: boolean;
  type?: 'prayer' | 'prompt';
  date_requested: string;
  date_answered?: string | null;
  created_at: string;
  updated_at: string;
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
  private loadingSubject = new BehaviorSubject<boolean>(true);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private realtimeChannel: RealtimeChannel | null = null;
  private currentFilters: PrayerFilters = {};

  public allPrayers$ = this.allPrayersSubject.asObservable();
  public prayers$ = this.prayersSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  constructor(
    private supabase: SupabaseService,
    private toast: ToastService,
    private emailNotification: EmailNotificationService
  ) {
    this.initializePrayers();
  }

  private async initializePrayers(): Promise<void> {
    await this.loadPrayers();
    this.setupRealtimeSubscription();
    this.setupVisibilityListener();
  }

  /**
   * Load prayers from database
   */
  async loadPrayers(): Promise<void> {
    try {
      console.log('[PrayerService] Loading prayers...');
      this.loadingSubject.next(true);
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

      console.log(`[PrayerService] Loaded ${prayersData?.length || 0} approved prayers`);

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
      this.applyFilters(this.currentFilters);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load prayers';
      console.error('Failed to load prayers:', err);
      this.errorSubject.next(errorMessage);
      this.toast.error('Failed to load prayers');
    } finally {
      this.loadingSubject.next(false);
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
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower) ||
        p.requester.toLowerCase().includes(searchLower)
      );
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
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower) ||
        p.requester.toLowerCase().includes(searchLower) ||
        p.prayer_for.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }

  /**
   * Set up real-time subscription for prayer changes
   */
  private setupRealtimeSubscription(): void {
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
          this.loadPrayers();
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
          this.loadPrayers();
        }
      )
      .subscribe((status) => {
        console.log('[PrayerService] Realtime subscription status:', status);
      });
  }

  /**
   * Reload prayers when page becomes visible
   */
  private setupVisibilityListener(): void {
    fromEvent(document, 'visibilitychange').subscribe(() => {
      if (document.visibilityState === 'visible') {
        this.loadPrayers();
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
   * Clean up subscriptions
   */
  ngOnDestroy(): void {
    if (this.realtimeChannel) {
      this.supabase.client.removeChannel(this.realtimeChannel);
    }
  }
}
