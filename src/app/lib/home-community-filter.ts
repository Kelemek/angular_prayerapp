import type { HomeActiveFilter } from "../services/home-deep-link-host.adapter";

export type CommunityPrayerFilter =
  | "current"
  | "answered"
  | "archived"
  | "total";

export function isCommunityPrayerFilter(
  filter: HomeActiveFilter
): filter is CommunityPrayerFilter {
  return (
    filter === "current" ||
    filter === "answered" ||
    filter === "archived" ||
    filter === "total"
  );
}

export type PublicTabFilter = CommunityPrayerFilter | "planning_center_list";

/** True when the Church folder tab is selected (community prayers or Members). */
export function isPublicTabFilter(
  filter: HomeActiveFilter
): filter is PublicTabFilter {
  return isCommunityPrayerFilter(filter) || filter === "planning_center_list";
}

/** True when the Church top tab or its sub-chips (including Prompts) are active. */
export function isPublicAreaFilter(filter: HomeActiveFilter): boolean {
  return isPublicTabFilter(filter) || filter === "prompts";
}

/** True when Home renders a folder-tab panel (sub-filters) directly under the main tab row. */
export function homeHasSubFilterRowBelowTabs(
  filter: HomeActiveFilter
): boolean {
  return (
    isPublicAreaFilter(filter) ||
    filter === "personal" ||
    filter === "memorize"
  );
}
