import type { SupabaseClient } from '@supabase/supabase-js';
import {
  COMMUNITY_PRAYERS_WITH_UPDATES_SELECT,
  prayersByMonthOrFilter,
} from './prayer-community-load';
import {
  buildPendingCommunityUpdateInsertRow,
  buildSimplePendingUpdateInsertRow,
  type CommunityUpdateSubmitData,
} from './prayer-community-mutations';
import {
  buildPrayerDeletionRequestRow,
  buildUpdateDeletionRequestRow,
  type PrayerDeletionRequestInput,
  type UpdateDeletionRequestInput,
} from './prayer-community-deletion-requests';
import {
  buildMemberPrayerUpdateInsertRow,
  buildMemberPrayerUpdatePatch,
  type MemberPrayerUpdateRow,
} from './prayer-member-updates';
import type { PrayerUpdate } from './prayer-types';

export async function fetchApprovedCommunityPrayers(
  client: SupabaseClient
): Promise<{ data: Record<string, unknown>[] | null; error: unknown }> {
  const result = await client
    .from('prayers')
    .select(COMMUNITY_PRAYERS_WITH_UPDATES_SELECT)
    .eq('approval_status', 'approved')
    .order('created_at', { ascending: false });
  return { data: result.data as Record<string, unknown>[] | null, error: result.error };
}

export async function fetchCommunityPrayersByMonth(
  client: SupabaseClient,
  startDate: string,
  endDate: string
): Promise<{ data: Record<string, unknown>[] | null; error: unknown }> {
  const result = await client
    .from('prayers')
    .select(COMMUNITY_PRAYERS_WITH_UPDATES_SELECT)
    .or(prayersByMonthOrFilter(startDate, endDate))
    .order('updated_at', { ascending: false });
  return { data: result.data as Record<string, unknown>[] | null, error: result.error };
}

export async function insertCommunityPrayerRow(
  client: SupabaseClient,
  prayerData: Record<string, unknown>
): Promise<{ data: { id: string } | null; error: unknown }> {
  const result = await client.from('prayers').insert(prayerData).select().single();
  return { data: result.data as { id: string } | null, error: result.error };
}

export async function findEmailSubscriberByEmail(
  client: SupabaseClient,
  email: string
): Promise<{ data: { id: string } | null; error: unknown }> {
  const result = await client
    .from('email_subscribers')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  return { data: result.data, error: result.error };
}

export async function insertEmailSubscriberRow(
  client: SupabaseClient,
  row: Record<string, unknown>
): Promise<{ error: unknown }> {
  const result = await client.from('email_subscribers').insert(row);
  return { error: result.error };
}

export async function updateCommunityPrayerStatusRow(
  client: SupabaseClient,
  id: string,
  updateData: Record<string, unknown>
): Promise<{ error: unknown }> {
  const result = await client.from('prayers').update(updateData).eq('id', id);
  return { error: result.error };
}

export async function rpcIncrementCommunityPrayedFor(
  client: SupabaseClient,
  prayerId: string
): Promise<{ data: unknown; error: unknown }> {
  const result = await client.rpc('increment_prayed_for_count', { prayer_id: prayerId });
  return { data: result.data, error: result.error };
}

export async function rpcIncrementMemberPrayedFor(
  client: SupabaseClient,
  personId: string
): Promise<{ data: unknown; error: unknown }> {
  const result = await client.rpc('increment_member_prayed_for_count', {
    p_person_id: personId,
  });
  return { data: result.data, error: result.error };
}

export async function fetchMemberPrayedForCountsBatch(
  client: SupabaseClient,
  personIds: string[]
): Promise<{
  data: Array<{ person_id: string; prayed_for_count: number }> | null;
  error: unknown;
}> {
  const result = await client
    .from('member_prayed_for_counts')
    .select('person_id, prayed_for_count')
    .in('person_id', personIds);
  return { data: result.data, error: result.error };
}

export async function insertPendingCommunityPrayerUpdate(
  client: SupabaseClient,
  prayerId: string,
  content: string,
  author: string
): Promise<{ data: { id: string } | null; error: unknown }> {
  const result = await client
    .from('prayer_updates')
    .insert(buildSimplePendingUpdateInsertRow(prayerId, content, author))
    .select()
    .single();
  return { data: result.data as { id: string } | null, error: result.error };
}

export async function insertPendingCommunityUpdate(
  client: SupabaseClient,
  updateData: CommunityUpdateSubmitData
): Promise<{ data: { id: string } | null; error: unknown }> {
  const result = await client
    .from('prayer_updates')
    .insert(buildPendingCommunityUpdateInsertRow(updateData))
    .select()
    .single();
  return { data: result.data as { id: string } | null, error: result.error };
}

