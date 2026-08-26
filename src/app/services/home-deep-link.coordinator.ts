import { Injectable } from "@angular/core";
import type { HomeDeepLinkHost } from "./home-deep-link-host.adapter";

export type HomeEmailFilterTab =
  | "current"
  | "answered"
  | "archived"
  | "memorize";

export type HomeDeepLinkQueryParamKey =
  | "filter"
  | "prayerId"
  | "promptId"
  | "verseRef"
  | "verseTranslation";

const MAX_DEEP_LINK_SCROLL_BURSTS = 12;

@Injectable()
export class HomeDeepLinkCoordinator {
  private host: HomeDeepLinkHost | null = null;

  initialEmailFilterTab: HomeEmailFilterTab | null = null;
  private pendingPrayerIdScroll: string | null = null;
  private prayerDeepLinkScrollGeneration = 0;
  private prayerDeepLinkScrollBurstCount = 0;
  private prayerDeepLinkFreshCatalogRequested = false;
  private pendingPromptIdScroll: string | null = null;
  private promptDeepLinkScrollGeneration = 0;
  private promptDeepLinkScrollBurstCount = 0;
  private promptDeepLinkFreshCatalogRequested = false;
  private pendingVerseMemorization: {
    reference: string;
    translation?: string;
  } | null = null;

  bindHost(host: HomeDeepLinkHost): void {
    this.host = host;
  }

  captureInitialQueryParams(params: {
    filter?: string | null;
    prayerId?: string | null;
    promptId?: string | null;
    verseRef?: string | null;
    verseTranslation?: string | null;
  }): void {
    const filter = params.filter;
    if (
      filter === "current" ||
      filter === "answered" ||
      filter === "archived" ||
      filter === "memorize"
    ) {
      this.initialEmailFilterTab = filter;
    }
    const prayerId = this.normalizeId(params.prayerId);
    if (prayerId) {
      this.pendingPrayerIdScroll = prayerId;
      this.prayerDeepLinkScrollBurstCount = 0;
    }
    const promptId = this.normalizeId(params.promptId);
    if (promptId) {
      this.pendingPromptIdScroll = promptId;
      this.promptDeepLinkScrollBurstCount = 0;
    }
    this.captureVerseMemorizationParams(
      params.verseRef,
      params.verseTranslation
    );
  }

  consumePendingVerseMemorization(): {
    reference: string;
    translation?: string;
  } | null {
    const pending = this.pendingVerseMemorization;
    if (!pending) {
      return null;
    }
    this.pendingVerseMemorization = null;
    return pending;
  }

  hasPendingVerseMemorization(): boolean {
    return !!this.pendingVerseMemorization;
  }

  consumeInitialEmailFilterTab(): HomeEmailFilterTab | null {
    const tab = this.initialEmailFilterTab;
    this.initialEmailFilterTab = null;
    return tab;
  }

  handleNavigationDeepLinks(
    params: {
      filter?: string | null;
      prayerId?: string | null;
      promptId?: string | null;
      verseRef?: string | null;
      verseTranslation?: string | null;
    },
    viewReady: boolean
  ): void {
    const deepLinkFilter = this.parseEmailFilterTab(params.filter);
    const deepLinkPrayerId = this.normalizeId(params.prayerId);
    const deepLinkPromptId = this.normalizeId(params.promptId);

    if (!viewReady) {
      if (deepLinkFilter) {
        this.initialEmailFilterTab = deepLinkFilter;
      } else if (deepLinkPrayerId) {
        this.pendingPrayerIdScroll = deepLinkPrayerId;
        this.prayerDeepLinkScrollBurstCount = 0;
      } else if (deepLinkPromptId) {
        this.pendingPromptIdScroll = deepLinkPromptId;
        this.promptDeepLinkScrollBurstCount = 0;
      }
      this.captureVerseMemorizationParams(
        params.verseRef,
        params.verseTranslation
      );
      return;
    }

    this.captureVerseMemorizationParams(
      params.verseRef,
      params.verseTranslation
    );

    if (deepLinkFilter) {
      this.host?.setFilter(deepLinkFilter);
      this.host?.markForCheck();
      this.host?.stripQueryParam("filter");
    }
    if (deepLinkPrayerId) {
      this.pendingPrayerIdScroll = deepLinkPrayerId;
      this.prayerDeepLinkScrollBurstCount = 0;
      this.openPrayerDeepLink(deepLinkPrayerId);
      this.host?.stripQueryParam("prayerId");
    }
    if (deepLinkPromptId) {
      this.pendingPromptIdScroll = deepLinkPromptId;
      this.promptDeepLinkScrollBurstCount = 0;
      this.openPromptDeepLink(deepLinkPromptId);
      this.host?.markForCheck();
      this.host?.stripQueryParam("promptId");
    }
    this.applyPendingVerseMemorizationIfNeeded();
  }

