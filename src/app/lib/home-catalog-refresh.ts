import type { PrayerFilters } from "../components/prayer-filters/prayer-filters.component";
import type { PrayerPrompt } from "../components/prompt-card/prompt-card.component";
import type { PrayerRequest } from "../services/prayer.service";
import type { HomeCatalogStore } from "../services/home-catalog.store";
import type { HomeActiveFilter } from "../services/home-deep-link-host.adapter";
import type { PersonalCategoryFilterMode } from "../types/presentation";

export interface HomeCatalogPageBindings {
  personalPrayers: PrayerRequest[];
  planningCenterPrayers: PrayerRequest[];
  prompts: PrayerPrompt[];
  activeFilter: HomeActiveFilter;
  filters: PrayerFilters;
  personalCategoryFilterMode: PersonalCategoryFilterMode;
  selectedPersonalCategories: string[];
  selectedPromptTypes: string[];
}

export function refreshHomeCatalog(
  catalog: HomeCatalogStore,
  page: HomeCatalogPageBindings
): void {
  catalog.rebuild({
    personalPrayers: page.personalPrayers,
    planningCenterPrayers: page.planningCenterPrayers,
    prompts: page.prompts,
    filter: {
      activeFilter: page.activeFilter,
      searchTerm: page.filters.searchTerm ?? "",
      personalCategoryFilterMode: page.personalCategoryFilterMode,
      selectedPersonalCategories: page.selectedPersonalCategories,
      selectedPromptTypes: page.selectedPromptTypes,
    },
  });
}

export function readFilteredPersonalPrayers(
  catalog: HomeCatalogStore,
  page: HomeCatalogPageBindings
): PrayerRequest[] {
  refreshHomeCatalog(catalog, page);
  return catalog.filteredPersonalPrayers;
}
