import type { ActivatedRoute, Params } from "@angular/router";
import type { Router } from "@angular/router";
import {
  resolvePersonalDeepLinkCategoryMode,
  resolvePrayerItemDeepLinkTab,
} from "../lib/prayer-item-deep-link";
import { isMemberPrayerId } from "../lib/prayer-card-kind";
import type { PrayerRequest } from "./prayer.service";
import type { PrayerService } from "./prayer.service";
import type { PromptService } from "./prompt.service";
import type { PersonalCategoryFilterMode } from "../types/presentation";
import type { PrayerFilters } from "../components/prayer-filters/prayer-filters.component";

export type HomeActiveFilter =
  | "current"
  | "answered"
  | "archived"
  | "total"
  | "prompts"
  | "personal"
  | "memorize"
  | "planning_center_list";

export interface HomeDeepLinkPageState {
  activeFilter: HomeActiveFilter;
  filters: PrayerFilters;
  selectedPromptTypes: string[];
  personalCategoryFilterMode: PersonalCategoryFilterMode;
  selectedPersonalCategories: string[];
  filteredPlanningCenterPrayers: PrayerRequest[];
  loadingPlanningCenterList: boolean;
  loadingMemberPrayers: boolean;
  planningCenterListResolved: boolean;
  planningCenterListId: string | null;
  planningCenterListMembers: Array<{ id: string; name: string; avatar?: string | null }>;
  memberPrayersLoadAttempted: boolean;
  memberPrayersLoadFailed: boolean;
}

export interface HomeDeepLinkHost {
  markForCheck(): void;
  getActiveFilter(): HomeActiveFilter;
  setFilter(filter: HomeActiveFilter): void;
  stripQueryParam(key: "filter" | "prayerId" | "promptId"): void;
  clearDeepLinkFilters(options?: { prayerId?: string }): void;
  resolvePrayerDeepLinkTab(prayerId: string): HomeActiveFilter | null;
  isMemberPrayerId(prayerId: string): boolean;
  isPrayerInLoadedCatalog(prayerId: string): boolean;
  shouldGiveUpMemberPrayerDeepLink(prayerId: string): boolean;
  shouldGiveUpCommunityPersonalPrayerDeepLink(prayerId: string): boolean;
  requestFreshPrayerCatalog(): void;
  isPromptInCatalog(promptId: string): boolean;
  arePromptsStillLoading(): boolean;
  requestFreshPromptCatalog(): void;
}

export interface HomeDeepLinkHostDependencies {
  page: HomeDeepLinkPageState;
  router: Router;
  route: ActivatedRoute;
  prayerService: PrayerService;
  promptService: PromptService;
  markForCheck: () => void;
  setFilter: (filter: HomeActiveFilter) => void;
  selectPersonalCategoryFilterMode: (
    mode: Exclude<PersonalCategoryFilterMode, "named">
  ) => void;
  applyPrayerFilters: (filters: {
    status?: PrayerFilters["status"];
    type?: PrayerFilters["type"];
    search?: string;
  }) => void;
  refreshHomeCatalog: () => void;
}

export class HomeDeepLinkHostAdapter implements HomeDeepLinkHost {
  constructor(private readonly deps: HomeDeepLinkHostDependencies) {}

  markForCheck(): void {
    this.deps.markForCheck();
  }

  getActiveFilter(): HomeActiveFilter {
    return this.deps.page.activeFilter;
  }

  setFilter(filter: HomeActiveFilter): void {
    this.deps.setFilter(filter);
  }

  stripQueryParam(key: "filter" | "prayerId" | "promptId"): void {
    const q: Params = { ...(this.deps.route.snapshot?.queryParams ?? {}) };
    delete q[key];
    void this.deps.router.navigate([], {
      relativeTo: this.deps.route,
      queryParams: q,
      queryParamsHandling: "",
      replaceUrl: true,
    });
  }

