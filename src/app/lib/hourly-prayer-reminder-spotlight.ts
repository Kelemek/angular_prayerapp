/**
 * Hourly Settings prayer spotlight pool (unit-tested).
 * Duplicated in send-user-hourly-prayer-reminders/index.ts — keep in sync.
 */

export interface HourlyPrayerSpotlightCandidate {
  key: string;
  title: string;
  prayerFor: string;
  requester: string;
  description: string;
  kindLabel: string;
}

export function communityRequesterForSpotlight(
  isAnonymous: boolean | null | undefined,
  requester: string | null | undefined,
): string {
  if (isAnonymous === true) {
    return 'Anonymous';
  }
  return requester?.trim() ? requester : '';
}

export function buildHourlyPrayerSpotlightCandidates(input: {
  includeCommunity: boolean;
  communityRows: ReadonlyArray<{
    id: string;
    title: string | null;
    description: string | null;
    prayer_for: string | null;
    requester: string | null;
    is_anonymous: boolean | null;
  }>;
  personalRows: ReadonlyArray<{
    id: string;
    title: string | null;
    description: string | null;
    prayer_for: string | null;
    category: string | null;
  }>;
  groupRows: ReadonlyArray<{
    id: string;
    title: string | null;
    description: string | null;
    prayer_for: string | null;
    requester: string | null;
    is_anonymous: boolean | null;
  }>;
}): HourlyPrayerSpotlightCandidate[] {
  const candidates: HourlyPrayerSpotlightCandidate[] = [];

  if (input.includeCommunity) {
    for (const row of input.communityRows) {
      candidates.push({
        key: `c:${row.id}`,
        title: row.title ?? '',
        prayerFor: row.prayer_for ?? '',
        requester: communityRequesterForSpotlight(row.is_anonymous, row.requester),
        description: row.description ?? '',
        kindLabel: 'Community prayer',
      });
    }
  }

  for (const row of input.personalRows) {
    if (row.category === 'Answered') continue;
    candidates.push({
      key: `p:${row.id}`,
      title: row.title ?? '',
      prayerFor: row.prayer_for ?? '',
      requester: 'Me',
      description: row.description ?? '',
      kindLabel: 'Personal prayer',
    });
  }

  for (const row of input.groupRows) {
    candidates.push({
      key: `g:${row.id}`,
      title: row.title ?? '',
      prayerFor: row.prayer_for ?? '',
      requester: communityRequesterForSpotlight(row.is_anonymous, row.requester),
      description: row.description ?? '',
      kindLabel: 'Group prayer',
    });
  }

  return candidates;
}

export function pickHourlyPrayerSpotlightCandidate(
  candidates: HourlyPrayerSpotlightCandidate[],
  excludeKey: string | null,
): HourlyPrayerSpotlightCandidate | null {
  if (candidates.length === 0) return null;
  let pool = candidates;
  if (excludeKey && candidates.length > 1) {
    const filtered = candidates.filter((c) => c.key !== excludeKey);
    if (filtered.length > 0) pool = filtered;
  }
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx] ?? null;
}
