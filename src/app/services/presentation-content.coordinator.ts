import { Injectable } from "@angular/core";
import {
  includesPresentationContentType,
  type PresentationTimeFilter,
  type SelectablePresentationContentType,
} from "../types/presentation";
import { isMemberPrayerId, memberPersonIdFromPrayerId } from "../lib/prayer-card-kind";
import { shuffleCopy } from "../lib/shuffle-copy";
import {
  PresentationCatalogStore,
  type PresentationVisibleItemsOptions,
} from "./presentation-catalog.store";
import {
  PresentationContentLoader,
  type PlanningCenterListMember,
} from "./presentation-content-loader";
import { PrayerService } from "./prayer.service";

export interface PresentationContentHost {
  loading: boolean;
  randomize: boolean;
  contentTypes: SelectablePresentationContentType[];
  statusFilters: { current: boolean; answered: boolean };
  timeFilter: PresentationTimeFilter;
  hasMembers: boolean;
  planningCenterListMembers: PlanningCenterListMember[];
  uniquePersonalCategories: string[];
  uniquePromptCategories: string[];
  selectedPersonalCategories: string[];
  selectedPromptCategories: string[];
  catalog: PresentationCatalogStore;
  markForCheck(): void;
}

interface PresentationFetchUiOptions {
  deferMarkForCheck?: boolean;
}

@Injectable()
export class PresentationContentCoordinator {
  private filterReloadChain: Promise<void> = Promise.resolve();

  constructor(
    private readonly contentLoader: PresentationContentLoader,
    private readonly prayerService: PrayerService
  ) {}

  scheduleFilterReload(task: () => Promise<void>): Promise<void> {
    const run = this.filterReloadChain.then(task);
    this.filterReloadChain = run.catch(() => {});
    return run;
  }

  async loadAll(host: PresentationContentHost): Promise<void> {
    host.loading = true;
    host.markForCheck();

    try {
      const fetchPromises: Promise<void>[] = [];
      const ui: PresentationFetchUiOptions = { deferMarkForCheck: true };

      if (includesPresentationContentType(host.contentTypes, "prayers")) {
        fetchPromises.push(this.fetchCommunityPrayers(host, ui));
      }
      if (includesPresentationContentType(host.contentTypes, "prompts")) {
        fetchPromises.push(this.loadPrompts(host, ui));
      }
      if (includesPresentationContentType(host.contentTypes, "personal")) {
        fetchPromises.push(this.fetchPersonalPrayers(host, ui));
      }
      if (
        includesPresentationContentType(host.contentTypes, "members") &&
        host.hasMembers
      ) {
        fetchPromises.push(this.fetchMemberPrayers(host, ui));
      }

      await Promise.all(fetchPromises);

      if (host.randomize) {
        this.shuffleHostCatalog(host);
      }
    } catch (error) {
      console.error("Error loading content:", error);
    } finally {
      host.loading = false;
      host.markForCheck();
    }
  }

  async fetchCommunityPrayers(
    host: PresentationContentHost,
    options?: PresentationFetchUiOptions
  ): Promise<void> {
    try {
      const previous = host.catalog.prayers;
      const sorted = await this.contentLoader.loadCommunityPrayers({
        statusFilters: host.statusFilters,
        timeFilter: host.timeFilter,
      });
      host.catalog.prayers = host.catalog.applyLivePrayedForFloor(previous, sorted);
      this.maybeMarkForCheck(host, options);
    } catch (error) {
      console.error("Error fetching prayers:", error);
      host.catalog.prayers = [];
      this.maybeMarkForCheck(host, options);
    }
  }

  async loadPrompts(
    host: PresentationContentHost,
    options?: PresentationFetchUiOptions
  ): Promise<void> {
    try {
      const { prompts, categories } = await this.contentLoader.loadPrompts();
      host.uniquePromptCategories = categories;
      host.catalog.syncPromptsFromService(prompts);
      this.maybeMarkForCheck(host, options);
    } catch (error) {
      console.error("Error loading prompts:", error);
      host.catalog.prompts = [];
      host.uniquePromptCategories = [];
      this.maybeMarkForCheck(host, options);
    }
  }

