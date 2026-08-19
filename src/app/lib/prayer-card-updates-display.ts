import type { PrayerUpdateRecord } from './prayer-update-header';

export function sortPrayerUpdatesByCreatedAt(
  updates: PrayerUpdateRecord[]
): PrayerUpdateRecord[] {
  return [...updates].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function getDisplayedPrayerCardUpdates(
  updates: PrayerUpdateRecord[],
  showAllUpdates: boolean
): PrayerUpdateRecord[] {
  if (updates.length === 0) return [];

  const sortedUpdates = sortPrayerUpdatesByCreatedAt(updates);

  if (showAllUpdates) return sortedUpdates;

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const recentUpdates = sortedUpdates.filter(
    (update) =>
      new Date(update.created_at).getTime() > oneWeekAgo.getTime()
  );

  return recentUpdates.length > 0 ? recentUpdates : sortedUpdates.slice(0, 1);
}

export function shouldShowPrayerCardUpdatesToggle(
  allUpdates: PrayerUpdateRecord[],
  displayedUpdates: PrayerUpdateRecord[],
  showAllUpdates: boolean
): boolean {
  if (allUpdates.length === 0) return false;
  return displayedUpdates.length < allUpdates.length || showAllUpdates;
}
