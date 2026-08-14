import type { ChangeDetectorRef } from "@angular/core";
import type { ActivatedRoute, Router } from "@angular/router";
import type { PrayerFormComponent } from "../components/prayer-form/prayer-form.component";
import type { PrayerFilters } from "../components/prayer-filters/prayer-filters.component";
import type { PrayerRequest } from "./prayer.service";
import type { PrayerService } from "./prayer.service";
import type { PromptService } from "./prompt.service";
import type { AnalyticsService } from "./analytics.service";
import type { PersonalCategoryColorService } from "./personal-category-color.service";
import type { ToastService } from "./toast.service";
import type { UserSessionService } from "./user-session.service";
import type { MemorizationService } from "./memorization.service";
import type { MemorizationRecommendationsService } from "./memorization-recommendations.service";
import type { ScriptureService } from "./scripture.service";
import type { AdminAuthService } from "./admin-auth.service";
import type { PlanningCenterListService } from "./planning-center-list.service";
import type { BadgeService } from "./badge.service";
import type { PrayerCardActionsFacade } from "./prayer-card-actions.facade";
import type { PrayerAllowancePolicyService } from "./prayer-allowance-policy.service";
import { HomeDeepLinkCoordinator } from "./home-deep-link.coordinator";
import { HomeDeepLinkHostAdapter, type HomeActiveFilter } from "./home-deep-link-host.adapter";
import { HomeHelpTourLauncher } from "./home-help-tour.launcher";
import {
  HomeHelpTourHostAdapter,
  type HomeHelpTourHostBindings,
} from "./home-help-tour-host.adapter";
import { HomeCatalogStore } from "./home-catalog.store";
import { HomeFilterCoordinator } from "./home-filter.coordinator";
import { HomeFilterHostAdapter } from "./home-filter-host.adapter";
import { HomePersonalCategoryController } from "./home-personal-category.controller";
import { HomeMemorizationPanelController } from "./home-memorization-panel.controller";
import { HomePlanningCenterController } from "./home-planning-center.controller";
import { HomeLifecycleCoordinator } from "./home-lifecycle.coordinator";
import {
  HomeLifecycleHostAdapter,
  type HomeLifecyclePageBindings,
} from "./home-lifecycle-host.adapter";
import type { HomeFilterPageBindings } from "./home-filter-host.adapter";
import { HomeModalController } from "./home-modal.controller";
import { HomeRefreshCoordinator } from "./home-refresh.coordinator";
import { HomePresentationNavigationController } from "./home-presentation-navigation.controller";
import { createHomeDeepLinkPageState } from "./home-deep-link-page.adapter";
import {
  readFilteredPersonalPrayers,
  refreshHomeCatalog,
  type HomeCatalogPageBindings,
} from "../lib/home-catalog-refresh";
import type { HomeReturnContext } from "../types/presentation";
import type { HomePresentationFilter } from "../types/presentation";

export interface HomeCoordinatorWiringPage {
  activeFilter: HomeActiveFilter;
  filters: PrayerFilters;
  selectedPromptTypes: string[];
  personalPrayers: PrayerRequest[];
  isRefreshing: boolean;
  lastExplicitRefreshAt: number;
  viewReady: boolean;
  getCatalogBindings(): HomeCatalogPageBindings;
  refreshHomeCatalog(): void;
  getFilteredPersonalPrayers(): PrayerRequest[];
  getPrayerFormComp(): PrayerFormComponent | undefined;
  getMemorizeKeyboardBridge(): HTMLInputElement | undefined;
}

export interface HomeCoordinatorWiringDeps {
  page: HomeCoordinatorWiringPage;
  filterPage: HomeFilterPageBindings;
  lifecyclePage: HomeLifecyclePageBindings;
  cdr: ChangeDetectorRef;
  router: Router;
  route: ActivatedRoute;
  prayerService: PrayerService;
  promptService: PromptService;
  adminAuthService: AdminAuthService;
  userSessionService: UserSessionService;
  planningCenterListService: PlanningCenterListService;
  badgeService: BadgeService;
  memorizationService: MemorizationService;
  memorizationRecommendationsService: MemorizationRecommendationsService;
  scriptureService: ScriptureService;
  personalCategoryColorService: PersonalCategoryColorService;
  toastService: ToastService;
  analyticsService: AnalyticsService;
  prayerCardActions: PrayerCardActionsFacade;
  prayerAllowancePolicy: PrayerAllowancePolicyService;
  deepLinkCoordinator: HomeDeepLinkCoordinator;
  helpTourLauncher: HomeHelpTourLauncher;
  catalog: HomeCatalogStore;
  filterCoordinator: HomeFilterCoordinator;
  personalCategory: HomePersonalCategoryController;
  memorizationPanel: HomeMemorizationPanelController;
  planningCenter: HomePlanningCenterController;
  lifecycleCoordinator: HomeLifecycleCoordinator;
  modals: HomeModalController;
  refreshCoordinator: HomeRefreshCoordinator;
  presentationNav: HomePresentationNavigationController;
}

