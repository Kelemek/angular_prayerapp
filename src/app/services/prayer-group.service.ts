import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject, distinctUntilChanged, map } from 'rxjs';
import { messageFromFunctionsInvokeError } from '../lib/edge-function-invoke-error';
import {
  GROUP_PRAYER_CATALOG_CACHE_KEY,
  groupPrayerCatalogCacheMatchesViewer,
  type GroupPrayerCatalogSnapshot,
} from '../lib/prayer-group-catalog-load';
import { runGroupPrayerCatalogLoad } from '../lib/prayer-group-catalog-load-wire';
import { CacheService } from './cache.service';
import { SupabaseService } from './supabase.service';
import { UserSessionService } from './user-session.service';
import {
  isPrayerGroupsFeatureEnabled,
  prayerGroupCatalogSessionGateKey,
} from '../lib/prayer-groups-feature';

export interface PrayerGroupSummary {
  id: string;
  name: string;
  role: 'owner' | 'member';
  memberCount: number;
}

export interface PrayerGroupMemberRow {
  user_email: string;
  role: 'owner' | 'member';
  name: string | null;
}

export interface GroupPrayerRow {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  prayer_for: string;
  requester: string;
  email: string;
  status: 'current' | 'answered';
  date_requested: string;
  prayed_for_count: number;
  created_at: string;
  updated_at: string;
}

export interface GroupPrayerUpdateRow {
  id: string;
  group_prayer_id: string;
  content: string;
  author: string;
  author_email: string;
  mark_as_answered: boolean;
  created_at: string;
  updated_at: string;
}

type GroupMembershipListRow = {
  user_email?: string | null;
  role?: string | null;
  prayer_groups:
    | { id: string; name: string }
    | { id: string; name: string }[]
    | null;
};

/** One chip per group for the signed-in member. Membership reads include every member. */
export function prayerGroupSummariesForViewer(
  rows: GroupMembershipListRow[],
  viewerEmail: string,
): Array<Omit<PrayerGroupSummary, 'memberCount'>> {
  const want = viewerEmail.trim().toLowerCase();
  const byId = new Map<string, Omit<PrayerGroupSummary, 'memberCount'>>();
  for (const row of rows) {
    if ((row.user_email ?? '').trim().toLowerCase() !== want) continue;
    const group = Array.isArray(row.prayer_groups) ? row.prayer_groups[0] : row.prayer_groups;
    if (!group || byId.has(group.id)) continue;
    byId.set(group.id, {
      id: group.id,
      name: group.name,
      role: row.role === 'owner' ? 'owner' : 'member',
    });
  }
  return [...byId.values()];
}

type PrayerGroupMemberListRow = PrayerGroupMemberRow & { group_id: string };

@Injectable({ providedIn: 'root' })
export class PrayerGroupService {
  /** Reloads group prayers after a create, update, or delete. */
  readonly changed$ = new Subject<void>();
  /** Re-applies a pending `groupId` deep link without a full catalog reload. */
  readonly groupDeepLinkApply$ = new Subject<void>();
  /** Group chosen on the Groups tab, used when Request opens there. */
  preferredGroupId: string | null = null;
  /** Prayer id from `?prayerId=` while on the Group tab; applied when the catalog is ready. */
  pendingPrayerDeepLinkId: string | null = null;

  private readonly groupsSubject = new BehaviorSubject<PrayerGroupSummary[]>([]);
  private readonly prayersSubject = new BehaviorSubject<GroupPrayerRow[]>([]);
  private readonly updatesSubject = new BehaviorSubject<GroupPrayerUpdateRow[]>([]);
  private readonly loadingSubject = new BehaviorSubject<boolean>(true);
  private readonly errorSubject = new BehaviorSubject<string | null>(null);

  readonly groups$ = this.groupsSubject.asObservable();
  readonly prayers$ = this.prayersSubject.asObservable();
  readonly updates$ = this.updatesSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();

