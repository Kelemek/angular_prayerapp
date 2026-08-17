import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import type { AdminData } from '../types/admin-data';
import {
  type AdminDeletionRequestRow,
  type AdminPendingUpdateRow,
  type AdminPrayerRow,
  type AdminUpdateDeletionRequestRow,
  type EmailSubscriberPcRow,
  buildPlanningCenterStatusMap,
  collectPendingEmailsForPcLookup,
  mapAccountApprovalRequestRow,
  mapDeletionRequestRow,
  mapPendingUpdateRow,
  mapPrayerRow,
  mapUpdateDeletionRequestRow,
  mapUpdateWithPrayerTitle,
} from '../lib/admin-data-map';
import type { AccountApprovalRequest } from '../types/admin-data';

export interface AdminPendingSnapshot {
  pendingPrayers: AdminData['pendingPrayers'];
  pendingUpdates: AdminData['pendingUpdates'];
  pendingDeletionRequests: AdminData['pendingDeletionRequests'];
  pendingUpdateDeletionRequests: AdminData['pendingUpdateDeletionRequests'];
  pendingAccountRequests: AdminData['pendingAccountRequests'];
}

export interface AdminApprovedDeniedSnapshot {
  approvedPrayers: AdminData['approvedPrayers'];
  approvedUpdates: AdminData['approvedUpdates'];
  deniedPrayers: AdminData['deniedPrayers'];
  deniedUpdates: AdminData['deniedUpdates'];
  deniedDeletionRequests: AdminData['deniedDeletionRequests'];
  deniedUpdateDeletionRequests: AdminData['deniedUpdateDeletionRequests'];
  approvedPrayersCount: number;
  approvedUpdatesCount: number;
  deniedPrayersCount: number;
  deniedUpdatesCount: number;
}

@Injectable({ providedIn: 'root' })
export class AdminDataReadService {
  constructor(private readonly supabase: SupabaseService) {}

  async fetchPendingSnapshot(): Promise<AdminPendingSnapshot> {
    const supabaseClient = this.supabase.client;

    const [
      pendingPrayersResult,
      pendingUpdatesResult,
      pendingDeletionRequestsResult,
      pendingUpdateDeletionRequestsResult,
      pendingAccountRequestsResult,
    ] = await Promise.all([
      supabaseClient
        .from('prayers')
        .select('*')
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false }),
      supabaseClient
        .from('prayer_updates')
        .select('*, prayers!inner(id, title, description, requester, prayer_for, status, email)')
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false }),
      supabaseClient
        .from('deletion_requests')
        .select('*, prayers!inner(title)')
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false }),
      supabaseClient
        .from('update_deletion_requests')
        .select('*, prayer_updates(*, prayers(title))')
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false }),
      supabaseClient
        .from('account_approval_requests')
        .select('*')
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false }),
    ]);

    if (pendingPrayersResult.error) throw pendingPrayersResult.error;
    if (pendingUpdatesResult.error) throw pendingUpdatesResult.error;
    if (pendingAccountRequestsResult.error) throw pendingAccountRequestsResult.error;

    const prayerRows = (pendingPrayersResult.data ?? []) as AdminPrayerRow[];
    const updateRows = (pendingUpdatesResult.data ?? []) as AdminPendingUpdateRow[];
    const emailsToLookup = collectPendingEmailsForPcLookup(prayerRows, updateRows);
    const pcStatusMap = await this.fetchPlanningCenterStatuses(emailsToLookup);

    const pendingPrayers = prayerRows.map((row) =>
      mapPrayerRow(row, pcStatusMap.get(row.email?.toLowerCase()) ?? null),
    );
    const pendingUpdates = updateRows.map((row) => mapPendingUpdateRow(row, pcStatusMap));
    const pendingDeletionRequests = ((pendingDeletionRequestsResult.data ?? []) as AdminDeletionRequestRow[]).map(
      mapDeletionRequestRow,
    );
    const pendingUpdateDeletionRequests = (
      (pendingUpdateDeletionRequestsResult.data ?? []) as AdminUpdateDeletionRequestRow[]
    ).map(mapUpdateDeletionRequestRow);
    const pendingAccountRequests = ((pendingAccountRequestsResult.data ?? []) as AccountApprovalRequest[]).map(
      mapAccountApprovalRequestRow,
    );

    return {
      pendingPrayers,
      pendingUpdates,
      pendingDeletionRequests,
      pendingUpdateDeletionRequests,
      pendingAccountRequests,
    };
  }

  async fetchApprovedDeniedSnapshot(): Promise<AdminApprovedDeniedSnapshot> {
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
      deniedUpdateDeletionRequestsResult,
    ] = await Promise.all([
      supabaseClient.from('prayers').select('*', { count: 'exact', head: true }).eq('approval_status', 'approved'),
      supabaseClient.from('prayer_updates').select('*', { count: 'exact', head: true }).eq('approval_status', 'approved'),
      supabaseClient.from('prayers').select('*', { count: 'exact', head: true }).eq('approval_status', 'denied'),
      supabaseClient.from('prayer_updates').select('*', { count: 'exact', head: true }).eq('approval_status', 'denied'),
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
        .order('reviewed_at', { ascending: false }),
    ]);

    const approvedUpdates = ((approvedUpdatesResult.data ?? []) as AdminPendingUpdateRow[]).map(
      mapUpdateWithPrayerTitle,
    );
    const deniedUpdates = ((deniedUpdatesResult.data ?? []) as AdminPendingUpdateRow[]).map(mapUpdateWithPrayerTitle);
    const deniedDeletionRequests = ((deniedDeletionRequestsResult.data ?? []) as AdminDeletionRequestRow[]).map(
      mapDeletionRequestRow,
    );

    return {
      approvedPrayers: (approvedPrayersResult.data ?? []) as AdminData['approvedPrayers'],
      approvedUpdates,
      deniedPrayers: (deniedPrayersResult.data ?? []) as AdminData['deniedPrayers'],
      deniedUpdates,
      deniedDeletionRequests,
      deniedUpdateDeletionRequests: (
        (deniedUpdateDeletionRequestsResult.data ?? []) as AdminUpdateDeletionRequestRow[]
      ).map(mapUpdateDeletionRequestRow),
      approvedPrayersCount: approvedPrayersCountResult.count ?? 0,
      approvedUpdatesCount: approvedUpdatesCountResult.count ?? 0,
      deniedPrayersCount: deniedPrayersCountResult.count ?? 0,
      deniedUpdatesCount: deniedUpdatesCountResult.count ?? 0,
    };
  }

  async fetchPlanningCenterStatuses(emails: string[]): Promise<Map<string, boolean>> {
    if (!emails.length) {
      return new Map();
    }

    try {
      const { data, error } = await this.supabase.client
        .from('email_subscribers')
        .select('email, in_planning_center')
        .in('email', emails.map((email) => email.toLowerCase()));

      if (error) {
        console.error('Error fetching Planning Center statuses:', error);
        return new Map();
      }

      return buildPlanningCenterStatusMap((data ?? []) as EmailSubscriberPcRow[]);
    } catch (error) {
      console.error('Error fetching Planning Center statuses:', error);
      return new Map();
    }
  }
}