export interface WiredHomeHosts {
  deepLinkHost: HomeDeepLinkHostAdapter;
}

export function wireHomeCoordinators(
  deps: HomeCoordinatorWiringDeps
): WiredHomeHosts {
  const { page, cdr } = deps;

  deps.catalog.bindPageSource(() => page.getCatalogBindings());

  const deepLinkHost = new HomeDeepLinkHostAdapter({
    page: createHomeDeepLinkPageState({
      getActiveFilter: () => page.activeFilter,
      setActiveFilter: (filter) => {
        page.activeFilter = filter;
      },
      getFilters: () => page.filters,
      setFilters: (filters) => {
        page.filters = filters;
      },
      getSelectedPromptTypes: () => page.selectedPromptTypes,
      setSelectedPromptTypes: (types) => {
        page.selectedPromptTypes = types;
      },
      personalCategory: deps.personalCategory,
      planningCenter: deps.planningCenter,
    }),
    router: deps.router,
    route: deps.route,
    prayerService: deps.prayerService,
    promptService: deps.promptService,
    markForCheck: () => cdr.markForCheck(),
    setFilter: (filter) => deps.filterCoordinator.setFilter(filter),
    selectPersonalCategoryFilterMode: (mode) =>
      deps.personalCategory.selectPersonalCategoryFilterMode(mode),
    applyPrayerFilters: (filters) => deps.prayerService.applyFilters(filters),
    refreshHomeCatalog: () => page.refreshHomeCatalog(),
  });
  deps.deepLinkCoordinator.bindHost(deepLinkHost);

  const helpTourBindings: HomeHelpTourHostBindings = {
    getActiveFilter: () => page.activeFilter,
    getPromptsCount: () => deps.lifecyclePage.promptsCount,
    getMemorizedItemsCount: () => deps.memorizationPanel.memorizedItemsCount,
    getSelectedPromptTypes: () => page.selectedPromptTypes,
    setSelectedPromptTypes: (types) => {
      page.selectedPromptTypes = types;
    },
    getPersonalCategoryFilterMode: () =>
      deps.personalCategory.personalCategoryFilterMode,
    setPersonalCategoryFilterMode: (mode) => {
      deps.personalCategory.personalCategoryFilterMode = mode;
    },
    getSelectedPersonalCategories: () =>
      deps.personalCategory.selectedPersonalCategories,
    setSelectedPersonalCategories: (categories) => {
      deps.personalCategory.selectedPersonalCategories = categories;
    },
    closeHelp: () => {
      deps.modals.showHelp = false;
    },
    openPrayerForm: () => {
      deps.modals.showPrayerForm = true;
    },
    closePrayerForm: () => {
      deps.modals.showPrayerForm = false;
    },
    closeWalkthroughPersonalEdit: () => {
      deps.modals.showEditPersonalPrayer = false;
      deps.modals.editingPrayer = null;
    },
  };

  const helpTourHost = new HomeHelpTourHostAdapter({
    bindings: helpTourBindings,
    router: deps.router,
    userSessionService: deps.userSessionService,
    prayers$: deps.prayerService.prayers$,
    prayerCardActions: deps.prayerCardActions,
    markForCheck: () => cdr.markForCheck(),
    setFilter: (filter) => deps.filterCoordinator.setFilter(filter),
    openUserSettings: () => deps.modals.openUserSettings(),
    closeUserSettings: () => deps.modals.closeUserSettings(),
    openEditModal: (prayer) => deps.modals.openEditModal(prayer),
    getFilteredPersonalPrayers: () => page.getFilteredPersonalPrayers(),
    getPrayerFormHooks: () => {
      const prayerFormComp = page.getPrayerFormComp();
      return prayerFormComp
        ? {
            fillWalkthroughPrayerFor: () =>
              prayerFormComp.fillWalkthroughPrayerFor(),
            fillWalkthroughDescription: () =>
              prayerFormComp.fillWalkthroughDescription(),
            ensureWalkthroughPersonalSelected: () =>
              prayerFormComp.ensureWalkthroughPersonalSelected(),
            fillWalkthroughCategory: () =>
              prayerFormComp.fillWalkthroughCategory(),
            submitWalkthroughPrayerForm: () =>
              prayerFormComp.submitWalkthroughPrayerForm(),
          }
        : null;
    },
    refreshHomeCatalog: () => page.refreshHomeCatalog(),
  });
  deps.helpTourLauncher.bindHost(helpTourHost);

  const filterHost = new HomeFilterHostAdapter({
    page: deps.filterPage,
    prayerService: deps.prayerService,
    promptService: deps.promptService,
    memorizationService: deps.memorizationService,
    badgeService: deps.badgeService,
    loadPlanningCenterMemberPrayers: () => {
      void deps.planningCenter.loadMemberPrayers();
    },
    onFilterChanged: () => {
      page.refreshHomeCatalog();
      cdr.markForCheck();
    },
  });
  deps.filterCoordinator.bindHost(filterHost);

  deps.personalCategory.bindHost(
    {
      getPersonalPrayers: () => page.personalPrayers,
      setPersonalPrayers: (prayers) => {
        page.personalPrayers = prayers;
      },
      getFilteredPersonalPrayers: () => page.getFilteredPersonalPrayers(),
      setIsReorderingPersonalPrayers: (value) => {
        deps.personalCategory.isReorderingPersonalPrayers = value;
      },
      markForCheck: () => cdr.markForCheck(),
      detectChanges: () => cdr.detectChanges(),
      onFilterStateChanged: () => {
        page.refreshHomeCatalog();
        cdr.markForCheck();
      },
    },
    {
      prayerService: deps.prayerService,
      personalCategoryColorService: deps.personalCategoryColorService,
      toastService: deps.toastService,
    }
  );

  deps.memorizationPanel.bindHost(
    {
      markForCheck: () => cdr.markForCheck(),
      detectChanges: () => cdr.detectChanges(),
      primeKeyboardBridge: () => primeMemorizeKeyboardBridge(page),
    },
    {
      memorizationService: deps.memorizationService,
      memorizationRecommendationsService: deps.memorizationRecommendationsService,
      scriptureService: deps.scriptureService,
      toastService: deps.toastService,
    }
  );

  deps.modals.bindHost(
    { markForCheck: () => cdr.markForCheck() },
    {
      adminAuthService: deps.adminAuthService,
      reloadMemberPrayerUpdates: (personId) => {
        void deps.planningCenter.reloadMemberPrayerUpdates(personId);
      },
    }
  );

  deps.planningCenter.bindHost(
    {
      markForCheck: () => cdr.markForCheck(),
      detectChanges: () => cdr.detectChanges(),
      onListStateChanged: () => {
        page.refreshHomeCatalog();
        cdr.markForCheck();
        deps.deepLinkCoordinator.retryPendingPrayerDeepLinkIfNeeded();
      },
      onMemberPrayersLoaded: () => {
        page.refreshHomeCatalog();
        cdr.markForCheck();
        deps.deepLinkCoordinator.retryPendingPrayerDeepLinkIfNeeded();
      },
      retryPendingPrayerDeepLink: () =>
        deps.deepLinkCoordinator.retryPendingPrayerDeepLinkIfNeeded(),
    },
    {
      planningCenterListService: deps.planningCenterListService,
      prayerService: deps.prayerService,
    }
  );

  const lifecycleHost = new HomeLifecycleHostAdapter({
    page: deps.lifecyclePage,
    getPendingHomeReturnContext: () =>
      deps.presentationNav.pendingHomeReturnContext,
    setPendingHomeReturnContext: (context: HomeReturnContext | null) => {
      deps.presentationNav.pendingHomeReturnContext = context;
    },
    consumeHomeReturnContext: () =>
      deps.presentationNav.consumeHomeReturnContext(),
    applyHomeReturnContext: (context) =>
      deps.presentationNav.applyHomeReturnContext(context),
    refreshHomeCatalog: () => page.refreshHomeCatalog(),
    setFilter: (filter) => deps.filterCoordinator.setFilter(filter),
    stripFilterQueryParam: () => deepLinkHost.stripQueryParam("filter"),
    markForCheck: () => cdr.markForCheck(),
    detectChanges: () => cdr.detectChanges(),
    syncPersonalCategoriesFromPrayers: (prayers) =>
      deps.personalCategory.syncCategoriesFromPrayers(prayers),
    syncMemorizedItems: (items) =>
      deps.memorizationPanel.syncMemorizedItems(items),
    syncRecommendationGroups: () =>
      deps.memorizationPanel.syncRecommendationGroups(),
  });
  deps.lifecycleCoordinator.bindHost(lifecycleHost, {
    router: deps.router,
    analyticsService: deps.analyticsService,
    deepLinkCoordinator: deps.deepLinkCoordinator,
    helpTourLauncher: deps.helpTourLauncher,
    prayerService: deps.prayerService,
    promptService: deps.promptService,
    adminAuthService: deps.adminAuthService,
    userSessionService: deps.userSessionService,
    badgeService: deps.badgeService,
    prayerAllowancePolicy: deps.prayerAllowancePolicy,
    planningCenter: deps.planningCenter,
    personalCategoryColorService: deps.personalCategoryColorService,
    memorizationService: deps.memorizationService,
    memorizationRecommendationsService: deps.memorizationRecommendationsService,
  });

  deps.refreshCoordinator.bindHost(
    {
      getActiveFilter: () => page.activeFilter,
      getPlanningCenterListId: () => deps.planningCenter.planningCenterListId,
      markForCheck: () => cdr.markForCheck(),
      setRefreshing: (refreshing) => {
        page.isRefreshing = refreshing;
      },
      shouldThrottleRefresh: (now, minIntervalMs) =>
        now - page.lastExplicitRefreshAt < minIntervalMs,
      recordRefreshAttempt: (now) => {
        page.lastExplicitRefreshAt = now;
      },
    },
    {
      prayerService: deps.prayerService,
      userSessionService: deps.userSessionService,
      personalCategoryColorService: deps.personalCategoryColorService,
      memorizationService: deps.memorizationService,
      planningCenter: deps.planningCenter,
      toastService: deps.toastService,
    }
  );

  deps.presentationNav.bindHost({
    setFilter: (filter) => deps.filterCoordinator.setFilter(filter),
    setSelectedPromptTypes: (types) => {
      page.selectedPromptTypes = types;
    },
    applyPersonalReturnContext: (context) => {
      deps.personalCategory.applyReturnContext(context);
    },
    refreshHomeCatalog: () => page.refreshHomeCatalog(),
    getHandoffSource: () => ({
      activeFilter: page.activeFilter as HomePresentationFilter,
      selectedPromptTypes: page.selectedPromptTypes,
      selectedPersonalCategories: deps.personalCategory.selectedPersonalCategories,
      personalCategoryFilterMode: deps.personalCategory.personalCategoryFilterMode,
      defaultPrayerView: deps.userSessionService.getDefaultPrayerView(),
    }),
  });

  page.refreshHomeCatalog();

  return { deepLinkHost };
}

