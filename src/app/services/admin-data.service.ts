import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { PrayerService } from './prayer.service';
import type { 
  PrayerRequest, 
  PrayerUpdate, 
  DeletionRequest, 
  StatusChangeRequest,
  UpdateDeletionRequest 
} from '../types/prayer';

export interface PendingPreferenceChange {
  id: string;
  name: string;
  email: string;
  receive_new_prayer_notifications: boolean;
  created_at: string;
  denial_reason?: string;
  reviewed_at?: string;
}

interface AdminData {
  pendingPrayers: PrayerRequest[];
  pendingUpdates: (PrayerUpdate & { prayer_title?: string })[];
  pendingDeletionRequests: (DeletionRequest & { prayer_title?: string })[];
  pendingStatusChangeRequests: (StatusChangeRequest & { prayer_title?: string })[];
  pendingUpdateDeletionRequests: (UpdateDeletionRequest & {
    prayer_updates?: {
      content?: string;
      author?: string;
      author_email?: string;
      prayers?: { title?: string };
    };
  })[];
  pendingPreferenceChanges: PendingPreferenceChange[];
  approvedPrayers: PrayerRequest[];
  approvedUpdates: (PrayerUpdate & { prayer_title?: string })[];
  deniedPrayers: PrayerRequest[];
  deniedUpdates: (PrayerUpdate & { prayer_title?: string })[];
  deniedStatusChangeRequests: (StatusChangeRequest & { prayer_title?: string })[];
  deniedDeletionRequests: (DeletionRequest & { prayer_title?: string })[];
  deniedUpdateDeletionRequests: (UpdateDeletionRequest & {
    prayer_updates?: {
      content?: string;
      author?: string;
      author_email?: string;
      prayers?: { title?: string };
    };
  })[];
  deniedPreferenceChanges: PendingPreferenceChange[];
  approvedPrayersCount: number;
  approvedUpdatesCount: number;
  deniedPrayersCount: number;
  deniedUpdatesCount: number;
  loading: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AdminDataService {
  private dataSubject = new BehaviorSubject<AdminData>({
    pendingPrayers: [],
    pendingUpdates: [],
    pendingDeletionRequests: [],
    pendingStatusChangeRequests: [],
    pendingUpdateDeletionRequests: [],
    pendingPreferenceChanges: [],
    approvedPrayers: [],
    approvedUpdates: [],
    deniedPrayers: [],
    deniedUpdates: [],
    deniedStatusChangeRequests: [],
    deniedDeletionRequests: [],
    deniedUpdateDeletionRequests: [],
    deniedPreferenceChanges: [],
    approvedPrayersCount: 0,
    approvedUpdatesCount: 0,
    deniedPrayersCount: 0,
    deniedUpdatesCount: 0,
    loading: false,
    error: null
  });

  public data$: Observable<AdminData> = this.dataSubject.asObservable();
  private isFetching = false;

  constructor(
    private supabase: SupabaseService,
    private prayerService: PrayerService
  ) {}

  async fetchAdminData(silent = false): Promise<void> {
    if (this.isFetching) return;

    try {
      this.isFetching = true;
      
      if (!silent) {
        this.dataSubject.next({ 
          ...this.dataSubject.value, 
          loading: true, 
          error: null 
        });
      }

      const supabaseClient = this.supabase.client;

      // Fetch all data in parallel
      const [
        pendingPrayersResult,
        pendingUpdatesResult,
        pendingDeletionRequestsResult,
        pendingStatusChangeRequestsResult,
        pendingUpdateDeletionRequestsResult,
        pendingPreferenceChangesResult,
        approvedPrayersCountResult,
        approvedUpdatesCountResult,
        deniedPrayersCountResult,
        deniedUpdatesCountResult,
        approvedPrayersResult,
        approvedUpdatesResult,
        deniedPrayersResult,
        deniedUpdatesResult,
        deniedStatusChangeRequestsResult,
        deniedDeletionRequestsResult,
        deniedUpdateDeletionRequestsResult,
        deniedPreferenceChangesResult
      ] = await Promise.all([
        // Pending prayers
        supabaseClient
          .from('prayers')
          .select('*')
          .eq('approval_status', 'pending')
          .order('created_at', { ascending: false }),
        
        // Pending updates with prayer title
        supabaseClient
          .from('prayer_updates')
          .select('*, prayers!inner(title)')
          .eq('approval_status', 'pending')
          .order('created_at', { ascending: false }),
        
        // Pending deletion requests
        supabaseClient
          .from('deletion_requests')
          .select('*, prayers!inner(title)')
          .eq('approval_status', 'pending')
          .order('created_at', { ascending: false }),
        
        // Pending status change requests
        supabaseClient
          .from('status_change_requests')
          .select('*, prayers!inner(title)')
          .eq('approval_status', 'pending')
          .order('created_at', { ascending: false }),
        
        // Pending update deletion requests
        supabaseClient
          .from('update_deletion_requests')
          .select('*, prayer_updates(*, prayers(title))')
          .eq('approval_status', 'pending')
          .order('created_at', { ascending: false }),
        
        // Pending preference changes
        supabaseClient
          .from('pending_preference_changes')
          .select('*')
          .eq('approval_status', 'pending')
          .order('created_at', { ascending: false }),
        
        // Approved counts
        supabaseClient
          .from('prayers')
          .select('*', { count: 'exact', head: true })
          .eq('approval_status', 'approved'),
        
        supabaseClient
          .from('prayer_updates')
          .select('*', { count: 'exact', head: true })
          .eq('approval_status', 'approved'),
        
        // Denied counts
        supabaseClient
          .from('prayers')
          .select('*', { count: 'exact', head: true })
          .eq('approval_status', 'denied'),
        
        supabaseClient
          .from('prayer_updates')
          .select('*', { count: 'exact', head: true })
          .eq('approval_status', 'denied'),
        
        // Approved lists
        supabaseClient
          .from('prayers')
          .select('*')
          .eq('approval_status', 'approved')
          .order('approved_at', { ascending: false }),
        
        supabaseClient
          .from('prayer_updates')
          .select('*, prayers!inner(title)')
          .eq('approval_status', 'approved')
          .order('approved_at', { ascending: false }),
        
        // Denied lists
        supabaseClient
          .from('prayers')
          .select('*')
          .eq('approval_status', 'denied')
          .order('denied_at', { ascending: false }),
        
        supabaseClient
          .from('prayer_updates')
          .select('*, prayers!inner(title)')
          .eq('approval_status', 'denied')
          .order('denied_at', { ascending: false }),
        
        supabaseClient
          .from('status_change_requests')
          .select('*, prayers!inner(title)')
          .eq('approval_status', 'denied')
          .order('reviewed_at', { ascending: false }),
        
        supabaseClient
          .from('deletion_requests')
          .select('*, prayers!inner(title)')
          .eq('approval_status', 'denied')
          .order('reviewed_at', { ascending: false }),
        
        supabaseClient
          .from('update_deletion_requests')
          .select('*, prayer_updates(*, prayers(title))')
          .eq('approval_status', 'denied')
          .order('reviewed_at', { ascending: false }),
        
        supabaseClient
          .from('pending_preference_changes')
          .select('*')
          .eq('approval_status', 'denied')
          .order('reviewed_at', { ascending: false })
      ]);

      // Check for errors
      if (pendingPrayersResult.error) throw pendingPrayersResult.error;
      if (pendingUpdatesResult.error) throw pendingUpdatesResult.error;

      // Transform data
      const pendingUpdates = (pendingUpdatesResult.data || []).map((u: any) => ({
        ...u,
        prayer_title: u.prayers?.title
      }));

      const pendingDeletionRequests = (pendingDeletionRequestsResult.data || []).map((d: any) => ({
        ...d,
        prayer_title: d.prayers?.title
      }));

      const pendingStatusChangeRequests = (pendingStatusChangeRequestsResult.data || []).map((s: any) => ({
        ...s,
        prayer_title: s.prayers?.title
      }));

      const approvedUpdates = (approvedUpdatesResult.data || []).map((u: any) => ({
        ...u,
        prayer_title: u.prayers?.title
      }));

      const deniedUpdates = (deniedUpdatesResult.data || []).map((u: any) => ({
        ...u,
        prayer_title: u.prayers?.title
      }));

      const deniedStatusChangeRequests = (deniedStatusChangeRequestsResult.data || []).map((s: any) => ({
        ...s,
        prayer_title: s.prayers?.title
      }));

      const deniedDeletionRequests = (deniedDeletionRequestsResult.data || []).map((d: any) => ({
        ...d,
        prayer_title: d.prayers?.title
      }));

      this.dataSubject.next({
        pendingPrayers: pendingPrayersResult.data || [],
        pendingUpdates,
        pendingDeletionRequests,
        pendingStatusChangeRequests,
        pendingUpdateDeletionRequests: pendingUpdateDeletionRequestsResult.data || [],
        pendingPreferenceChanges: pendingPreferenceChangesResult.data || [],
        approvedPrayers: approvedPrayersResult.data || [],
        approvedUpdates,
        deniedPrayers: deniedPrayersResult.data || [],
        deniedUpdates,
        deniedStatusChangeRequests,
        deniedDeletionRequests,
        deniedUpdateDeletionRequests: deniedUpdateDeletionRequestsResult.data || [],
        deniedPreferenceChanges: deniedPreferenceChangesResult.data || [],
        approvedPrayersCount: approvedPrayersCountResult.count || 0,
        approvedUpdatesCount: approvedUpdatesCountResult.count || 0,
        deniedPrayersCount: deniedPrayersCountResult.count || 0,
        deniedUpdatesCount: deniedUpdatesCountResult.count || 0,
        loading: false,
        error: null
      });
    } catch (error: any) {
      console.error('Error fetching admin data:', error);
      this.dataSubject.next({
        ...this.dataSubject.value,
        loading: false,
        error: error.message || 'Failed to fetch admin data'
      });
    } finally {
      this.isFetching = false;
    }
  }

  async approvePrayer(id: string): Promise<void> {
    const supabaseClient = this.supabase.client;
    
    const { error } = await supabaseClient
      .from('prayers')
      .update({ 
        approval_status: 'approved',
        approved_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
    
    // Refresh admin data and main prayer list
    await this.fetchAdminData(true);
    await this.prayerService.loadPrayers();
  }

  async denyPrayer(id: string, reason: string): Promise<void> {
    const supabaseClient = this.supabase.client;
    
    const { error } = await supabaseClient
      .from('prayers')
      .update({ 
        approval_status: 'denied',
        denied_at: new Date().toISOString(),
        denial_reason: reason
      })
      .eq('id', id);

    if (error) throw error;
    await this.fetchAdminData(true);
    await this.prayerService.loadPrayers();
  }

  async editPrayer(id: string, updates: Partial<PrayerRequest>): Promise<void> {
    const supabaseClient = this.supabase.client;
    
    const { error } = await supabaseClient
      .from('prayers')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    await this.fetchAdminData(true);
    await this.prayerService.loadPrayers();
  }

  async approveUpdate(id: string): Promise<void> {
    const supabaseClient = this.supabase.client;
    
    const { error } = await supabaseClient
      .from('prayer_updates')
      .update({ 
        approval_status: 'approved',
        approved_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
    await this.fetchAdminData(true);
    await this.prayerService.loadPrayers();
  }

  async denyUpdate(id: string, reason: string): Promise<void> {
    const supabaseClient = this.supabase.client;
    
    const { error } = await supabaseClient
      .from('prayer_updates')
      .update({ 
        approval_status: 'denied',
        denied_at: new Date().toISOString(),
        denial_reason: reason
      })
      .eq('id', id);

    if (error) throw error;
    await this.fetchAdminData(true);
    await this.prayerService.loadPrayers();
  }

  async editUpdate(id: string, updates: Partial<PrayerUpdate>): Promise<void> {
    const supabaseClient = this.supabase.client;
    
    const { error } = await supabaseClient
      .from('prayer_updates')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    await this.fetchAdminData(true);    await this.prayerService.loadPrayers();  }

  async approveDeletionRequest(id: string): Promise<void> {
    const supabaseClient = this.supabase.client;
    
    const { error } = await supabaseClient
      .from('deletion_requests')
      .update({ 
        approval_status: 'approved',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
    await this.fetchAdminData(true);    await this.prayerService.loadPrayers();  }

  async denyDeletionRequest(id: string, reason: string): Promise<void> {
    const supabaseClient = this.supabase.client;
    
    const { error } = await supabaseClient
      .from('deletion_requests')
      .update({ 
        approval_status: 'denied',
        reviewed_at: new Date().toISOString(),
        denial_reason: reason
      })
      .eq('id', id);

    if (error) throw error;
    await this.fetchAdminData(true);    await this.prayerService.loadPrayers();  }

  async approveUpdateDeletionRequest(id: string): Promise<void> {
    const supabaseClient = this.supabase.client;
    
    const { error } = await supabaseClient
      .from('update_deletion_requests')
      .update({ 
        approval_status: 'approved',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
    await this.fetchAdminData(true);
    await this.prayerService.loadPrayers();
  }

  async denyUpdateDeletionRequest(id: string, reason: string): Promise<void> {
    const supabaseClient = this.supabase.client;
    
    const { error } = await supabaseClient
      .from('update_deletion_requests')
      .update({ 
        approval_status: 'denied',
        reviewed_at: new Date().toISOString(),
        denial_reason: reason
      })
      .eq('id', id);

    if (error) throw error;
    await this.fetchAdminData(true);
    await this.prayerService.loadPrayers();
  }

  async approvePreferenceChange(id: string): Promise<void> {
    const supabaseClient = this.supabase.client;
    
    const { error } = await supabaseClient
      .from('pending_preference_changes')
      .update({ 
        approval_status: 'approved',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
    await this.fetchAdminData(true);
  }

  async denyPreferenceChange(id: string, reason: string): Promise<void> {
    const supabaseClient = this.supabase.client;
    
    const { error } = await supabaseClient
      .from('pending_preference_changes')
      .update({ 
        approval_status: 'denied',
        reviewed_at: new Date().toISOString(),
        denial_reason: reason
      })
      .eq('id', id);

    if (error) throw error;
    await this.fetchAdminData(true);
  }

  silentRefresh(): void {
    this.fetchAdminData(true);
  }

  refresh(): void {
    this.fetchAdminData(false);
  }
}
