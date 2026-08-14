import { Injectable } from "@angular/core";
import type { PrayerPrompt } from "../components/prompt-card/prompt-card.component";
import type { PrayerRequest } from "../services/prayer.service";
import {
  buildPersonalCategoryCounts,
  filterDisplayedPromptsForHome,
  filterPersonalPrayersForHome,
  filterPlanningCenterPrayersForHome,
  getPromptCountByType,
  getUniquePromptTypes,
  type HomeCatalogFilterState,
} from "../lib/home-catalog";
import {
  refreshHomeCatalog,
  type HomeCatalogPageBindings,
} from "../lib/home-catalog-refresh";

export interface HomeCatalogSourceState {
  personalPrayers: PrayerRequest[];
  planningCenterPrayers: PrayerRequest[];
  prompts: PrayerPrompt[];
  filter: HomeCatalogFilterState;
}

@Injectable()
export class HomeCatalogStore {
  filteredPersonalPrayers: PrayerRequest[] = [];
  filteredPlanningCenterPrayers: PrayerRequest[] = [];
  displayedPrompts: PrayerPrompt[] = [];
  uniquePromptTypes: string[] = [];
  personalCategoryCounts: Record<string, number> = {};
  private pageSource: (() => HomeCatalogPageBindings) | null = null;

  bindPageSource(source: () => HomeCatalogPageBindings): void {
    this.pageSource = source;
  }

  private ensureFresh(): void {
    if (this.pageSource) {
      refreshHomeCatalog(this, this.pageSource());
    }
  }

  rebuild(state: HomeCatalogSourceState): void {
    this.filteredPersonalPrayers = filterPersonalPrayersForHome(
      state.personalPrayers,
      state.filter
    );
    this.filteredPlanningCenterPrayers = filterPlanningCenterPrayersForHome(
      state.planningCenterPrayers,
      state.filter.searchTerm
    );
    this.displayedPrompts = filterDisplayedPromptsForHome(
      state.prompts,
      state.filter
    );
    this.uniquePromptTypes = getUniquePromptTypes(state.prompts);
    this.personalCategoryCounts = buildPersonalCategoryCounts(
      state.personalPrayers
    );
  }

  promptCountByType(prompts: PrayerPrompt[], type: string): number {
    return getPromptCountByType(prompts, type);
  }

  personalCategoryCount(category: string): number {
    this.ensureFresh();
    return this.personalCategoryCounts[category] ?? 0;
  }
}
