import { Injectable } from "@angular/core";
import { NavigationEnd, Router } from "@angular/router";
import {
  Observable,
  Subject,
  distinctUntilChanged,
  filter,
  skip,
  switchMap,
  take,
  takeUntil,
} from "rxjs";
import type { PrayerPrompt } from "../components/prompt-card/prompt-card.component";
import type { PrayerRequest } from "./prayer.service";
import type { PrayerService } from "./prayer.service";
import type { PromptService } from "./prompt.service";
import type { AdminAuthService } from "./admin-auth.service";
import type { UserSessionService } from "./user-session.service";
import type { BadgeService } from "./badge.service";
import type { AnalyticsService } from "./analytics.service";
import type { PrayerAllowancePolicyService } from "./prayer-allowance-policy.service";
import type { PersonalCategoryColorService } from "./personal-category-color.service";
import type { MemorizationService } from "./memorization.service";
import type { MemorizationRecommendationsService } from "./memorization-recommendations.service";
import type { HomeDeepLinkCoordinator } from "./home-deep-link.coordinator";
import type { HomeHelpTourLauncher } from "./home-help-tour.launcher";
import type { HomePlanningCenterController } from "./home-planning-center.controller";
import type { PrayerGroupService } from "./prayer-group.service";
import type { HomeReturnContext } from "../types/presentation";
import type { HomeActiveFilter } from "./home-deep-link-host.adapter";
import { isPublicAreaFilter } from "../lib/home-community-filter";
import {
  isPrayerGroupsFeatureEnabled,
  resolveHomeFilterFromSession,
  sanitizeHomeAreaFilter,
} from "../lib/prayer-groups-feature";
import type { MemorizedItem } from "../types/memorization";

export interface HomeObservableStreams {
  prayers$: Observable<PrayerRequest[]>;
  prompts$: Observable<PrayerPrompt[]>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;
  isAdmin$: Observable<boolean>;
  hasAdminEmail$: Observable<boolean>;
  currentPrayerBadge$: Observable<number>;
  answeredPrayerBadge$: Observable<number>;
  promptBadge$: Observable<number>;
}

