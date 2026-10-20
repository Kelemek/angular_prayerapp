import { groupPrayerCardModel } from './home-group-catalog';
import { filterPresentationCommunityPrayers } from './presentation-content-filter';
import { groupPrayerUpdatesByPrayerId } from './prayer-group-catalog-load';
import type { PrayerRequest } from './prayer-types';
import type {
  GroupPrayerRow,
  GroupPrayerUpdateRow,
  PrayerGroupSummary,
} from '../services/prayer-group.service';
import type {
  PresentationStatusFilters,
  PresentationTimeFilter,
} from '../types/presentation';

export function buildPresentationGroupPrayerCards(
  groups: PrayerGroupSummary[],
  prayers: GroupPrayerRow[],
  updates: GroupPrayerUpdateRow[],
): PrayerRequest[] {
  const nameByGroupId = new Map(groups.map((group) => [group.id, group.name]));
  const updatesByPrayerId = groupPrayerUpdatesByPrayerId(updates);
  return prayers.map((row) =>
    groupPrayerCardModel(
      row,
      updatesByPrayerId.get(row.id) ?? [],
      nameByGroupId.get(row.group_id) ?? null,
    ),
  );
}

export function filterPresentationGroupPrayers(
  prayers: PrayerRequest[],
  options: {
    timeFilter: PresentationTimeFilter;
    statusFilters: PresentationStatusFilters;
    now?: Date;
  },
): PrayerRequest[] {
  return filterPresentationCommunityPrayers(prayers, options);
}