function primeMemorizeKeyboardBridge(page: HomeCoordinatorWiringPage): void {
  const input = page.getMemorizeKeyboardBridge();
  if (!input) return;
  try {
    input.focus({ preventScroll: true });
  } catch {
    try {
      input.focus();
    } catch {
      return;
    }
  }
  try {
    input.click();
  } catch {
    // ignore
  }
}

export function createHomeCatalogBindings(
  page: Pick<
    HomeCoordinatorWiringPage,
    | "personalPrayers"
    | "activeFilter"
    | "filters"
    | "selectedPromptTypes"
  > & {
    planningCenterPrayers: PrayerRequest[];
    prompts: import("../components/prompt-card/prompt-card.component").PrayerPrompt[];
    personalCategoryFilterMode: HomeCatalogPageBindings["personalCategoryFilterMode"];
    selectedPersonalCategories: string[];
  }
): HomeCatalogPageBindings {
  return {
    personalPrayers: page.personalPrayers,
    planningCenterPrayers: page.planningCenterPrayers,
    prompts: page.prompts,
    activeFilter: page.activeFilter,
    filters: page.filters,
    personalCategoryFilterMode: page.personalCategoryFilterMode,
    selectedPersonalCategories: page.selectedPersonalCategories,
    selectedPromptTypes: page.selectedPromptTypes,
  };
}

export function readHomeFilteredPersonalPrayers(
  catalog: HomeCatalogStore,
  bindings: HomeCatalogPageBindings
) {
  return readFilteredPersonalPrayers(catalog, bindings);
}

export function syncHomeCatalog(
  catalog: HomeCatalogStore,
  bindings: HomeCatalogPageBindings
): void {
  refreshHomeCatalog(catalog, bindings);
}
