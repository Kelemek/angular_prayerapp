import type { PresentationTimeFilter } from "../types/presentation";

/** Start of the presentation time window, or `null` when filter is `all`. */
export function presentationTimeFilterStartDate(
  filter: PresentationTimeFilter,
  now: Date = new Date()
): Date | null {
  if (filter === "all") {
    return null;
  }

  const startDate = new Date(now);
  switch (filter) {
    case "week":
      startDate.setDate(now.getDate() - 7);
      break;
    case "twoweeks":
      startDate.setDate(now.getDate() - 14);
      break;
    case "month":
      startDate.setMonth(now.getMonth() - 1);
      break;
    case "year":
      startDate.setFullYear(now.getFullYear() - 1);
      break;
    default: {
      const _exhaustive: never = filter;
      return _exhaustive;
    }
  }
  return startDate;
}

export type PresentationTimeFilterablePrayer = {
  created_at: string;
  updates?: Array<{ created_at: string }>;
};

/** True when prayer creation or any update falls inside `[startDate, endDate]`. */
export function prayerHasActivityInTimeWindow(
  prayer: PresentationTimeFilterablePrayer,
  startDate: Date,
  endDate: Date = new Date()
): boolean {
  const start = startDate.getTime();
  const end = endDate.getTime();
  const created = new Date(prayer.created_at).getTime();
  if (created >= start && created <= end) {
    return true;
  }
  return (prayer.updates ?? []).some((update) => {
    const updateTime = new Date(update.created_at).getTime();
    return updateTime >= start && updateTime <= end;
  });
}

export function filterPrayersByPresentationTimeFilter<
  T extends PresentationTimeFilterablePrayer,
>(prayers: T[], timeFilter: PresentationTimeFilter, now: Date = new Date()): T[] {
  const startDate = presentationTimeFilterStartDate(timeFilter, now);
  if (!startDate) {
    return prayers;
  }
  return prayers.filter((prayer) =>
    prayerHasActivityInTimeWindow(prayer, startDate, now)
  );
}
