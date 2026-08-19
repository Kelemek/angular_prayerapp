export const MEMBER_PRAYED_FOR_COUNTS_CACHE_KEY = 'memberPrayedForCounts';

export type MemberPrayedForCountRow = {
  person_id: string;
  prayed_for_count: number | null;
};

export function memberPrayedForCountsFromRows(
  rows: MemberPrayedForCountRow[]
): Record<string, number> {
  const countsMap: Record<string, number> = {};
  rows.forEach((row) => {
    countsMap[row.person_id] = row.prayed_for_count ?? 0;
  });
  return countsMap;
}

export function mergeMemberPrayedForCountIntoMap(
  map: Record<string, number>,
  personId: string,
  count: number
): Record<string, number> {
  return { ...map, [personId]: count };
}

export function readMemberPrayedForCountsCache(
  cached: Record<string, number> | null | undefined
): Record<string, number> {
  return cached ?? {};
}

export function writeMemberPrayedForCountToCache(
  cached: Record<string, number> | null | undefined,
  personId: string,
  count: number
): Record<string, number> {
  return mergeMemberPrayedForCountIntoMap(
    readMemberPrayedForCountsCache(cached),
    personId,
    count
  );
}
