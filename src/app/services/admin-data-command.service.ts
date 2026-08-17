import { Injectable } from '@angular/core';
import { lookupPersonByEmail } from '../../lib/planning-center';
import { environment } from '../../environments/environment';
import {
  prayerStatusAfterApprovedUpdate,
  type AdminPendingUpdateRow,
  type AdminPrayerRow,
} from '../lib/admin-data-map';
import type { AccountApprovalRequest } from '../types/admin-data';
import type { PrayerRequest, PrayerUpdate } from '../types/prayer';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class AdminDataCommandService {
  constructor(private readonly supabase: SupabaseService) {}

  async approvePrayer(id: string): Promise<void> {
    const client = this.supabase.client;
    const { error } = await client
      .from('prayers')
      .update({
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;

    const { error: updateError } = await client
      .from('prayer_updates')
      .update({
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .eq('prayer_id', id)
      .eq('approval_status', 'pending');
    if (updateError) {
      console.error('[AdminDataCommandService] Error approving updates:', updateError);
    }
  }

  async fetchPrayerById(id: string): Promise<AdminPrayerRow> {
    const { data, error } = await this.supabase.client.from('prayers').select('*').eq('id', id).single();
    if (error) throw error;
    if (!data) throw new Error('Prayer not found');
    return data as AdminPrayerRow;
  }

  async tryFetchPrayerById(id: string): Promise<AdminPrayerRow | null> {
    const { data, error } = await this.supabase.client.from('prayers').select('*').eq('id', id).single();
    if (error || !data) {
      console.error('[AdminDataCommandService] Error fetching prayer:', error);
      return null;
    }
    return data as AdminPrayerRow;
  }

  async denyPrayer(id: string, reason: string): Promise<AdminPrayerRow> {
    const client = this.supabase.client;
    const { data: prayer, error: fetchError } = await client.from('prayers').select('*').eq('id', id).single();
    if (fetchError) throw fetchError;
    if (!prayer) throw new Error('Prayer not found');

    const { error } = await client
      .from('prayers')
      .update({
        approval_status: 'denied',
        denied_at: new Date().toISOString(),
        denial_reason: reason,
      })
      .eq('id', id);
    if (error) throw error;

    const { error: updateError } = await client
      .from('prayer_updates')
      .update({
        approval_status: 'denied',
        denied_at: new Date().toISOString(),
      })
      .eq('prayer_id', id)
      .eq('approval_status', 'pending');
    if (updateError) {
      console.error('[AdminDataCommandService] Error denying updates:', updateError);
    }

    return prayer as AdminPrayerRow;
  }

  async editPrayer(id: string, updates: Partial<PrayerRequest>): Promise<void> {
    const dataToUpdate = { ...updates };
    if (updates.prayer_for) {
      dataToUpdate.title = `Prayer for ${updates.prayer_for}`;
    }
    const { error } = await this.supabase.client.from('prayers').update(dataToUpdate).eq('id', id);
    if (error) throw error;
  }

  async approveUpdate(id: string): Promise<AdminPendingUpdateRow | null> {
    const client = this.supabase.client;
    const { data: updateInitial, error: fetchInitialError } = await client
      .from('prayer_updates')
      .select('*, prayers(title, status)')
      .eq('id', id)
      .single();
    if (fetchInitialError) throw fetchInitialError;
    if (!updateInitial) throw new Error('Update not found');

    const { error } = await client
      .from('prayer_updates')
      .update({
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;

    const prayerEmbed = Array.isArray(updateInitial.prayers)
      ? updateInitial.prayers[0]
      : updateInitial.prayers;
    const currentPrayerStatus = prayerEmbed?.status ?? null;
    const newPrayerStatus = prayerStatusAfterApprovedUpdate(
      updateInitial.mark_as_answered,
      currentPrayerStatus,
    );
    if (newPrayerStatus) {
      const { error: prayerError } = await client
        .from('prayers')
        .update({ status: newPrayerStatus })
        .eq('id', updateInitial.prayer_id);
      if (prayerError) {
        console.error('Failed to update prayer status:', prayerError);
      }
    }

    const { data: update, error: fetchError } = await client
      .from('prayer_updates')
      .select('*, prayers(title)')
      .eq('id', id)
      .single();
    if (fetchError || !update) {
      return null;
    }
    return update as AdminPendingUpdateRow;
  }

  async denyUpdate(id: string, reason: string): Promise<AdminPendingUpdateRow> {
    const client = this.supabase.client;
    const { data: update, error: fetchError } = await client
      .from('prayer_updates')
      .select('*, prayers(title, description)')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;
    if (!update) throw new Error('Update not found');

    const { error } = await client
      .from('prayer_updates')
      .update({
        approval_status: 'denied',
        denied_at: new Date().toISOString(),
        denial_reason: reason,
      })
      .eq('id', id);
    if (error) throw error;

    return update as AdminPendingUpdateRow;
  }

  async editUpdate(id: string, updates: Partial<PrayerUpdate>): Promise<void> {
    const { error } = await this.supabase.client.from('prayer_updates').update(updates).eq('id', id);
    if (error) throw error;
  }

  async fetchUpdateForBroadcast(id: string): Promise<AdminPendingUpdateRow> {
    const { data: update, error } = await this.supabase.client
      .from('prayer_updates')
      .select('*, prayers(title, description, status)')
      .eq('id', id)
      .single();
    if (error) throw error;
    if (!update) throw new Error('Update not found');
    return update as AdminPendingUpdateRow;
  }

  async applyPrayerStatusForBroadcast(update: AdminPendingUpdateRow): Promise<string | null> {
    const prayerEmbed = Array.isArray(update.prayers) ? update.prayers[0] : update.prayers;
    const currentPrayerStatus = prayerEmbed?.status ?? null;
    const newPrayerStatus = prayerStatusAfterApprovedUpdate(update.mark_as_answered, currentPrayerStatus);
    if (!newPrayerStatus) {
      return null;
    }
    const { error: prayerError } = await this.supabase.client
      .from('prayers')
      .update({ status: newPrayerStatus })
      .eq('id', update.prayer_id);
    if (prayerError) {
      console.error('Failed to update prayer status:', prayerError);
    }
    return newPrayerStatus;
  }

  async approveDeletionRequest(id: string): Promise<void> {
    const client = this.supabase.client;
    const { data: deletionRequest, error: fetchError } = await client
      .from('deletion_requests')
      .select('prayer_id')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;
    if (!deletionRequest) throw new Error('Deletion request not found');

    const { error: approveError } = await client
      .from('deletion_requests')
      .update({
        approval_status: 'approved',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (approveError) throw approveError;

    const { error: deleteError } = await client.from('prayers').delete().eq('id', deletionRequest.prayer_id);
    if (deleteError) throw deleteError;
  }

  async denyDeletionRequest(id: string, reason: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('deletion_requests')
      .update({
        approval_status: 'denied',
        reviewed_at: new Date().toISOString(),
        denial_reason: reason,
      })
      .eq('id', id);
    if (error) throw error;
  }

  async approveUpdateDeletionRequest(id: string): Promise<void> {
    const client = this.supabase.client;
    const { data: deletionRequest, error: fetchError } = await client
      .from('update_deletion_requests')
      .select('update_id')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;
    if (!deletionRequest) throw new Error('Update deletion request not found');

    const { error: approveError } = await client
      .from('update_deletion_requests')
      .update({
        approval_status: 'approved',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (approveError) throw approveError;

    const { error: deleteError } = await client
      .from('prayer_updates')
      .delete()
      .eq('id', deletionRequest.update_id);
    if (deleteError) throw deleteError;
  }

  async denyUpdateDeletionRequest(id: string, reason: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('update_deletion_requests')
      .update({
        approval_status: 'denied',
        reviewed_at: new Date().toISOString(),
        denial_reason: reason,
      })
      .eq('id', id);
    if (error) throw error;
  }

  async approveAccountRequest(id: string): Promise<AccountApprovalRequest> {
    const client = this.supabase.client;
    const { data: request, error: fetchError } = await client
      .from('account_approval_requests')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;
    if (!request) throw new Error('Account approval request not found');

    let inPlanningCenter: boolean | null = null;
    let planningCenterCheckedAt: string | null = null;
    try {
      const pcResult = await lookupPersonByEmail(
        request.email.toLowerCase(),
        environment.supabaseUrl,
        environment.supabaseAnonKey,
      );
      inPlanningCenter = pcResult.count > 0;
      planningCenterCheckedAt = new Date().toISOString();
    } catch (pcError) {
      console.error('[AccountApproval] Planning Center lookup failed:', pcError);
    }

    const { error: insertError } = await client.from('email_subscribers').insert({
      email: request.email.toLowerCase(),
      name: `${request.first_name} ${request.last_name}`,
      is_active: true,
      is_admin: false,
      receive_admin_emails: false,
      in_planning_center: inPlanningCenter,
      planning_center_checked_at: planningCenterCheckedAt,
    });
    if (insertError) throw insertError;

    const { error: deleteError } = await client.from('account_approval_requests').delete().eq('id', id);
    if (deleteError) throw deleteError;

    return request as AccountApprovalRequest;
  }

  async denyAccountRequest(id: string): Promise<AccountApprovalRequest> {
    const client = this.supabase.client;
    const { data: request, error: fetchError } = await client
      .from('account_approval_requests')
      .select('*')
      .eq('id', id)
      .single();
    if (fetchError) throw fetchError;
    if (!request) throw new Error('Account approval request not found');

    const { error: deleteError } = await client.from('account_approval_requests').delete().eq('id', id);
    if (deleteError) throw deleteError;

    return request as AccountApprovalRequest;
  }
}
