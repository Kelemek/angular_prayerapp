import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { PrayerService } from './prayer.service';
import { EmailNotificationService } from './email-notification.service';
import type { 
  PrayerRequest, 
  PrayerUpdate, 
  DeletionRequest, 
  UpdateDeletionRequest 
} from '../types/prayer';

export interface AdminData {
  pendingPrayers: PrayerRequest[];
  pendingUpdates: (PrayerUpdate & { prayer_title?: string })[];
  pendingDeletionRequests: (DeletionRequest & { prayer_title?: string })[];
  pendingUpdateDeletionRequests: (UpdateDeletionRequest & {
    prayer_updates?: {
      content?: string;
      author?: string;
      author_email?: string;
      prayers?: { title?: string };
    };
  })[];
  pendingAccountRequests?: Array<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    approval_status: string;
    created_at: string;
  }>;
  approvedPrayers: PrayerRequest[];
  approvedUpdates: (PrayerUpdate & { prayer_title?: string })[];
  deniedPrayers: PrayerRequest[];
  deniedUpdates: (PrayerUpdate & { prayer_title?: string })[];
  deniedDeletionRequests: (DeletionRequest & { prayer_title?: string })[];
  deniedUpdateDeletionRequests: (UpdateDeletionRequest & {
    prayer_updates?: {
      content?: string;
      author?: string;
      author_email?: string;
      prayers?: { title?: string };
    };
  })[];
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
    pendingUpdateDeletionRequests: [],
    pendingAccountRequests: [],
    approvedPrayers: [],
    approvedUpdates: [],
    deniedPrayers: [],
    deniedUpdates: [],
    deniedDeletionRequests: [],
    deniedUpdateDeletionRequests: [],
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
    private prayerService: PrayerService,
    private emailNotification: EmailNotificationService
  ) {}

  async fetchAdminData(silent = false, force = false): Promise<void> {
    if (this.isFetching && !force) {
      return;
    }

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

      // PHASE 1: Fetch only pending items immediately (6 quick queries)
      // These are what users see first and most importantly need on initial load
      const [
        pendingPrayersResult,
        pendingUpdatesResult,
        pendingDeletionRequestsResult,
        pendingUpdateDeletionRequestsResult,
        pendingAccountRequestsResult
      ] = await Promise.all([
        // Pending prayers
        supabaseClient
          .from('prayers')
          .select('*')
          .eq('approval_status', 'pending')
          .order('created_at', { ascending: false }),
        
        // Pending updates with full prayer details
        supabaseClient
          .from('prayer_updates')
          .select('*, prayers!inner(id, title, description, requester, prayer_for, status, email)')
          .eq('approval_status', 'pending')
          .order('created_at', { ascending: false }),
        
        // Pending deletion requests
        supabaseClient
          .from('deletion_requests')
          .select('*, prayers!inner(title)')
          .eq('approval_status', 'pending')
          .order('created_at', { ascending: false }),
        
        // Pending update deletion requests
        supabaseClient
          .from('update_deletion_requests')
          .select('*, prayer_updates(*, prayers(title))')
          .eq('approval_status', 'pending')
          .order('created_at', { ascending: false }),
        
        // Pending account approval requests
        supabaseClient
          .from('account_approval_requests')
          .select('*')
          .eq('approval_status', 'pending')
          .order('created_at', { ascending: false })
      ]);

      // Check for errors
      if (pendingPrayersResult.error) throw pendingPrayersResult.error;
      if (pendingUpdatesResult.error) throw pendingUpdatesResult.error;
      if (pendingAccountRequestsResult.error) {
        throw pendingAccountRequestsResult.error;
      }

      // Collect all unique emails to look up Planning Center status
      const emailsToLookup = new Set<string>();
      
      (pendingPrayersResult.data || []).forEach((prayer: any) => {
        if (prayer.email) {
          emailsToLookup.add(prayer.email.toLowerCase());
        }
      });
      
      (pendingUpdatesResult.data || []).forEach((update: any) => {
        if (update.author_email) {
          emailsToLookup.add(update.author_email.toLowerCase());
        }
      });

      // Fetch Planning Center statuses in one batch
      const pcStatusMap = await this.fetchPlanningCenterStatuses(Array.from(emailsToLookup));

      // Transform data with Planning Center status
      const pendingPrayers = (pendingPrayersResult.data || []).map((prayer: any) => ({
        ...prayer,
        in_planning_center: pcStatusMap.get(prayer.email?.toLowerCase()) ?? null
      }));

      const pendingUpdates = (pendingUpdatesResult.data || []).map((u: any) => ({
        ...u,
        prayer_title: u.prayers?.title,
        in_planning_center: pcStatusMap.get(u.author_email?.toLowerCase()) ?? null,
        // Also add in_planning_center to the nested prayer object
        prayers: u.prayers ? {
          ...u.prayers,
          in_planning_center: pcStatusMap.get(u.prayers.email?.toLowerCase()) ?? null
        } : u.prayers
      }));

      const pendingDeletionRequests = (pendingDeletionRequestsResult.data || []).map((d: any) => ({
        ...d,
        prayer_title: d.prayers?.title
      }));

      // Update with pending data immediately
      this.dataSubject.next({
        pendingPrayers,
        pendingUpdates,
        pendingDeletionRequests,
        pendingUpdateDeletionRequests: pendingUpdateDeletionRequestsResult.data || [],
        pendingAccountRequests: pendingAccountRequestsResult.data || [],
        approvedPrayers: [],
        approvedUpdates: [],
        deniedPrayers: [],
        deniedUpdates: [],
        deniedDeletionRequests: [],
        deniedUpdateDeletionRequests: [],
        approvedPrayersCount: 0,
        approvedUpdatesCount: 0,
        deniedPrayersCount: 0,
        deniedUpdatesCount: 0,
        loading: false,
        error: null
      });

      // PHASE 2: Fetch approved/denied data in background (non-blocking)
      // These are typically not needed on initial load and can load asynchronously
      this.loadApprovedAndDeniedDataAsync();
      
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

  /**
   * Load approved and denied data asynchronously in the background.
   * This doesn't block the initial admin portal load.
   */
  async loadApprovedAndDeniedDataAsync(): Promise<void> {
    try {
      const supabaseClient = this.supabase.client;

      const [
        approvedPrayersCountResult,
        approvedUpdatesCountResult,
        deniedPrayersCountResult,
        deniedUpdatesCountResult,
        approvedPrayersResult,
        approvedUpdatesResult,
        deniedPrayersResult,
        deniedUpdatesResult,
        deniedDeletionRequestsResult,
        deniedUpdateDeletionRequestsResult
      ] = await Promise.all([
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
          .from('deletion_requests')
          .select('*, prayers!inner(title)')
          .eq('approval_status', 'denied')
          .order('reviewed_at', { ascending: false }),
        
        supabaseClient
          .from('update_deletion_requests')
          .select('*, prayer_updates(*, prayers(title))')
          .eq('approval_status', 'denied')
          .order('reviewed_at', { ascending: false })
      ]);

      // Transform approved data
      const approvedUpdates = (approvedUpdatesResult.data || []).map((u: any) => ({
        ...u,
        prayer_title: u.prayers?.title
      }));

      // Transform denied data
      const deniedUpdates = (deniedUpdatesResult.data || []).map((u: any) => ({
        ...u,
        prayer_title: u.prayers?.title
      }));

      const deniedDeletionRequests = (deniedDeletionRequestsResult.data || []).map((d: any) => ({
        ...d,
        prayer_title: d.prayers?.title
      }));

      // Update with approved/denied data
      this.dataSubject.next({
        ...this.dataSubject.value,
        approvedPrayers: approvedPrayersResult.data || [],
        approvedUpdates,
        deniedPrayers: deniedPrayersResult.data || [],
        deniedUpdates,
        deniedDeletionRequests,
        deniedUpdateDeletionRequests: deniedUpdateDeletionRequestsResult.data || [],
        approvedPrayersCount: approvedPrayersCountResult.count || 0,
        approvedUpdatesCount: approvedUpdatesCountResult.count || 0,
        deniedPrayersCount: deniedPrayersCountResult.count || 0,
        deniedUpdatesCount: deniedUpdatesCountResult.count || 0
      });
    } catch (error: any) {
      console.error('Error fetching approved/denied data:', error);
      // Don't update error state since this is background loading
    }
  }

  async approvePrayer(id: string): Promise<void> {
    const supabaseClient = this.supabase.client;
    
    // Update approval status in the database
    const { error } = await supabaseClient
      .from('prayers')
      .update({ 
        approval_status: 'approved',
        approved_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;
    
    // Also approve all pending updates for this prayer
    const { error: updateError } = await supabaseClient
      .from('prayer_updates')
      .update({ 
        approval_status: 'approved',
        approved_at: new Date().toISOString()
      })
      .eq('prayer_id', id)
      .eq('approval_status', 'pending');

    if (updateError) {
      console.error('[AdminDataService] Error approving updates:', updateError);
      // Don't throw - we still want the prayer approval to succeed
    }
    
    // Fetch the latest prayer data AFTER approval is confirmed and admin edits are complete
    // This ensures the email contains any admin edits that were made before approval
    const { data: prayer, error: fetchError } = await supabaseClient
      .from('prayers')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !prayer) {
      console.error('[AdminDataService] Error fetching prayer for approval email:', fetchError);
      // Don't throw - approval already succeeded, just skip email
      await this.fetchAdminData(true, true);
      await this.prayerService.loadPrayers();
      return;
    }
    
    // Send approval email to requester with final approved data (don't let email failures block)
    this.emailNotification.sendRequesterApprovalNotification({
      title: prayer.title,
      description: prayer.description,
      requester: prayer.is_anonymous ? 'Anonymous' : prayer.requester,
      requesterEmail: prayer.email,
      prayerFor: prayer.prayer_for
    }).catch(err => console.error('Failed to send requester approval notification:', err));
    
    // Refresh admin data and main prayer list (force to bypass concurrent fetch guard)
    await this.fetchAdminData(true, true);
    await this.prayerService.loadPrayers();
  }

  /**
   * Send notification emails to all subscribers for an approved prayer
   * Called when admin clicks the "Send Emails" button
   * 
   * For shared personal prayers:
   * - If it has updates: send approved update notification with the most recent update
   * - If no updates: send approved prayer notification
   */
  async sendApprovedPrayerEmails(id: string): Promise<void> {
    const supabaseClient = this.supabase.client;
    
    // Get the prayer details
    const { data: prayer, error: fetchError } = await supabaseClient
      .from('prayers')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!prayer) throw new Error('Prayer not found');
    
    // For shared personal prayers, check if it has updates
    if (prayer.is_shared_personal_prayer) {
      // Fetch the most recent update with the prayer data (using same pattern as sendApprovedUpdateEmails)
      const { data: updates, error: updatesError } = await supabaseClient
        .from('prayer_updates')
        .select('*, prayers(title, description, status)')
        .eq('prayer_id', id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (updatesError) {
        console.error('[AdminDataService] Error fetching updates for shared prayer:', updatesError);
      }

      const hasUpdates = updates && updates.length > 0;
      
      if (hasUpdates) {
        // Send update notification with the most recent update (using same pattern as sendApprovedUpdateEmails)
        const latestUpdate = updates[0];
        const prayerData = latestUpdate.prayers && typeof latestUpdate.prayers === 'object' ? latestUpdate.prayers : null;
        
        const prayerTitle = prayerData && 'title' in prayerData
          ? String(prayerData.title)
          : prayer.title;
        const prayerDescription = prayerData && 'description' in prayerData
          ? String(prayerData.description)
          : prayer.description;
        
        this.emailNotification.sendApprovedUpdateNotification({
          prayerTitle: prayerTitle,
          prayerDescription: prayerDescription,
          content: latestUpdate.content,
          author: latestUpdate.is_anonymous ? 'Anonymous' : (latestUpdate.author || 'Anonymous'),
          markedAsAnswered: latestUpdate.mark_as_answered || false
        }).catch(err => console.error('Failed to send update notification:', err));
      } else {
        // Send prayer notification if no updates
        this.emailNotification.sendApprovedPrayerNotification({
          title: prayer.title,
          description: prayer.description,
          requester: prayer.is_anonymous ? 'Anonymous' : prayer.requester,
          prayerFor: prayer.prayer_for,
          status: prayer.status
        }).catch(err => console.error('Failed to send prayer notification:', err));
      }
    } else {
      // For regular prayers, always send prayer notification
      this.emailNotification.sendApprovedPrayerNotification({
        title: prayer.title,
        description: prayer.description,
        requester: prayer.is_anonymous ? 'Anonymous' : prayer.requester,
        prayerFor: prayer.prayer_for,
        status: prayer.status
      }).catch(err => console.error('Failed to send broadcast notification:', err));
    }

    // Trigger email processor immediately
    await this.triggerEmailProcessor().catch(err => 
      console.error('Failed to trigger email processor:', err)
    );
  }

  async denyPrayer(id: string, reason: string): Promise<void> {
    const supabaseClient = this.supabase.client;
    
    // First get the prayer details before denying
    const { data: prayer, error: fetchError } = await supabaseClient
      .from('prayers')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!prayer) throw new Error('Prayer not found');
    
    const { error } = await supabaseClient
      .from('prayers')
      .update({ 
        approval_status: 'denied',
        denied_at: new Date().toISOString(),
        denial_reason: reason
      })
      .eq('id', id);

    if (error) throw error;
    
    // Also deny all pending updates for this prayer
    const { error: updateError } = await supabaseClient
      .from('prayer_updates')
      .update({ 
        approval_status: 'denied',
        denied_at: new Date().toISOString()
      })
      .eq('prayer_id', id)
      .eq('approval_status', 'pending');

    if (updateError) {
      console.error('[AdminDataService] Error denying updates:', updateError);
      // Don't throw - we still want the prayer denial to succeed
    } else {
    }
    
    // Send email notification to the requester (don't let email failures block the denial)
    if (prayer.email) {
      this.emailNotification.sendDeniedPrayerNotification({
        title: prayer.title,
        description: prayer.description,
        requester: prayer.is_anonymous ? 'Anonymous' : prayer.requester,
        requesterEmail: prayer.email,
        denialReason: reason
      }).catch(err => console.error('Failed to send denial notification:', err));
    }
    
    await this.fetchAdminData(true, true);
    await this.prayerService.loadPrayers();
  }

  async editPrayer(id: string, updates: Partial<PrayerRequest>): Promise<void> {
    const supabaseClient = this.supabase.client;
    
    // If prayer_for is being updated, also update title to keep them in sync
    const dataToUpdate = { ...updates };
    if (updates.prayer_for) {
      dataToUpdate.title = `Prayer for ${updates.prayer_for}`;
    }
    
    const { error } = await supabaseClient
      .from('prayers')
      .update(dataToUpdate)
      .eq('id', id);

    if (error) throw error;
    await this.fetchAdminData(true, true);
    await this.prayerService.loadPrayers();
  }

  /**
   * Send broadcast notification for a newly submitted prayer (same as approval process)
   * Called after admin confirms they want to send the notification
   */
  async sendBroadcastNotificationForNewPrayer(id: string): Promise<void> {
    const supabaseClient = this.supabase.client;
    
    // Get the prayer details
    const { data: prayer, error: fetchError } = await supabaseClient
      .from('prayers')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!prayer) throw new Error('Prayer not found');
    
    // Send email notifications (don't let email failures block)
    this.emailNotification.sendApprovedPrayerNotification({
      title: prayer.title,
      description: prayer.description,
      requester: prayer.is_anonymous ? 'Anonymous' : prayer.requester,
      prayerFor: prayer.prayer_for,
      status: prayer.status
    }).catch(err => console.error('Failed to send broadcast notification:', err));
  }

  async approveUpdate(id: string): Promise<void> {
    const supabaseClient = this.supabase.client;
    
    // First get the update details, prayer title, and prayer status to check initial state
    const { data: updateInitial, error: fetchInitialError } = await supabaseClient
      .from('prayer_updates')
      .select('*, prayers(title, status)')
      .eq('id', id)
      .single();

    if (fetchInitialError) throw fetchInitialError;
    if (!updateInitial) throw new Error('Update not found');
    
    const { error } = await supabaseClient
      .from('prayer_updates')
      .update({ 
        approval_status: 'approved',
        approved_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    // Get the prayer's current status
    const prayerData = updateInitial.prayers && typeof updateInitial.prayers === 'object' ? updateInitial.prayers : null;
    const currentPrayerStatus = prayerData && 'status' in prayerData ? String(prayerData.status) : null;

    // Update prayer status based on the logic:
    // 1. If mark_as_answered is true, set to 'answered'
    // 2. If current status is 'answered' or 'archived' and NOT marked as answered, set to 'current'
    // 3. Otherwise, leave status unchanged
    let newPrayerStatus: string | null = null;
    
    if (updateInitial.mark_as_answered) {
      newPrayerStatus = 'answered';
    } else if (currentPrayerStatus === 'answered' || currentPrayerStatus === 'archived') {
      newPrayerStatus = 'current';
    }

    // Update the prayer status if needed
    if (newPrayerStatus) {
      const { error: prayerError } = await supabaseClient
        .from('prayers')
        .update({ status: newPrayerStatus })
        .eq('id', updateInitial.prayer_id);
      
      if (prayerError) {
        console.error('Failed to update prayer status:', prayerError);
      }
    }

    // Fetch the latest update data AFTER approval is confirmed and admin edits are complete
    // This ensures the email contains any admin edits that were made before approval
    const { data: update, error: fetchError } = await supabaseClient
      .from('prayer_updates')
      .select('*, prayers(title)')
      .eq('id', id)
      .single();

    if (!fetchError && update) {
      // Send approval email to update author (don't let email failures block)
      const prayerTitle = update?.prayers && 'title' in update.prayers
        ? String(update.prayers.title)
        : 'Prayer';
      
      this.emailNotification.sendUpdateAuthorApprovalNotification({
        prayerTitle: prayerTitle,
        content: update.content || '',
        author: update.is_anonymous ? 'Anonymous' : (update.author || 'Anonymous'),
        authorEmail: update.author_email || ''
      }).catch(err => console.error('Failed to send update author approval notification:', err));
    }

    // Refresh admin data and main prayer list (force to bypass concurrent fetch guard)
    await this.fetchAdminData(true, true);
    await this.prayerService.loadPrayers();
  }

  /**
   * Send notification emails for an approved update
   * Called after admin confirms they want to send the notification
   */
  async sendApprovedUpdateEmails(id: string): Promise<void> {
    const supabaseClient = this.supabase.client;
    
    // Get the update details and prayer data
    const { data: update, error: fetchError } = await supabaseClient
      .from('prayer_updates')
      .select('*, prayers(title, description, status)')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!update) throw new Error('Update not found');
    
    // Get the prayer's current status and description
    const prayerData = update.prayers && typeof update.prayers === 'object' ? update.prayers : null;

    // Send mass email notification to all subscribers (don't let email failures block)
    const prayerTitle = prayerData && 'title' in prayerData
      ? String(prayerData.title)
      : 'Prayer';
    const prayerDescription = prayerData && 'description' in prayerData
      ? String(prayerData.description)
      : '';
    this.emailNotification.sendApprovedUpdateNotification({
      prayerTitle: prayerTitle,
      prayerDescription: prayerDescription,
      content: update.content,
      author: update.is_anonymous ? 'Anonymous' : (update.author || 'Anonymous'),
      markedAsAnswered: update.mark_as_answered || false
    }).catch(err => console.error('Failed to send update notification:', err));

    // Trigger email processor immediately
    await this.triggerEmailProcessor().catch(err => 
      console.error('Failed to trigger email processor:', err)
    );
  }

  async denyUpdate(id: string, reason: string): Promise<void> {
    const supabaseClient = this.supabase.client;
    
    // First get the update details and prayer title before denying
    const { data: update, error: fetchError } = await supabaseClient
      .from('prayer_updates')
      .select('*, prayers(title, description)')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!update) throw new Error('Update not found');
    
    const { error } = await supabaseClient
      .from('prayer_updates')
      .update({ 
        approval_status: 'denied',
        denied_at: new Date().toISOString(),
        denial_reason: reason
      })
      .eq('id', id);

    if (error) throw error;
    
    // Send email notification to the author (don't let email failures block the denial)
    if (update.author_email) {
      const prayerTitle = update.prayers && typeof update.prayers === 'object' && 'title' in update.prayers
        ? String(update.prayers.title)
        : 'Prayer';
      this.emailNotification.sendDeniedUpdateNotification({
        prayerTitle,
        content: update.content,
        author: update.is_anonymous ? 'Anonymous' : (update.author || 'Anonymous'),
        authorEmail: update.author_email,
        denialReason: reason
      }).catch(err => console.error('Failed to send denial notification:', err));
    }
    
    await this.fetchAdminData(true, true);
    await this.prayerService.loadPrayers();
  }

  async editUpdate(id: string, updates: Partial<PrayerUpdate>): Promise<void> {
    const supabaseClient = this.supabase.client;
    
    const { error } = await supabaseClient
      .from('prayer_updates')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    await this.fetchAdminData(true);
    await this.prayerService.loadPrayers();
  }

  /**
   * Send broadcast notification for a newly submitted update (same as approval process)
   * Called after admin confirms they want to send the notification
   * Handles prayer status updates and sends appropriate email template (answered vs regular update)
   */
  async sendBroadcastNotificationForNewUpdate(id: string): Promise<void> {
    const supabaseClient = this.supabase.client;
    
    // Get the update details, prayer title, and prayer status
    const { data: update, error: fetchError } = await supabaseClient
      .from('prayer_updates')
      .select('*, prayers(title, description, status)')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!update) throw new Error('Update not found');
    
    // Get the prayer's current status
    const prayerData = update.prayers && typeof update.prayers === 'object' ? update.prayers : null;
    const currentPrayerStatus = prayerData && 'status' in prayerData ? String(prayerData.status) : null;

    // Update prayer status based on the logic:
    // 1. If mark_as_answered is true, set to 'answered'
    // 2. If current status is 'answered' or 'archived' and NOT marked as answered, set to 'current'
    // 3. Otherwise, leave status unchanged
    let newPrayerStatus: string | null = null;
    
    if (update.mark_as_answered) {
      newPrayerStatus = 'answered';
    } else if (currentPrayerStatus === 'answered' || currentPrayerStatus === 'archived') {
      newPrayerStatus = 'current';
    }

    // Update the prayer status if needed
    if (newPrayerStatus) {
      const { error: prayerError } = await supabaseClient
        .from('prayers')
        .update({ status: newPrayerStatus })
        .eq('id', update.prayer_id);
      
      if (prayerError) {
        console.error('Failed to update prayer status:', prayerError);
      }
    }

    // Send mass email notification to all subscribers (don't let email failures block)
    const prayerTitle = prayerData && 'title' in prayerData
      ? String(prayerData.title)
      : 'Prayer';
    const prayerDescription = prayerData && 'description' in prayerData
      ? String(prayerData.description)
      : '';
    this.emailNotification.sendApprovedUpdateNotification({
      prayerTitle: prayerTitle,
      prayerDescription: prayerDescription,
      content: update.content,
      author: update.is_anonymous ? 'Anonymous' : (update.author || 'Anonymous'),
      markedAsAnswered: update.mark_as_answered || false
    }).catch(err => console.error('Failed to send update notification:', err));
  }

  async approveDeletionRequest(id: string): Promise<void> {
    const supabaseClient = this.supabase.client;
    
    // First, get the prayer_id from the deletion request
    const { data: deletionRequest, error: fetchError } = await supabaseClient
      .from('deletion_requests')
      .select('prayer_id')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!deletionRequest) throw new Error('Deletion request not found');
    
    // Mark the deletion request as approved
    const { error: approveError } = await supabaseClient
      .from('deletion_requests')
      .update({ 
        approval_status: 'approved',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id);

    if (approveError) throw approveError;
    
    // Actually delete the prayer
    const { error: deleteError } = await supabaseClient
      .from('prayers')
      .delete()
      .eq('id', deletionRequest.prayer_id);

    if (deleteError) throw deleteError;
    
    await this.fetchAdminData(true, true);
    await this.prayerService.loadPrayers();
  }

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
    await this.fetchAdminData(true, true);
    await this.prayerService.loadPrayers();
  }

  async approveUpdateDeletionRequest(id: string): Promise<void> {
    const supabaseClient = this.supabase.client;
    
    // First, get the update_id from the deletion request
    const { data: deletionRequest, error: fetchError } = await supabaseClient
      .from('update_deletion_requests')
      .select('update_id')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!deletionRequest) throw new Error('Update deletion request not found');
    
    // Mark the deletion request as approved
    const { error: approveError } = await supabaseClient
      .from('update_deletion_requests')
      .update({ 
        approval_status: 'approved',
        reviewed_at: new Date().toISOString()
      })
      .eq('id', id);

    if (approveError) throw approveError;
    
    // Actually delete the update
    const { error: deleteError } = await supabaseClient
      .from('prayer_updates')
      .delete()
      .eq('id', deletionRequest.update_id);

    if (deleteError) throw deleteError;
    
    await this.fetchAdminData(true, true);
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
    await this.fetchAdminData(true, true);
    await this.prayerService.loadPrayers();
  }

  async approveAccountRequest(id: string): Promise<void> {
    const supabaseClient = this.supabase.client;
    
    // Get the account request
    const { data: request, error: fetchError } = await supabaseClient
      .from('account_approval_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!request) throw new Error('Account approval request not found');
    
    // Check Planning Center status for the email
    let inPlanningCenter: boolean | null = null;
    let planningCenterCheckedAt: string | null = null;
    
    try {
      const { lookupPersonByEmail } = await import('../../lib/planning-center');
      const { environment } = await import('../../environments/environment');
      
      const pcResult = await lookupPersonByEmail(
        request.email.toLowerCase(),
        environment.supabaseUrl,
        environment.supabaseAnonKey
      );
      inPlanningCenter = pcResult.count > 0;
      planningCenterCheckedAt = new Date().toISOString();
    } catch (pcError) {
      console.error('[AccountApproval] Planning Center lookup failed:', pcError);
      // Continue with null values if check fails - don't block approval
    }
    
    // Create the email subscriber
    const { error: insertError } = await supabaseClient
      .from('email_subscribers')
      .insert({
        email: request.email.toLowerCase(),
        name: `${request.first_name} ${request.last_name}`,
        is_active: true,
        is_admin: false,
        receive_admin_emails: false,
        in_planning_center: inPlanningCenter,
        planning_center_checked_at: planningCenterCheckedAt
      });

    if (insertError) throw insertError;
    
    // Delete the approval request
    const { error: deleteError } = await supabaseClient
      .from('account_approval_requests')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;
    
    // Send approval email to user
    try {
      const template = await this.emailNotification.getTemplate('account_approved');
      if (template) {
        const subject = this.emailNotification.applyTemplateVariables(template.subject, {
          firstName: request.first_name
        });
        const html = this.emailNotification.applyTemplateVariables(template.html_body, {
          firstName: request.first_name,
          lastName: request.last_name,
          email: request.email,
          loginLink: `${window.location.origin}/login`
        });
        const text = this.emailNotification.applyTemplateVariables(template.text_body, {
          firstName: request.first_name,
          lastName: request.last_name,
          email: request.email,
          loginLink: `${window.location.origin}/login`
        });

        await this.emailNotification.sendEmail({
          to: request.email,
          subject,
          htmlBody: html,
          textBody: text
        });
      }
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError);
    }

    // Send welcome email to the newly approved subscriber
    try {
      await this.emailNotification.sendSubscriberWelcomeNotification(request.email);
    } catch (welcomeEmailError) {
      console.error('Failed to send welcome email:', welcomeEmailError);
      // Don't fail the approval if welcome email fails
    }
    
    await this.fetchAdminData(true, true);
  }

  async denyAccountRequest(id: string, reason: string): Promise<void> {
    const supabaseClient = this.supabase.client;
    
    // Get the account request
    const { data: request, error: fetchError } = await supabaseClient
      .from('account_approval_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!request) throw new Error('Account approval request not found');
    
    // Delete the approval request
    const { error: deleteError } = await supabaseClient
      .from('account_approval_requests')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;
    
    // Send denial email to user
    try {
      const template = await this.emailNotification.getTemplate('account_denied');
      if (template) {
        const subject = this.emailNotification.applyTemplateVariables(template.subject, {
          firstName: request.first_name
        });
        const html = this.emailNotification.applyTemplateVariables(template.html_body, {
          firstName: request.first_name,
          lastName: request.last_name,
          supportEmail: 'support@example.com' // TODO: Get from settings
        });
        const text = this.emailNotification.applyTemplateVariables(template.text_body, {
          firstName: request.first_name,
          lastName: request.last_name,
          supportEmail: 'support@example.com'
        });

        await this.emailNotification.sendEmail({
          to: request.email,
          subject,
          htmlBody: html,
          textBody: text
        });
      }
    } catch (emailError) {
      console.error('Failed to send denial email:', emailError);
    }
    
    await this.fetchAdminData(true, true);
  }

  silentRefresh(): void {
    this.fetchAdminData(true);
  }

  refresh(): void {
    this.fetchAdminData(false);
  }

  /**
   * Send welcome email to a new subscriber
   */
  async sendSubscriberWelcomeEmail(email: string): Promise<void> {
    try {
      await this.emailNotification.sendSubscriberWelcomeNotification(email);
    } catch (error) {
      console.error('Error sending subscriber welcome email:', error);
      throw error;
    }
  }

  /**
   * Trigger the GitHub Actions email processor workflow
   * Sends an immediate request to process the email queue
   */
  private async triggerEmailProcessor(): Promise<void> {
    try {
      
      const response = await this.supabase.client.functions.invoke('trigger-email-processor', {
        method: 'POST',
      });

      if (response.error) {
        console.error('❌ Edge Function error:', response.error);
        return;
      }

    } catch (error) {
      console.error('❌ Failed to trigger email processor:', error instanceof Error ? error.message : error);
      // Don't throw - email processing will still happen, just slower
    }
  }

  /**
   * Fetch Planning Center status for multiple email addresses
   * Returns a map of email -> in_planning_center status
   */
  private async fetchPlanningCenterStatuses(emails: string[]): Promise<Map<string, boolean>> {
    const statusMap = new Map<string, boolean>();
    
    if (!emails || emails.length === 0) {
      return statusMap;
    }

    try {
      const supabaseClient = this.supabase.client;
      
      // Fetch all email_subscribers records for the given emails
      const { data, error } = await supabaseClient
        .from('email_subscribers')
        .select('email, in_planning_center')
        .in('email', emails.map(e => e.toLowerCase()));

      if (error) {
        console.error('Error fetching Planning Center statuses:', error);
        return statusMap;
      }

      // Build the map
      (data || []).forEach((record: any) => {
        statusMap.set(record.email.toLowerCase(), record.in_planning_center === true);
      });

      return statusMap;
    } catch (error) {
      console.error('Error fetching Planning Center statuses:', error);
      return statusMap;
    }
  }
}