  applyPendingDeepLinksOnViewReady(): void {
    if (this.pendingPrayerIdScroll) {
      const id = this.pendingPrayerIdScroll;
      this.openPrayerDeepLink(id);
      this.host?.stripQueryParam("prayerId");
    }
    if (this.pendingPromptIdScroll) {
      const id = this.pendingPromptIdScroll;
      this.openPromptDeepLink(id);
      this.host?.stripQueryParam("promptId");
    }
    this.applyPendingVerseMemorizationIfNeeded();
  }

  retryPendingPrayerDeepLinkIfNeeded(): void {
    const id = this.pendingPrayerIdScroll;
    if (!id || !this.host) {
      return;
    }
    this.ensureFreshCatalogForPrayerDeepLink(id);
    if (this.giveUpPrayerDeepLinkIfUnresolvable(id)) {
      this.pendingPrayerIdScroll = null;
      this.prayerDeepLinkFreshCatalogRequested = false;
      return;
    }
    this.host.clearDeepLinkFilters({ prayerId: id });
    const tab = this.host.resolvePrayerDeepLinkTab(id);
    if (tab !== null && this.host.getActiveFilter() !== tab) {
      this.host.setFilter(tab);
    }
    this.host.markForCheck();
    this.scheduleScrollToPrayerId(id);
  }

  retryPendingPromptDeepLinkIfNeeded(): void {
    const id = this.pendingPromptIdScroll;
    if (!id || !this.host) {
      return;
    }
    this.ensureFreshCatalogForPromptDeepLink(id);
    if (this.giveUpPromptDeepLinkIfUnresolvable(id)) {
      this.pendingPromptIdScroll = null;
      this.promptDeepLinkFreshCatalogRequested = false;
      return;
    }
    this.host.clearDeepLinkFilters();
    if (this.host.getActiveFilter() !== "prompts") {
      this.host.setFilter("prompts");
    }
    this.host.markForCheck();
    this.scheduleScrollToPromptId(id);
  }

  openPrayerDeepLink(prayerId: string): void {
    if (!this.host) {
      return;
    }
    this.ensureFreshCatalogForPrayerDeepLink(prayerId);
    if (this.host.isMemberPrayerId(prayerId)) {
      this.host.clearDeepLinkFilters();
      if (this.host.getActiveFilter() !== "planning_center_list") {
        this.host.setFilter("planning_center_list");
      }
      this.host.markForCheck();
      this.scheduleScrollToPrayerId(prayerId);
      return;
    }
    this.host.clearDeepLinkFilters({ prayerId });
    const tab = this.host.resolvePrayerDeepLinkTab(prayerId);
    if (tab !== null && this.host.getActiveFilter() !== tab) {
      this.host.setFilter(tab);
    }
    this.host.markForCheck();
    this.scheduleScrollToPrayerId(prayerId);
  }

  openPromptDeepLink(promptId: string): void {
    if (!this.host) {
      return;
    }
    this.ensureFreshCatalogForPromptDeepLink(promptId);
    this.host.clearDeepLinkFilters();
    if (this.host.getActiveFilter() !== "prompts") {
      this.host.setFilter("prompts");
    }
    this.host.markForCheck();
    this.scheduleScrollToPromptId(promptId);
  }

  private parseEmailFilterTab(
    filter: string | null | undefined
  ): HomeEmailFilterTab | null {
    if (
      filter === "current" ||
      filter === "answered" ||
      filter === "archived" ||
      filter === "memorize"
    ) {
      return filter;
    }
    return null;
  }

