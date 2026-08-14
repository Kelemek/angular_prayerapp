import type { HomeActiveFilter } from "../services/home-deep-link-host.adapter";

export function isCommunityPrayerFilter(
  filter: HomeActiveFilter
): filter is "current" | "answered" | "total" {
  return (
    filter === "current" || filter === "answered" || filter === "total"
  );
}
