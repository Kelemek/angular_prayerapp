import type { PrayerFilters, PrayerRequest } from './prayer-types';

/** Matches `PrayerService.applyFilters` — community catalog filters. */
export function applyPrayerCatalogFilters(
  prayers: PrayerRequest[],
  filters: PrayerFilters
): PrayerRequest[] {
  let filtered = prayers;

  if (filters.status) {
    filtered = filtered.filter((p) => p.status === filters.status);
  }

  if (filters.type === 'prompt') {
    filtered = filtered.filter((p) => p.type === 'prompt');
  }

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter((p) => {
      const prayerMatch =
        p.title.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower) ||
        p.requester.toLowerCase().includes(searchLower);

      const updateMatch =
        p.updates &&
        p.updates.length > 0 &&
        p.updates.some(
          (update) => update.content && update.content.toLowerCase().includes(searchLower)
        );

      return prayerMatch || updateMatch;
    });
  }

  if (filters.category) {
    filtered = filtered.filter((p) => p.category === filters.category);
  }

  return filtered;
}

/** Matches `PrayerService.getFilteredPrayers` — status + search (includes prayer_for). */
export function filterPrayerRequestsByStatusAndSearch(
  prayers: PrayerRequest[],
  filters: PrayerFilters
): PrayerRequest[] {
  let filtered = prayers;

  if (filters.status) {
    filtered = filtered.filter((p) => p.status === filters.status);
  }

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter((p) => {
      const prayerMatch =
        p.title.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower) ||
        p.requester.toLowerCase().includes(searchLower) ||
        p.prayer_for.toLowerCase().includes(searchLower);

      const updateMatch =
        p.updates &&
        p.updates.length > 0 &&
        p.updates.some(
          (update) => update.content && update.content.toLowerCase().includes(searchLower)
        );

      return prayerMatch || updateMatch;
    });
  }

  return filtered;
}
