import type { PrayerRequest, PrayerUpdate } from './prayer-types';
import type { GroupPrayerRow, GroupPrayerUpdateRow } from '../services/prayer-group.service';

export type GroupFilterMode = 'current' | 'answered' | 'total' | 'named';

export function countGroupPrayersByStatus(prayers: GroupPrayerRow[]): {
  current: number;
  answered: number;
  total: number;
} {
  let current = 0;
  let answered = 0;
  for (const prayer of prayers) {
    if (prayer.status === 'answered') answered += 1;
    else current += 1;
  }
  return { current, answered, total: prayers.length };
}

export function countPrayersInGroup(prayers: GroupPrayerRow[], groupId: string): number {
  return prayers.filter((prayer) => prayer.group_id === groupId).length;
}

export function groupPrayerCardModel(
  row: GroupPrayerRow,
  updates: GroupPrayerUpdateRow[],
): PrayerRequest {
  const prayerFor = row.prayer_for.trim() || row.title;
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    status: row.status,
    requester: row.requester,
    prayer_for: prayerFor,
    email: row.email,
    date_requested: row.date_requested,
    prayed_for_count: row.prayed_for_count ?? 0,
    created_at: row.created_at || row.date_requested,
    updated_at: row.updated_at || row.date_requested,
    updates: updates.map(
      (update): PrayerUpdate => ({
        id: update.id,
        prayer_id: row.id,
        content: update.content,
        author: update.author,
        author_email: update.author_email,
        created_at: update.created_at,
        updated_at: update.updated_at,
        mark_as_answered: update.mark_as_answered,
        is_answered: update.mark_as_answered,
      }),
    ),
  };
}

export function filterGroupPrayersForHome(
  prayers: GroupPrayerRow[],
  mode: GroupFilterMode,
  selectedGroupId: string | null,
): GroupPrayerRow[] {
  switch (mode) {
    case 'current':
      return prayers.filter((prayer) => prayer.status !== 'answered');
    case 'answered':
      return prayers.filter((prayer) => prayer.status === 'answered');
    case 'total':
      return prayers;
    case 'named':
      return selectedGroupId
        ? prayers.filter((prayer) => prayer.group_id === selectedGroupId)
        : prayers;
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

function compareGroupPrayerDateDesc(a: GroupPrayerRow, b: GroupPrayerRow): number {
  const aTime = Date.parse(a.date_requested) || 0;
  const bTime = Date.parse(b.date_requested) || 0;
  return bTime - aTime;
}

/** Current / Answered / Total lists follow chip order, then newest first within each group. */
export function sortGroupPrayersForDisplay(
  prayers: GroupPrayerRow[],
  groupOrder: readonly { id: string }[],
  mode: GroupFilterMode,
): GroupPrayerRow[] {
  if (mode === 'named' || prayers.length <= 1) {
    return [...prayers].sort(compareGroupPrayerDateDesc);
  }

  const orderIndex = new Map(groupOrder.map((group, index) => [group.id, index]));
  return [...prayers].sort((a, b) => {
    const aIndex = orderIndex.get(a.group_id) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = orderIndex.get(b.group_id) ?? Number.MAX_SAFE_INTEGER;
    if (aIndex !== bIndex) return aIndex - bIndex;
    return compareGroupPrayerDateDesc(a, b);
  });
}

export function groupPrayersForHomeView(
  prayers: GroupPrayerRow[],
  mode: GroupFilterMode,
  selectedGroupId: string | null,
  groupOrder: readonly { id: string }[],
): GroupPrayerRow[] {
  const filtered = filterGroupPrayersForHome(prayers, mode, selectedGroupId);
  return sortGroupPrayersForDisplay(filtered, groupOrder, mode);
}