export async function fetchCommunityPrayerTitle(
  client: SupabaseClient,
  prayerId: string
): Promise<{ data: { title?: string } | null; error: unknown }> {
  const result = await client
    .from('prayers')
    .select('title')
    .eq('id', prayerId)
    .single();
  return { data: result.data, error: result.error };
}

export async function insertMemberPrayerUpdateRow(
  client: SupabaseClient,
  personId: string,
  content: string,
  isAnswered: boolean
): Promise<{ error: unknown }> {
  const result = await client
    .from('member_prayer_updates')
    .insert(buildMemberPrayerUpdateInsertRow(personId, content, isAnswered))
    .select()
    .single();
  return { error: result.error };
}

export async function fetchMemberPrayerUpdatesBatch(
  client: SupabaseClient,
  personIds: string[]
): Promise<{ data: MemberPrayerUpdateRow[] | null; error: unknown }> {
  const result = await client
    .from('member_prayer_updates')
    .select('id, person_id, content, created_at, updated_at, is_answered')
    .in('person_id', personIds)
    .order('created_at', { ascending: true });
  return { data: result.data as MemberPrayerUpdateRow[] | null, error: result.error };
}

export async function fetchMemberPrayerUpdatesForPerson(
  client: SupabaseClient,
  personId: string
): Promise<{ data: MemberPrayerUpdateRow[] | null; error: unknown }> {
  const result = await client
    .from('member_prayer_updates')
    .select('id, person_id, content, created_at, updated_at, is_answered')
    .eq('person_id', personId)
    .order('created_at', { ascending: true });
  return { data: result.data as MemberPrayerUpdateRow[] | null, error: result.error };
}

export async function deleteMemberPrayerUpdateRow(
  client: SupabaseClient,
  updateId: string
): Promise<{ error: unknown }> {
  const result = await client.from('member_prayer_updates').delete().eq('id', updateId);
  return { error: result.error };
}

export async function updateMemberPrayerUpdateRow(
  client: SupabaseClient,
  updateId: string,
  updates: Partial<PrayerUpdate>
): Promise<{ error: unknown }> {
  const result = await client
    .from('member_prayer_updates')
    .update(buildMemberPrayerUpdatePatch(updates))
    .eq('id', updateId)
    .select();
  return { error: result.error };
}

export async function deleteCommunityPrayerRow(
  client: SupabaseClient,
  id: string
): Promise<{ error: unknown }> {
  const result = await client.from('prayers').delete().eq('id', id);
  return { error: result.error };
}

export async function deleteCommunityPrayerUpdateRow(
  client: SupabaseClient,
  updateId: string
): Promise<{ error: unknown }> {
  const result = await client.from('prayer_updates').delete().eq('id', updateId);
  return { error: result.error };
}

export async function insertPrayerDeletionRequestRow(
  client: SupabaseClient,
  requestData: PrayerDeletionRequestInput
): Promise<{ data: { id: string } | null; error: unknown }> {
  const result = await client
    .from('deletion_requests')
    .insert(buildPrayerDeletionRequestRow(requestData))
    .select('id')
    .single();
  return { data: result.data as { id: string } | null, error: result.error };
}

export async function fetchPrayerRowForDeletionNotify(
  client: SupabaseClient,
  prayerId: string
): Promise<{ data: { title?: string } | null; error: unknown }> {
  const result = await client
    .from('prayers')
    .select('title')
    .eq('id', prayerId)
    .single();
  return { data: result.data, error: result.error };
}

export async function insertUpdateDeletionRequestRow(
  client: SupabaseClient,
  requestData: UpdateDeletionRequestInput
): Promise<{ data: { id: string } | null; error: unknown }> {
  const result = await client
    .from('update_deletion_requests')
    .insert(buildUpdateDeletionRequestRow(requestData))
    .select('id')
    .single();
  return { data: result.data as { id: string } | null, error: result.error };
}

export async function fetchPrayerUpdateRowForDeletionNotify(
  client: SupabaseClient,
  updateId: string
): Promise<{
  data: {
    prayers?: { title?: string };
    author?: string;
    content?: string;
  } | null;
  error: unknown;
}> {
  const result = await client
    .from('prayer_updates')
    .select('*, prayers!inner(title)')
    .eq('id', updateId)
    .single();
  return {
    data: result.data as {
      prayers?: { title?: string };
      author?: string;
      content?: string;
    } | null,
    error: result.error,
  };
}
