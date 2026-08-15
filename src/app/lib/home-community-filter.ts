import type { HomeActiveFilter } from "../services/home-deep-link-host.adapter";

export function isCommunityPrayerFilter(
  filter: HomeActiveFilter
): filter is "current" | "answered" | "total" {
  return (
    filter === "current" || filter === "answered" || filter === "total"
  );
}

/** True when Home renders a sub-filter chip row directly under the main tab row. */
export function homeHasSubFilterRowBelowTabs(
  filter: HomeActiveFilter,
  promptsCount: number
): boolean {
  return (
    isCommunityPrayerFilter(filter) ||
    filter === "personal" ||
    filter === "memorize" ||
    (filter === "prompts" && promptsCount > 0)
  );
}