  clearDeepLinkFilters(options?: { prayerId?: string }): void {
    const page = this.deps.page;
    let changed = false;
    if (page.filters.searchTerm?.trim()) {
      page.filters = { ...page.filters, searchTerm: "" };
      changed = true;
    }
    if (page.selectedPromptTypes.length > 0) {
      page.selectedPromptTypes = [];
      changed = true;
    }
    if (this.applyPersonalFilterForDeepLink(options?.prayerId)) {
      changed = true;
    }
    if (page.filters.type) {
      page.filters = { ...page.filters, type: undefined };
      changed = true;
    }
    if (!changed) {
      return;
    }
    if (page.activeFilter === "prompts" || page.activeFilter === "memorize") {
      this.deps.applyPrayerFilters({ search: "" });
    } else {
      this.deps.applyPrayerFilters({
        status: page.filters.status,
        search: "",
      });
    }
    this.deps.refreshHomeCatalog();
  }

  resolvePrayerDeepLinkTab(prayerId: string): HomeActiveFilter | null {
    return resolvePrayerItemDeepLinkTab(
      prayerId,
      this.deps.prayerService.getAllCommunityPrayersSnapshot(),
      this.deps.prayerService.getPersonalPrayersSnapshot()
    );
  }

  isMemberPrayerId(prayerId: string): boolean {
    return isMemberPrayerId(prayerId);
  }

  isPrayerInLoadedCatalog(prayerId: string): boolean {
    if (isMemberPrayerId(prayerId)) {
      return this.deps.page.filteredPlanningCenterPrayers.some(
        (p) => p.id === prayerId
      );
    }
    return (
      this.deps.prayerService
        .getPersonalPrayersSnapshot()
        .some((p) => p.id === prayerId) ||
      this.deps.prayerService
        .getAllCommunityPrayersSnapshot()
        .some((p) => p.id === prayerId)
    );
  }

  shouldGiveUpMemberPrayerDeepLink(prayerId: string): boolean {
    const page = this.deps.page;
    if (page.loadingPlanningCenterList || page.loadingMemberPrayers) {
      return false;
    }
    if (!page.planningCenterListId) {
      return page.planningCenterListResolved;
    }
    if (page.planningCenterListMembers.length === 0) {
      return page.planningCenterListResolved;
    }
    if (page.filteredPlanningCenterPrayers.length === 0) {
      if (!page.memberPrayersLoadAttempted || page.loadingMemberPrayers) {
        return false;
      }
      return page.memberPrayersLoadFailed;
    }
    return !page.filteredPlanningCenterPrayers.some((p) => p.id === prayerId);
  }

  shouldGiveUpCommunityPersonalPrayerDeepLink(prayerId: string): boolean {
    const personal = this.deps.prayerService.getPersonalPrayersSnapshot();
    const community = this.deps.prayerService.getAllCommunityPrayersSnapshot();
    if (
      personal.some((p) => p.id === prayerId) ||
      community.some((p) => p.id === prayerId)
    ) {
      return false;
    }
    return this.deps.prayerService.arePrayerCatalogsReady();
  }

  requestFreshPrayerCatalog(): void {
    void this.deps.prayerService.loadPrayers(false);
    void this.deps.prayerService.loadPersonalPrayers(false);
  }

  isPromptInCatalog(promptId: string): boolean {
    return this.deps.promptService.promptsSubject.value.some(
      (p) => p.id === promptId
    );
  }

  arePromptsStillLoading(): boolean {
    return this.deps.promptService.isPromptsLoading();
  }

  requestFreshPromptCatalog(): void {
    void this.deps.promptService.loadPrompts(true);
  }

  private applyPersonalFilterForDeepLink(prayerId?: string): boolean {
    const page = this.deps.page;
    const personalMode = prayerId
      ? resolvePersonalDeepLinkCategoryMode(
          prayerId,
          this.deps.prayerService.getPersonalPrayersSnapshot()
        )
      : null;

    if (personalMode !== null) {
      if (
        page.personalCategoryFilterMode !== personalMode ||
        page.selectedPersonalCategories.length > 0
      ) {
        this.deps.selectPersonalCategoryFilterMode(personalMode);
        return true;
      }
      return false;
    }

    if (
      page.selectedPersonalCategories.length > 0 ||
      page.personalCategoryFilterMode !== "current"
    ) {
      this.deps.selectPersonalCategoryFilterMode("current");
      return true;
    }
    return false;
  }
}