  private normalizeId(value: string | null | undefined): string | null {
    if (typeof value !== "string") {
      return null;
    }
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  private captureVerseMemorizationParams(
    verseRef: string | null | undefined,
    verseTranslation?: string | null | undefined
  ): void {
    const reference = this.normalizeId(verseRef);
    if (!reference) {
      return;
    }
    const translation = this.normalizeId(verseTranslation);
    this.pendingVerseMemorization = translation
      ? { reference, translation }
      : { reference };
  }

  private applyPendingVerseMemorizationIfNeeded(): void {
    if (!this.hasPendingVerseMemorization()) {
      return;
    }
    if (this.host?.getActiveFilter() !== "memorize") {
      this.host?.setFilter("memorize");
      this.host?.markForCheck();
    }
    this.host?.applyPendingVerseMemorizationDeepLink();
  }

  private ensureFreshCatalogForPrayerDeepLink(prayerId: string): void {
    if (
      !this.host ||
      this.host.isMemberPrayerId(prayerId) ||
      this.prayerDeepLinkFreshCatalogRequested
    ) {
      return;
    }
    this.prayerDeepLinkFreshCatalogRequested = true;
    this.host.requestFreshPrayerCatalog();
  }

  private giveUpPrayerDeepLinkIfUnresolvable(prayerId: string): boolean {
    if (!this.host) {
      return true;
    }
    if (this.host.isMemberPrayerId(prayerId)) {
      return this.host.shouldGiveUpMemberPrayerDeepLink(prayerId);
    }
    return this.host.shouldGiveUpCommunityPersonalPrayerDeepLink(prayerId);
  }

  private ensureFreshCatalogForPromptDeepLink(_promptId: string): void {
    if (!this.host || this.promptDeepLinkFreshCatalogRequested) {
      return;
    }
    this.promptDeepLinkFreshCatalogRequested = true;
    this.host.requestFreshPromptCatalog();
  }

  private giveUpPromptDeepLinkIfUnresolvable(promptId: string): boolean {
    if (!this.host) {
      return true;
    }
    if (this.host.isPromptInCatalog(promptId)) {
      return false;
    }
    return !this.host.arePromptsStillLoading();
  }

  private scheduleScrollToPrayerId(prayerId: string): void {
    this.scheduleScrollToCard({
      elementId: `prayer-card-${prayerId}`,
      targetId: prayerId,
      generationRef: () => this.prayerDeepLinkScrollGeneration,
      incrementGeneration: () => {
        this.prayerDeepLinkScrollGeneration += 1;
        return this.prayerDeepLinkScrollGeneration;
      },
      isPending: () => this.pendingPrayerIdScroll === prayerId,
      clearPending: () => {
        this.pendingPrayerIdScroll = null;
        this.prayerDeepLinkFreshCatalogRequested = false;
        this.prayerDeepLinkScrollBurstCount = 0;
      },
      getBurstCount: () => this.prayerDeepLinkScrollBurstCount,
      incrementBurstCount: () => {
        this.prayerDeepLinkScrollBurstCount += 1;
      },
      shouldRetryBurst: () =>
        this.host?.isPrayerInLoadedCatalog(prayerId) ?? false,
      reschedule: () => this.scheduleScrollToPrayerId(prayerId),
      prepareScroll: () => this.host?.scrollPrayerIntoView(prayerId) ?? false,
    });
  }

  private scheduleScrollToPromptId(promptId: string): void {
    this.scheduleScrollToCard({
      elementId: `prompt-card-${promptId}`,
      targetId: promptId,
      generationRef: () => this.promptDeepLinkScrollGeneration,
      incrementGeneration: () => {
        this.promptDeepLinkScrollGeneration += 1;
        return this.promptDeepLinkScrollGeneration;
      },
      isPending: () => this.pendingPromptIdScroll === promptId,
      clearPending: () => {
        this.pendingPromptIdScroll = null;
        this.promptDeepLinkFreshCatalogRequested = false;
        this.promptDeepLinkScrollBurstCount = 0;
      },
      getBurstCount: () => this.promptDeepLinkScrollBurstCount,
      incrementBurstCount: () => {
        this.promptDeepLinkScrollBurstCount += 1;
      },
      shouldRetryBurst: () => this.host?.isPromptInCatalog(promptId) ?? false,
      reschedule: () => this.scheduleScrollToPromptId(promptId),
      prepareScroll: () => this.host?.scrollPromptIntoView(promptId) ?? false,
    });
  }

  private scheduleScrollToCard(options: {
    elementId: string;
    targetId: string;
    generationRef: () => number;
    incrementGeneration: () => number;
    isPending: () => boolean;
    clearPending: () => void;
    getBurstCount: () => number;
    incrementBurstCount: () => void;
    shouldRetryBurst: () => boolean;
    reschedule: () => void;
    prepareScroll?: () => boolean;
  }): void {
    const generation = options.incrementGeneration();
    const tryScroll = (attempt: number): void => {
      if (generation !== options.generationRef()) {
        return;
      }
      options.prepareScroll?.();
      const el = document.getElementById(options.elementId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        options.clearPending();
        return;
      }
      if (attempt < 5) {
        window.setTimeout(
          () => tryScroll(attempt + 1),
          attempt === 0 ? 350 : 600
        );
        return;
      }
      if (!options.isPending() || !options.shouldRetryBurst()) {
        return;
      }
      if (options.getBurstCount() >= MAX_DEEP_LINK_SCROLL_BURSTS) {
        options.clearPending();
        return;
      }
      options.incrementBurstCount();
      window.setTimeout(() => {
        if (
          generation === options.generationRef() &&
          options.isPending()
        ) {
          options.reschedule();
        }
      }, 1200);
    };
    tryScroll(0);
  }
}
