import type { PrayerFilters } from "../components/prayer-filters/prayer-filters.component";
import type { PrayerPrompt } from "../components/prompt-card/prompt-card.component";
import type { HomeActiveFilter } from "./home-deep-link-host.adapter";
import type {
  HomeFilterHost,
  HomeFilterPageState,
} from "./home-filter.coordinator";
import type { PrayerService } from "./prayer.service";
import type { PromptService } from "./prompt.service";
import type { MemorizationService } from "./memorization.service";
import type { BadgeService } from "./badge.service";

export interface HomeFilterPageBindings {
  get activeFilter(): HomeActiveFilter;
  set activeFilter(value: HomeActiveFilter);
  get filters(): PrayerFilters;
  set filters(value: PrayerFilters);
  get selectedPromptTypes(): string[];
  set selectedPromptTypes(value: string[]);
}

export interface HomeFilterHostAdapterDeps {
  page: HomeFilterPageBindings;
  prayerService: PrayerService;
  promptService: PromptService;
  memorizationService: MemorizationService;
  badgeService: BadgeService;
  loadPlanningCenterMemberPrayers(): void;
  onFilterChanged(): void;
}

export class HomeFilterHostAdapter implements HomeFilterHost {
  constructor(private readonly deps: HomeFilterHostAdapterDeps) {}

  getPageState(): HomeFilterPageState {
    return {
      activeFilter: this.deps.page.activeFilter,
      filters: this.deps.page.filters,
      selectedPromptTypes: this.deps.page.selectedPromptTypes,
    };
  }

  setActiveFilter(filter: HomeActiveFilter): void {
    this.deps.page.activeFilter = filter;
  }

  setFilters(filters: PrayerFilters): void {
    this.deps.page.filters = filters;
  }

  clearSelectedPromptTypes(): void {
    this.deps.page.selectedPromptTypes = [];
  }

  setSelectedPromptTypes(types: string[]): void {
    this.deps.page.selectedPromptTypes = types;
  }

  getPrompts(): PrayerPrompt[] {
    return this.deps.promptService.promptsSubject.value;
  }

  isPromptUnread(promptId: string): boolean {
    return this.deps.badgeService.isPromptUnread(promptId);
  }

  applyPrayerFilters(filters: {
    status?: PrayerFilters["status"];
    type?: PrayerFilters["type"];
    search?: string;
  }): void {
    this.deps.prayerService.applyFilters(filters);
  }

  loadPlanningCenterMemberPrayers(): void {
    this.deps.loadPlanningCenterMemberPrayers();
  }

  loadMemorizationItems(): void {
    void this.deps.memorizationService.loadItems();
  }

  onFilterChanged(): void {
    this.deps.onFilterChanged();
  }
}