  private readonly membersByGroupId = new Map<string, PrayerGroupMemberRow[]>();
  private catalogLoadToken = 0;
  private catalogDbFetchComplete = false;
  private catalogOwnerEmail: string | null = null;
  private sessionWired = false;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly cache: CacheService,
    private readonly userSessionService: UserSessionService,
  ) {
    this.changed$.subscribe(() => {
      void this.loadCatalog(true);
    });
    this.wireSessionCatalogLoads();
  }

  getGroupsSnapshot(): PrayerGroupSummary[] {
    return this.groupsSubject.value;
  }

  getPrayersSnapshot(): GroupPrayerRow[] {
    return this.prayersSubject.value;
  }

  getUpdatesSnapshot(): GroupPrayerUpdateRow[] {
    return this.updatesSubject.value;
  }

  hasCatalogSnapshot(): boolean {
    return (
      this.catalogDbFetchComplete ||
      this.groupsSubject.value.length > 0 ||
      this.prayersSubject.value.length > 0
    );
  }

  async loadCatalog(silentRefresh = false): Promise<void> {
    if (
      !isPrayerGroupsFeatureEnabled(this.userSessionService.getCurrentSession())
    ) {
      this.catalogLoadToken += 1;
      this.cache.invalidate(GROUP_PRAYER_CATALOG_CACHE_KEY);
      this.groupsSubject.next([]);
      this.prayersSubject.next([]);
      this.updatesSubject.next([]);
      this.loadingSubject.next(false);
      this.catalogDbFetchComplete = false;
      return;
    }
    const token = ++this.catalogLoadToken;
    this.errorSubject.next(null);
    try {
      await runGroupPrayerCatalogLoad(
      {
        readCache: () => {
          const viewerEmail =
            this.userSessionService.getCurrentSession()?.email ?? null;
          const cached = this.cache.get<GroupPrayerCatalogSnapshot>(
            GROUP_PRAYER_CATALOG_CACHE_KEY,
          );
          if (!groupPrayerCatalogCacheMatchesViewer(cached, viewerEmail)) {
            if (cached) {
              this.cache.invalidate(GROUP_PRAYER_CATALOG_CACHE_KEY);
            }
            return null;
          }
          return cached;
        },
        writeCache: (snapshot) => {
          this.cache.set(GROUP_PRAYER_CATALOG_CACHE_KEY, snapshot);
        },
        invalidateCache: () => {
          this.cache.invalidate(GROUP_PRAYER_CATALOG_CACHE_KEY);
        },
        setLoading: (loading) => {
          if (token === this.catalogLoadToken) {
            this.loadingSubject.next(loading);
          }
        },
        markFetchComplete: () => {
          if (token === this.catalogLoadToken) {
            this.catalogDbFetchComplete = true;
          }
        },
        publishSnapshot: (snapshot) => {
          if (token !== this.catalogLoadToken) {
            return;
          }
          this.groupsSubject.next(snapshot.groups);
          this.prayersSubject.next(snapshot.prayers);
          this.updatesSubject.next(snapshot.updates);
          this.groupDeepLinkApply$.next();
        },
        fetchFromDb: () => this.fetchCatalogFromDb(),
      },
      silentRefresh,
    );
    } catch (err: unknown) {
      if (token !== this.catalogLoadToken) {
        return;
      }
      const cached = this.readCatalogCacheForCurrentViewer();
      if (cached) {
        this.publishCatalogSnapshot(cached);
        return;
      }
      this.errorSubject.next(
        err instanceof Error ? err.message : 'Could not load groups',
      );
      this.loadingSubject.next(false);
    }
  }

  private wireSessionCatalogLoads(): void {
    if (this.sessionWired) {
      return;
    }
    this.sessionWired = true;
    this.userSessionService.userSession$
      .pipe(
        map((session) => prayerGroupCatalogSessionGateKey(session)),
        distinctUntilChanged(),
      )
      .subscribe((gateKey) => {
        if (!gateKey) {
          this.resetSessionState();
          return;
        }
        const email = gateKey.slice(0, gateKey.lastIndexOf(':'));
        if (this.catalogOwnerEmail !== null && this.catalogOwnerEmail !== email) {
          this.resetSessionState();
        }
        void this.loadCatalog(false);
        this.catalogOwnerEmail = email;
      });
  }

  private readCatalogCacheForCurrentViewer(): GroupPrayerCatalogSnapshot | null {
    const viewerEmail = this.userSessionService.getCurrentSession()?.email ?? null;
    const cached = this.cache.get<GroupPrayerCatalogSnapshot>(
      GROUP_PRAYER_CATALOG_CACHE_KEY,
    );
    if (!groupPrayerCatalogCacheMatchesViewer(cached, viewerEmail)) {
      return null;
    }
    return cached;
  }

  private async fetchCatalogFromDb(): Promise<GroupPrayerCatalogSnapshot> {
    const client = await this.supabase.db();
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    const viewerEmail = sessionData.session?.user?.email?.trim().toLowerCase() ?? '';
    if (sessionError || !viewerEmail) {
      throw sessionError ?? new Error('Not signed in');
    }
    const groups = await this.listGroups();
    const prayers = await this.listAllPrayers();
    const updates = await this.listUpdates(prayers.map((prayer) => prayer.id));
    return { viewerEmail, groups, prayers, updates };
  }

  private publishCatalogSnapshot(snapshot: GroupPrayerCatalogSnapshot): void {
    this.groupsSubject.next(snapshot.groups);
    this.prayersSubject.next(snapshot.prayers);
    this.updatesSubject.next(snapshot.updates);
  }

  /** Members from the latest listGroups() or listMembers() for this group. */
  membersForGroup(groupId: string): PrayerGroupMemberRow[] | undefined {
    return this.membersByGroupId.get(groupId);
  }

  notifyChanged(): void {
    this.cache.invalidate(GROUP_PRAYER_CATALOG_CACHE_KEY);
    this.changed$.next();
  }

  /** After a membership or group-structure write, bypass stale cache before reload. */
  async refreshCatalogAfterWrite(): Promise<void> {
    this.cache.invalidate(GROUP_PRAYER_CATALOG_CACHE_KEY);
    await this.loadCatalog(true);
  }

  notifyGroupDeepLinkPending(): void {
    this.groupDeepLinkApply$.next();
  }

  /** Clears in-memory membership cache when the signed-in account changes. */
  resetSessionState(): void {
    this.catalogLoadToken += 1;
    this.membersByGroupId.clear();
    this.preferredGroupId = null;
    this.pendingPrayerDeepLinkId = null;
    this.catalogDbFetchComplete = false;
    this.catalogOwnerEmail = null;
    this.publishCatalogSnapshot({
      viewerEmail: '',
      groups: [],
      prayers: [],
      updates: [],
    });
    this.loadingSubject.next(true);
    this.errorSubject.next(null);
    this.cache.invalidate(GROUP_PRAYER_CATALOG_CACHE_KEY);
  }

  async listGroups(): Promise<PrayerGroupSummary[]> {
    const client = await this.supabase.db();
    // Local session only. auth.getUser() calls the Auth server while holding the
    // client lock, so a reload after create never finished and the button stayed
    // on "Creating…".
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    const viewerEmail = sessionData.session?.user?.email?.trim().toLowerCase() ?? '';
    if (sessionError || !viewerEmail) {
      throw sessionError ?? new Error('Not signed in');
    }
    const { data: memberships, error } = await client
      .from('prayer_group_members')
      .select('group_id, user_email, role, prayer_groups(id, name)')
      .eq('is_active', true)
      .eq('user_email', viewerEmail)
      .order('display_order', { ascending: true });
    if (error) throw error;

    const groups = prayerGroupSummariesForViewer(
      (memberships ?? []) as GroupMembershipListRow[],
      viewerEmail,
    ).map((group) => ({ ...group, memberCount: 0 }));

    if (groups.length === 0) {
      this.membersByGroupId.clear();
      return [];
    }

    const groupIds = groups.map((group) => group.id);
    const { data: memberRows, error: membersError } = await client
      .from('prayer_group_members')
      .select('group_id, user_email, role, name')
      .in('group_id', groupIds)
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    if (membersError) throw membersError;

    this.membersByGroupId.clear();
    const tally = new Map<string, number>();
    for (const groupId of groupIds) {
      this.membersByGroupId.set(groupId, []);
      tally.set(groupId, 0);
    }
    for (const row of (memberRows ?? []) as PrayerGroupMemberListRow[]) {
      const list = this.membersByGroupId.get(row.group_id) ?? [];
      list.push({
        user_email: row.user_email,
        role: row.role,
        name: row.name,
      });
      this.membersByGroupId.set(row.group_id, list);
      tally.set(row.group_id, (tally.get(row.group_id) ?? 0) + 1);
    }
    return groups.map((group) => ({
      ...group,
      memberCount: tally.get(group.id) ?? 0,
    }));
  }

  async listMembers(groupId: string): Promise<PrayerGroupMemberRow[]> {
    const client = await this.supabase.db();
    const { data, error } = await client
      .from('prayer_group_members')
      .select('user_email, role, name')
      .eq('group_id', groupId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    if (error) throw error;
    const rows = (data ?? []) as PrayerGroupMemberRow[];
    this.membersByGroupId.set(groupId, rows);
    return rows;
  }

  async listPrayers(groupId: string): Promise<GroupPrayerRow[]> {
    const client = await this.supabase.db();
    const { data, error } = await client
      .from('group_prayers')
      .select(
        'id, group_id, title, description, prayer_for, requester, email, status, date_requested, prayed_for_count, created_at, updated_at',
      )
      .eq('group_id', groupId)
      .order('date_requested', { ascending: false });
    if (error) throw error;
    return (data ?? []) as GroupPrayerRow[];
  }

  async createGroup(name: string): Promise<string> {
    const client = await this.supabase.db();
    const { data, error } = await client.rpc('create_prayer_group', { p_name: name });
    if (error) throw error;
    await this.refreshCatalogAfterWrite();
    return data as string;
  }

  async invite(groupId: string, email: string): Promise<{ emailError: string | null }> {
    const client = await this.supabase.db();
    const { error } = await client.rpc('invite_prayer_group_member', {
      p_group_id: groupId,
      p_email: email,
    });
    if (error) throw error;
    const { error: notifyError } = await client.functions.invoke('notify-group-activity', {
      body: { kind: 'invite', groupId, email },
    });
    if (!notifyError) {
      return { emailError: null };
    }
    return {
      emailError: await messageFromFunctionsInvokeError(
        notifyError,
        'Added to the group, but the invitation email could not be sent',
      ),
    };
  }

  async leave(groupId: string): Promise<boolean> {
    const client = await this.supabase.db();
    const { data, error } = await client.rpc('leave_prayer_group', { p_group_id: groupId });
    if (error) throw error;
    await this.refreshCatalogAfterWrite();
    return data === true;
  }

  async transfer(groupId: string, email: string): Promise<void> {
    const client = await this.supabase.db();
    const { error } = await client.rpc('transfer_prayer_group_ownership', {
      p_group_id: groupId,
      p_new_owner_email: email,
    });
    if (error) throw error;
    await this.refreshCatalogAfterWrite();
  }

  async completeMemberProfile(firstName: string, lastName: string): Promise<void> {
    const first = firstName.trim();
    const last = lastName.trim();
    if (!first || !last) {
      throw new Error('Please enter your first and last name');
    }
    const fullName = `${first} ${last}`;
    const client = await this.supabase.db();
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    const email = sessionData.session?.user?.email?.trim().toLowerCase() ?? '';
    if (sessionError || !email) {
      throw sessionError ?? new Error('Not signed in');
    }
    const { error: rpcError } = await client.rpc('set_prayer_group_member_name', {
      p_name: fullName,
    });
    if (rpcError) throw rpcError;
    const { error: updateError } = await client
      .from('email_subscribers')
      .update({ name: fullName })
      .eq('email', email);
    if (updateError) throw updateError;
  }

  async addPrayer(input: {
    groupId: string;
    title: string;
    prayerFor: string;
    description: string;
    requester: string;
    email: string;
  }): Promise<void> {
    const client = await this.supabase.db();
    const { error } = await client.from('group_prayers').insert({
      group_id: input.groupId,
      title: input.title,
      prayer_for: input.prayerFor,
      description: input.description,
      requester: input.requester,
      email: input.email,
    });
    if (error) throw error;
    this.notifyChanged();
    await client.functions.invoke('notify-group-activity', {
      body: { kind: 'prayer_added', groupId: input.groupId, title: input.title },
    });
  }

  async listAllPrayers(): Promise<GroupPrayerRow[]> {
    const client = await this.supabase.db();
    const { data, error } = await client
      .from('group_prayers')
      .select(
        'id, group_id, title, description, prayer_for, requester, email, status, date_requested, prayed_for_count, created_at, updated_at',
      )
      .order('date_requested', { ascending: false });
    if (error) throw error;
    return (data ?? []) as GroupPrayerRow[];
  }

  async renameGroup(groupId: string, name: string): Promise<void> {
    const client = await this.supabase.db();
    const { error } = await client.rpc('rename_prayer_group', {
      p_group_id: groupId,
      p_name: name,
    });
    if (error) throw error;
    await this.refreshCatalogAfterWrite();
  }

  async deleteGroup(groupId: string): Promise<void> {
    const client = await this.supabase.db();
    const { error } = await client.rpc('delete_prayer_group', { p_group_id: groupId });
    if (error) throw error;
    await this.refreshCatalogAfterWrite();
  }

  async removeMember(groupId: string, email: string): Promise<void> {
    const client = await this.supabase.db();
    const { error } = await client.rpc('remove_prayer_group_member', {
      p_group_id: groupId,
      p_email: email,
    });
    if (error) throw error;
    await this.refreshCatalogAfterWrite();
  }

  async listUpdates(prayerIds: string[]): Promise<GroupPrayerUpdateRow[]> {
    if (prayerIds.length === 0) return [];
    const client = await this.supabase.db();
    const { data, error } = await client
      .from('group_prayer_updates')
      .select(
        'id, group_prayer_id, content, author, author_email, mark_as_answered, created_at, updated_at',
      )
      .in('group_prayer_id', prayerIds)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []) as GroupPrayerUpdateRow[];
  }

  async setAnswered(prayerId: string, answered: boolean): Promise<void> {
    const client = await this.supabase.db();
    const { error } = await client
      .from('group_prayers')
      .update({
        status: answered ? 'answered' : 'current',
        date_answered: answered ? new Date().toISOString() : null,
      })
      .eq('id', prayerId);
    if (error) throw error;
    this.notifyChanged();
  }

  async updatePrayer(prayerId: string, prayerFor: string, description: string): Promise<void> {
    const client = await this.supabase.db();
    const { error } = await client
      .from('group_prayers')
      .update({
        prayer_for: prayerFor,
        title: `Prayer for ${prayerFor}`,
        description,
      })
      .eq('id', prayerId);
    if (error) throw error;
    this.notifyChanged();
  }

  async deletePrayer(prayerId: string): Promise<void> {
    const client = await this.supabase.db();
    const { error } = await client.from('group_prayers').delete().eq('id', prayerId);
    if (error) throw error;
    this.notifyChanged();
  }

  async addUpdate(input: {
    prayerId: string;
    content: string;
    author: string;
    authorEmail: string;
    markAsAnswered: boolean;
  }): Promise<void> {
    const client = await this.supabase.db();
    const { error } = await client.from('group_prayer_updates').insert({
      group_prayer_id: input.prayerId,
      content: input.content,
      author: input.author,
      author_email: input.authorEmail,
      mark_as_answered: input.markAsAnswered,
    });
    if (error) throw error;
    this.notifyChanged();
  }

  async deleteUpdate(updateId: string): Promise<void> {
    const client = await this.supabase.db();
    const { error } = await client.from('group_prayer_updates').delete().eq('id', updateId);
    if (error) throw error;
    this.notifyChanged();
  }

  async updateUpdate(updateId: string, content: string): Promise<void> {
    const client = await this.supabase.db();
    const { error } = await client
      .from('group_prayer_updates')
      .update({ content })
      .eq('id', updateId);
    if (error) throw error;
    this.notifyChanged();
  }

  async reorderGroups(groupIds: string[]): Promise<void> {
    const client = await this.supabase.db();
    const { error } = await client.rpc('reorder_prayer_groups', {
      p_ordered_group_ids: groupIds,
    });
    if (error) throw error;
    await this.refreshCatalogAfterWrite();
  }
}