export interface HomeLifecycleHost {
  assignObservableStreams(streams: HomeObservableStreams): void;
  getPendingHomeReturnContext(): HomeReturnContext | null;
  setPendingHomeReturnContext(context: HomeReturnContext | null): void;
  getViewReady(): boolean;
  setViewReady(ready: boolean): void;
  getActiveFilter(): HomeActiveFilter;
  setActiveFilter(filter: HomeActiveFilter): void;
  setCurrentPrayers(prayers: PrayerRequest[]): void;
  setPrayerCounts(counts: {
    current: number;
    answered: number;
    archived: number;
    total: number;
  }): void;
  setPromptsCount(count: number): void;
  setPersonalPrayers(prayers: PrayerRequest[]): void;
  setPersonalPrayersCount(count: number): void;
  setIsAdmin(isAdmin: boolean): void;
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

export interface HomeLifecycleServices {
  router: Router;
  analyticsService: AnalyticsService;
  deepLinkCoordinator: HomeDeepLinkCoordinator;
  helpTourLauncher: HomeHelpTourLauncher;
  prayerService: PrayerService;
  promptService: PromptService;
  adminAuthService: AdminAuthService;
  userSessionService: UserSessionService;
  badgeService: BadgeService;
  prayerAllowancePolicy: PrayerAllowancePolicyService;
  planningCenter: HomePlanningCenterController;
  personalCategoryColorService: PersonalCategoryColorService;
  memorizationService: MemorizationService;
  memorizationRecommendationsService: MemorizationRecommendationsService;
  prayerGroupService: PrayerGroupService;
}

export function isRouterUrlHome(urlAfterRedirects: string): boolean {
  const path =
    (urlAfterRedirects.split(/[?#]/)[0] ?? "").replace(/\/+$/, "") || "/";
  return path === "/" || path === "";
}

@Injectable()
export class HomeLifecycleCoordinator {
  private host: HomeLifecycleHost | null = null;
  private services: HomeLifecycleServices | null = null;

  bindHost(host: HomeLifecycleHost, services: HomeLifecycleServices): void {
    this.host = host;
    this.services = services;
  }

  initialize(destroy$: Subject<void>): void {
    const host = this.requireHost();
    const services = this.requireServices();

    host.setPendingHomeReturnContext(host.consumeHomeReturnContext());

    const initialTree = services.router.parseUrl(services.router.url);
    services.deepLinkCoordinator.captureInitialQueryParams({
      filter: initialTree.queryParams["filter"],
      groupId: initialTree.queryParams["groupId"],
      prayerId: initialTree.queryParams["prayerId"],
      promptId: initialTree.queryParams["promptId"],
      verseRef: initialTree.queryParams["verseRef"],
      verseTranslation: initialTree.queryParams["verseTranslation"],
    });

    services.analyticsService.trackPageView();

    services.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntil(destroy$)
      )
      .subscribe((e) => {
        if (!isRouterUrlHome(e.urlAfterRedirects)) {
          return;
        }
        const tree = services.router.parseUrl(e.urlAfterRedirects);
        const returnContext = host.consumeHomeReturnContext();
        if (returnContext) {
          if (host.getViewReady()) {
            host.applyHomeReturnContext(returnContext);
            host.markForCheck();
          } else {
            host.setPendingHomeReturnContext(returnContext);
          }
        }
        services.deepLinkCoordinator.handleNavigationDeepLinks(
          {
            filter: tree.queryParams["filter"],
            groupId: tree.queryParams["groupId"],
            prayerId: tree.queryParams["prayerId"],
            promptId: tree.queryParams["promptId"],
            verseRef: tree.queryParams["verseRef"],
            verseTranslation: tree.queryParams["verseTranslation"],
          },
          host.getViewReady()
        );
        window.setTimeout(() => services.helpTourLauncher.tryResumeQueue(), 400);
      });

    window.setTimeout(() => services.helpTourLauncher.tryResumeQueue(), 200);

    const prayers$ = services.prayerService.prayers$;
    const prompts$ = services.promptService.prompts$;

    host.assignObservableStreams({
      prayers$,
      prompts$,
      loading$: services.prayerService.loading$,
      error$: services.prayerService.error$,
      isAdmin$: services.adminAuthService.isAdmin$,
      hasAdminEmail$: services.adminAuthService.hasAdminEmail$,
      currentPrayerBadge$: services.badgeService.getBadgeCount$(
        "prayers",
        "current"
      ),
      answeredPrayerBadge$: services.badgeService.getBadgeCount$(
        "prayers",
        "answered"
      ),
      promptBadge$: services.badgeService.getBadgeCount$("prompts"),
    });

    services.promptService.loadPrompts();
    services.planningCenter.loadForCurrentUser();
    services.badgeService.refreshBadgeCounts();
    host.markForCheck();

    services.planningCenter.subscribe(destroy$);

    services.userSessionService.userSession$
      .pipe(
        distinctUntilChanged((prev, curr) => {
          if (!prev?.email || !curr?.email) {
            return prev?.email === curr?.email;
          }
          return prev.email === curr.email;
        }),
        filter(
          (
            session
          ): session is NonNullable<typeof session> & { email: string } =>
            !!session?.email
        ),
        takeUntil(destroy$)
      )
      .subscribe((session) => {
        services.planningCenter.loadForUser(session.email);
        void services.personalCategoryColorService.loadColors();
      });

    prayers$.pipe(takeUntil(destroy$)).subscribe((prayers) => {
      host.setCurrentPrayers(prayers);
      host.markForCheck();
    });

    void services.prayerAllowancePolicy.load().then(() => {
      host.detectChanges();
    });

    services.prayerService.allPrayers$
      .pipe(takeUntil(destroy$))
      .subscribe((prayers) => {
        host.setPrayerCounts({
          current: prayers.filter((p) => p.status === "current").length,
          answered: prayers.filter((p) => p.status === "answered").length,
          archived: prayers.filter((p) => p.status === "archived").length,
          total: prayers.length,
        });
        services.badgeService.refreshBadgeCounts();
        host.markForCheck();
        services.deepLinkCoordinator.retryPendingPrayerDeepLinkIfNeeded();
      });

    prompts$.pipe(takeUntil(destroy$)).subscribe((prompts) => {
      host.setPromptsCount(prompts.length);
      host.refreshHomeCatalog();
      host.markForCheck();
      services.badgeService.refreshBadgeCounts();
      host.markForCheck();
      services.deepLinkCoordinator.retryPendingPromptDeepLinkIfNeeded();
    });

    services.adminAuthService.isAdmin$
      .pipe(takeUntil(destroy$))
      .subscribe((isAdmin) => {
        host.setIsAdmin(isAdmin);
      });

    services.prayerService.allPersonalPrayers$
      .pipe(takeUntil(destroy$))
      .subscribe(async (prayers) => {
        host.setPersonalPrayers(prayers);
        host.setPersonalPrayersCount(prayers.length);
        await host.syncPersonalCategoriesFromPrayers(prayers);
        host.refreshHomeCatalog();
        host.markForCheck();
        services.deepLinkCoordinator.retryPendingPrayerDeepLinkIfNeeded();
      });

    services.prayerGroupService.prayers$
      .pipe(takeUntil(destroy$))
      .subscribe(() => {
        services.deepLinkCoordinator.retryPendingPrayerDeepLinkIfNeeded();
      });

    services.memorizationService.memorizedItems$
      .pipe(takeUntil(destroy$))
      .subscribe((items) => {
        host.syncMemorizedItems(items);
      });

    services.memorizationRecommendationsService.items$
      .pipe(takeUntil(destroy$))
      .subscribe(() => {
        host.syncRecommendationGroups();
      });

    services.userSessionService.sessionInitialized$
      .pipe(
        filter((ready) => ready),
        take(1),
        switchMap(() =>
          services.userSessionService.userSession$.pipe(
            filter((session): session is NonNullable<typeof session> => !!session),
            take(1)
          )
        ),
        takeUntil(destroy$)
      )
      .subscribe((s) => {
        const fromArea =
          services.deepLinkCoordinator.consumeInitialHomeAreaFilter();
        const fromEmail =
          services.deepLinkCoordinator.consumeInitialEmailFilterTab();
        const pendingReturn = host.getPendingHomeReturnContext();
        if (pendingReturn) {
          host.applyHomeReturnContext(pendingReturn);
          host.setPendingHomeReturnContext(null);
          const afterReturn = sanitizeHomeAreaFilter(
            host.getActiveFilter(),
            s,
          );
          if (afterReturn !== host.getActiveFilter()) {
            host.setActiveFilter(afterReturn);
            host.setFilter(afterReturn);
          } else if (
            s.isChurchMember === false &&
            isPublicAreaFilter(host.getActiveFilter()) &&
            isPrayerGroupsFeatureEnabled(s)
          ) {
            host.setActiveFilter("groups");
            host.setFilter("groups");
          }
        } else {
          const nextFilter = resolveHomeFilterFromSession(
            (fromArea ?? fromEmail) as HomeActiveFilter | null,
            s,
          );
          host.setActiveFilter(nextFilter);
          host.setFilter(nextFilter);
        }
        if (fromArea || fromEmail) {
          host.stripFilterQueryParam();
        }
        host.setViewReady(true);
        services.deepLinkCoordinator.applyPendingDeepLinksOnViewReady();
        host.markForCheck();
      });

    services.userSessionService.userSession$
      .pipe(
        filter((session): session is NonNullable<typeof session> => !!session),
        distinctUntilChanged(
          (prev, curr) =>
            prev.isChurchMember === curr.isChurchMember &&
            prev.prayerGroupsEnabled === curr.prayerGroupsEnabled,
        ),
        skip(1),
        takeUntil(destroy$)
      )
      .subscribe((s) => {
        if (!host.getViewReady()) {
          return;
        }
        const active = host.getActiveFilter();
        if (active === "groups" && !isPrayerGroupsFeatureEnabled(s)) {
          const next = sanitizeHomeAreaFilter("groups", s);
          host.setActiveFilter(next);
          host.setFilter(next);
          host.markForCheck();
          return;
        }
        if (
          s.isChurchMember !== false ||
          !isPrayerGroupsFeatureEnabled(s) ||
          !isPublicAreaFilter(active)
        ) {
          return;
        }
        host.setActiveFilter("groups");
        host.setFilter("groups");
        host.markForCheck();
      });
  }

  private requireHost(): HomeLifecycleHost {
    if (!this.host) {
      throw new Error("HomeLifecycleCoordinator host is not bound");
    }
    return this.host;
  }

  private requireServices(): HomeLifecycleServices {
    if (!this.services) {
      throw new Error("HomeLifecycleCoordinator services are not bound");
    }
    return this.services;
  }
}
