import type { PrayerRequest } from './prayer-types';

export function sortPrayersByLatestActivity(prayers: PrayerRequest[]): PrayerRequest[] {
  return prayers
    .map((prayer) => ({
      prayer,
      latestActivity: Math.max(
        new Date(prayer.created_at).getTime(),
        prayer.updates.length > 0 ? new Date(prayer.updates[0].created_at).getTime() : 0
      ),
    }))
    .sort((a, b) => b.latestActivity - a.latestActivity)
    .map(({ prayer }) => prayer);
}

/** Map approved community prayers from Supabase join rows (loadPrayers query). */
export function formatApprovedCommunityPrayersFromDb(
  prayersData: Record<string, unknown>[]
): PrayerRequest[] {
  const formatted = (prayersData || []).map((prayer) => {
    const updates = ((prayer['prayer_updates'] as unknown[]) || [])
      .filter((u) => u && (u as { approval_status?: string }).approval_status === 'approved')
      .sort(
        (a, b) =>
          new Date((b as { created_at: string }).created_at).getTime() -
          new Date((a as { created_at: string }).created_at).getTime()
      );

    return {
      id: prayer['id'] as string,
      title: prayer['title'] as string,
      description: (prayer['description'] as string) || 'No description provided',
      status: prayer['status'] as PrayerRequest['status'],
      requester: prayer['requester'] as string,
      prayer_for: prayer['prayer_for'] as string,
      email: prayer['email'] as string | null | undefined,
      is_anonymous: prayer['is_anonymous'] as boolean | undefined,
      type: prayer['type'] as PrayerRequest['type'],
      date_requested: prayer['date_requested'] as string,
      date_answered: prayer['date_answered'] as string | null | undefined,
      created_at: prayer['created_at'] as string,
      updated_at: prayer['updated_at'] as string,
      last_reminder_sent: prayer['last_reminder_sent'] as string | null | undefined,
      prayed_for_count: (prayer['prayed_for_count'] as number | undefined) ?? 0,
      updates: updates.map((u) => ({
        id: (u as { id: string }).id,
        prayer_id: (u as { prayer_id: string }).prayer_id,
        content: (u as { content: string }).content,
        author: (u as { author: string }).author,
        is_anonymous: (u as { is_anonymous?: boolean }).is_anonymous,
        created_at: (u as { created_at: string }).created_at,
      })),
    } as PrayerRequest;
  });

  return sortPrayersByLatestActivity(formatted);
}

/** Archive timeline month query: all embedded updates, sorted by latest activity. */
export function formatPrayersByMonthFromDb(
  prayersData: Record<string, unknown>[]
): PrayerRequest[] {
  const formatted = (prayersData || []).map((prayer) => {
    const row = prayer as unknown as PrayerRequest & {
      prayer_updates?: PrayerRequest['updates'];
    };
    return {
      ...row,
      updates: row.prayer_updates || row.updates || [],
    } as PrayerRequest;
  });
  return sortPrayersByLatestActivity(formatted);
}

export const COMMUNITY_PRAYERS_WITH_UPDATES_SELECT = `
  *,
  prayer_updates!prayer_updates_prayer_id_fkey(*)
`;

export function prayersByMonthIsoRange(
  year: number,
  month: number
): { startDate: string; endDate: string } {
  return {
    startDate: new Date(year, month - 1, 1).toISOString(),
    endDate: new Date(year, month, 1).toISOString(),
  };
}

export function prayersByMonthOrFilter(startDate: string, endDate: string): string {
  return `(updated_at.gte.${startDate},updated_at.lt.${endDate}),(created_at.gte.${startDate},created_at.lt.${endDate})`;
}
