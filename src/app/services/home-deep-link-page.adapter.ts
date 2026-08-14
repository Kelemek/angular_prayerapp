import type { PrayerFilters } from "../components/prayer-filters/prayer-filters.component";
import type { HomeDeepLinkPageState, HomeActiveFilter } from "./home-deep-link-host.adapter";
import type { HomePersonalCategoryController } from "./home-personal-category.controller";
import type { HomePlanningCenterController } from "./home-planning-center.controller";

export interface HomeDeepLinkPageSource {
  getActiveFilter(): HomeActiveFilter;
  setActiveFilter(filter: HomeActiveFilter): void;
  getFilters(): PrayerFilters;
  setFilters(filters: PrayerFilters): void;
  getSelectedPromptTypes(): string[];
  setSelectedPromptTypes(types: string[]): void;
  personalCategory: HomePersonalCategoryController;
  planningCenter: HomePlanningCenterController;
}

export function createHomeDeepLinkPageState(
  source: HomeDeepLinkPageSource
): HomeDeepLinkPageState {
  return {
    get activeFilter() {
      return source.getActiveFilter();
    },
    set activeFilter(value: HomeActiveFilter) {
      source.setActiveFilter(value);
    },
    get filters() {
      return source.getFilters();
    },
    set filters(value: PrayerFilters) {
      source.setFilters(value);
    },
    get selectedPromptTypes() {
      return source.getSelectedPromptTypes();
    },
    set selectedPromptTypes(value: string[]) {
      source.setSelectedPromptTypes(value);
    },
    get personalCategoryFilterMode() {
      return source.personalCategory.personalCategoryFilterMode;
    },
    set personalCategoryFilterMode(value) {
      source.personalCategory.personalCategoryFilterMode = value;
    },
    get selectedPersonalCategories() {
      return source.personalCategory.selectedPersonalCategories;
    },
    set selectedPersonalCategories(value: string[]) {
      source.personalCategory.selectedPersonalCategories = value;
    },
    get filteredPlanningCenterPrayers() {
      return source.planningCenter.filteredPlanningCenterPrayers;
    },
    get loadingPlanningCenterList() {
      return source.planningCenter.loadingPlanningCenterList;
    },
    get loadingMemberPrayers() {
      return source.planningCenter.loadingMemberPrayers;
    },
    get planningCenterListResolved() {
      return source.planningCenter.planningCenterListResolved;
    },
    get planningCenterListId() {
      return source.planningCenter.planningCenterListId;
    },
    get planningCenterListMembers() {
      return source.planningCenter.planningCenterListMembers;
    },
    get memberPrayersLoadAttempted() {
      return source.planningCenter.memberPrayersLoadAttempted;
    },
    get memberPrayersLoadFailed() {
      return source.planningCenter.memberPrayersLoadFailed;
    },
  };
}