  async fetchPersonalPrayers(
    host: PresentationContentHost,
    options?: PresentationFetchUiOptions
  ): Promise<void> {
    try {
      const previousPersonal = host.catalog.personalPrayers;
      host.catalog.personalPrayers =
        await this.contentLoader.loadPersonalPrayers({
          statusFilters: host.statusFilters,
          timeFilter: host.timeFilter,
        });
      host.catalog.personalPrayers = host.catalog.applyLivePrayedForFloor(
        previousPersonal,
        host.catalog.personalPrayers
      );
      this.syncUniquePersonalCategories(host);
      this.maybeMarkForCheck(host, options);
    } catch (error) {
      console.error("Error fetching personal prayers:", error);
      host.catalog.personalPrayers = [];
      this.maybeMarkForCheck(host, options);
    }
  }

  async fetchMemberPrayers(
    host: PresentationContentHost,
    options?: PresentationFetchUiOptions
  ): Promise<void> {
    try {
      const fetchedMembers = await this.contentLoader.loadMemberPrayers(
        host.planningCenterListMembers
      );
      host.catalog.memberPrayers = host.catalog.applyLivePrayedForFloor(
        host.catalog.memberPrayers,
        fetchedMembers
      );

      this.maybeMarkForCheck(host, options);
    } catch (error) {
      console.error("Error fetching member prayers:", error);
      host.catalog.memberPrayers = [];
      this.maybeMarkForCheck(host, options);
    }
  }

  async refetchPrayerScopedContent(host: PresentationContentHost): Promise<void> {
    const ui: PresentationFetchUiOptions = { deferMarkForCheck: true };
    const refetchPromises: Promise<void>[] = [];
    if (includesPresentationContentType(host.contentTypes, "prayers")) {
      refetchPromises.push(this.fetchCommunityPrayers(host, ui));
    }
    if (includesPresentationContentType(host.contentTypes, "personal")) {
      refetchPromises.push(this.fetchPersonalPrayers(host, ui));
    }
    await Promise.all(refetchPromises);
    this.refreshCombinedShuffleIfNeeded(host);
    host.markForCheck();
  }

  private maybeMarkForCheck(
    host: PresentationContentHost,
    options?: PresentationFetchUiOptions
  ): void {
    if (!options?.deferMarkForCheck) {
      host.markForCheck();
    }
  }

  refreshCombinedShuffleIfNeeded(host: PresentationContentHost): void {
    if (host.randomize) {
      this.shuffleHostCatalog(host);
      return;
    }
    host.catalog.combinedShuffledItems = [];
  }

  private shuffleHostCatalog(host: PresentationContentHost): void {
    host.catalog.shuffleVisibleItems(this.visibleItemsOptions(host), shuffleCopy);
  }

  private visibleItemsOptions(
    host: PresentationContentHost
  ): PresentationVisibleItemsOptions {
    return {
      contentTypes: host.contentTypes,
      randomize: host.randomize,
      selectedPersonalCategories: host.selectedPersonalCategories,
      selectedPromptCategories: host.selectedPromptCategories,
    };
  }

  async patchSlideItemAfterMutation(
    catalog: PresentationCatalogStore,
    id: string
  ): Promise<void> {
    if (isMemberPrayerId(id)) {
      try {
        const updates = await this.prayerService.getMemberPrayerUpdates(
          memberPersonIdFromPrayerId(id)
        );
        catalog.patchItem(id, { updates: updates || [] });
      } catch (error) {
        console.error("Error patching member prayer slide:", error);
      }
      return;
    }

    const personal = this.prayerService
      .getPersonalPrayersSnapshot()
      .find((prayer) => prayer.id === id);
    if (personal) {
      catalog.patchItem(id, personal);
      return;
    }

    const community = this.prayerService
      .getAllCommunityPrayersSnapshot()
      .find((prayer) => prayer.id === id);
    if (community) {
      catalog.patchItem(id, community);
    }
  }

  private syncUniquePersonalCategories(host: PresentationContentHost): void {
    const categories = new Set<string>();
    host.catalog.personalPrayers.forEach((prayer) => {
      if (prayer.category && prayer.category.trim()) {
        categories.add(prayer.category.trim());
      }
    });
    host.uniquePersonalCategories = Array.from(categories).sort();
  }
}
