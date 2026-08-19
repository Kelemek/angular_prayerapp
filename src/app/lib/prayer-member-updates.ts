import type { PrayerUpdate } from './prayer-types';

export const MEMBER_PRAYER_UPDATES_CACHE_KEY = 'memberPrayerUpdates';

export type MemberPrayerUpdateRow = {
  id: string;
  person_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_answered: boolean | null;
};

export type MemberPrayerUpdate = {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_answered: boolean | null;
};

export function mapMemberPrayerUpdateRow(row: MemberPrayerUpdateRow): MemberPrayerUpdate {
  return {
    id: row.id,
    content: row.content,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_answered: row.is_answered,
  };
}

export function groupMemberPrayerUpdatesByPersonId(
  rows: MemberPrayerUpdateRow[]
): Record<string, MemberPrayerUpdate[]> {
  const updatesMap: Record<string, MemberPrayerUpdate[]> = {};
  rows.forEach((row) => {
    if (!updatesMap[row.person_id]) {
      updatesMap[row.person_id] = [];
    }
    updatesMap[row.person_id].push(mapMemberPrayerUpdateRow(row));
  });
  return updatesMap;
}

export function buildMemberPrayerUpdatePatch(
  updates: Partial<PrayerUpdate>
): Record<string, unknown> {
  const updateData: Record<string, unknown> = {};
  if (updates.content) {
    updateData['content'] = updates.content;
  }
  if (updates.is_answered !== undefined) {
    updateData['is_answered'] = updates.is_answered;
  }
  return updateData;
}

export function trimMemberPersonId(personId: string): string | null {
  const trimmed = personId?.trim();
  return trimmed || null;
}

export function buildMemberPrayerUpdateInsertRow(
  personId: string,
  content: string,
  isAnswered: boolean
): Record<string, unknown> {
  return {
    person_id: personId,
    content,
    is_answered: isAnswered,
  };
}

export function planningCenterListDataCacheKey(listId: string): string {
  return `planningCenterListData_${listId}`;
}

export function memberPrayerCacheKeysToInvalidate(listId?: string): string[] {
  const keys = [MEMBER_PRAYER_UPDATES_CACHE_KEY];
  if (listId) {
    keys.push(planningCenterListDataCacheKey(listId));
  }
  return keys;
}

export function memberUpdatesCacheForPerson(
  cached: Record<string, MemberPrayerUpdate[]> | undefined,
  personId: string
): MemberPrayerUpdate[] | undefined {
  return cached?.[personId];
}

export function writeMemberUpdatesCacheForPerson(
  cached: Record<string, MemberPrayerUpdate[]> | undefined,
  personId: string,
  updates: MemberPrayerUpdate[]
): Record<string, MemberPrayerUpdate[]> {
  return { ...(cached ?? {}), [personId]: updates };
}
