import type { Observable } from "rxjs";
import type { PrayerPrompt } from "../components/prompt-card/prompt-card.component";
import type { PrayerRequest } from "./prayer.service";
import type { HomeReturnContext } from "../types/presentation";
import type { HomeActiveFilter } from "./home-deep-link-host.adapter";
import type { HomeLifecycleHost, HomeObservableStreams } from "./home-lifecycle.coordinator";
import type { MemorizedItem } from "../types/memorization";

export interface HomeLifecyclePageBindings {
  prayers$?: Observable<PrayerRequest[]>;
  prompts$?: Observable<PrayerPrompt[]>;
  loading$?: Observable<boolean>;
  error$?: Observable<string | null>;
  isAdmin$?: Observable<boolean>;
  hasAdminEmail$?: Observable<boolean>;
  currentPrayerBadge$?: Observable<number>;
  answeredPrayerBadge$?: Observable<number>;
  promptBadge$?: Observable<number>;
  currentPrayers: PrayerRequest[];
  personalPrayers: PrayerRequest[];
  currentPrayersCount: number;
  answeredPrayersCount: number;
  archivedPrayersCount: number;
  totalPrayersCount: number;
  promptsCount: number;
  personalPrayersCount: number;
  isAdmin: boolean;
  activeFilter: HomeActiveFilter;
  viewReady: boolean;
}

export interface HomeLifecycleHostAdapterDeps {
  page: HomeLifecyclePageBindings;
  getPendingHomeReturnContext(): HomeReturnContext | null;
  setPendingHomeReturnContext(context: HomeReturnContext | null): void;
  consumeHomeReturnContext(): HomeReturnContext | null;
  applyHomeReturnContext(context: HomeReturnContext): void;
  refreshHomeCatalog(): void;
  setFilter(filter: HomeActiveFilter): void;
  stripFilterQueryParam(): void;
  markForCheck(): void;
  detectChanges(): void;
  syncPersonalCategoriesFromPrayers(
    prayers: PrayerRequest[]
  ): Promise<void>;
  syncMemorizedItems(items: MemorizedItem[]): void;
  syncRecommendationGroups(): void;
}

export class HomeLifecycleHostAdapter implements HomeLifecycleHost {
  constructor(private readonly deps: HomeLifecycleHostAdapterDeps) {}

  assignObservableStreams(streams: HomeObservableStreams): void {
    this.deps.page.prayers$ = streams.prayers$;
    this.deps.page.prompts$ = streams.prompts$;
    this.deps.page.loading$ = streams.loading$;
    this.deps.page.error$ = streams.error$;
    this.deps.page.isAdmin$ = streams.isAdmin$;
    this.deps.page.hasAdminEmail$ = streams.hasAdminEmail$;
    this.deps.page.currentPrayerBadge$ = streams.currentPrayerBadge$;
    this.deps.page.answeredPrayerBadge$ = streams.answeredPrayerBadge$;
    this.deps.page.promptBadge$ = streams.promptBadge$;
  }

  getPendingHomeReturnContext(): HomeReturnContext | null {
    return this.deps.getPendingHomeReturnContext();
  }

  setPendingHomeReturnContext(context: HomeReturnContext | null): void {
    this.deps.setPendingHomeReturnContext(context);
  }

  getViewReady(): boolean {
    return this.deps.page.viewReady;
  }

  setViewReady(ready: boolean): void {
    this.deps.page.viewReady = ready;
  }

  getActiveFilter(): HomeActiveFilter {
    return this.deps.page.activeFilter;
  }

  setActiveFilter(filter: HomeActiveFilter): void {
    this.deps.page.activeFilter = filter;
  }

  setCurrentPrayers(prayers: PrayerRequest[]): void {
    this.deps.page.currentPrayers = prayers;
  }

  setPrayerCounts(counts: {
    current: number;
    answered: number;
    archived: number;
    total: number;
  }): void {
    this.deps.page.currentPrayersCount = counts.current;
    this.deps.page.answeredPrayersCount = counts.answered;
    this.deps.page.archivedPrayersCount = counts.archived;
    this.deps.page.totalPrayersCount = counts.total;
  }

  setPromptsCount(count: number): void {
    this.deps.page.promptsCount = count;
  }

  setPersonalPrayers(prayers: PrayerRequest[]): void {
    this.deps.page.personalPrayers = prayers;
  }

  setPersonalPrayersCount(count: number): void {
    this.deps.page.personalPrayersCount = count;
  }

  setIsAdmin(isAdmin: boolean): void {
    this.deps.page.isAdmin = isAdmin;
  }

  consumeHomeReturnContext(): HomeReturnContext | null {
    return this.deps.consumeHomeReturnContext();
  }

  applyHomeReturnContext(context: HomeReturnContext): void {
    this.deps.applyHomeReturnContext(context);
  }

  refreshHomeCatalog(): void {
    this.deps.refreshHomeCatalog();
  }

  setFilter(filter: HomeActiveFilter): void {
    this.deps.setFilter(filter);
  }

  stripFilterQueryParam(): void {
    this.deps.stripFilterQueryParam();
  }

  markForCheck(): void {
    this.deps.markForCheck();
  }

  detectChanges(): void {
    this.deps.detectChanges();
  }

  syncPersonalCategoriesFromPrayers(
    prayers: PrayerRequest[]
  ): Promise<void> {
    return this.deps.syncPersonalCategoriesFromPrayers(prayers);
  }

  syncMemorizedItems(items: MemorizedItem[]): void {
    this.deps.syncMemorizedItems(items);
  }

  syncRecommendationGroups(): void {
    this.deps.syncRecommendationGroups();
  }
}
