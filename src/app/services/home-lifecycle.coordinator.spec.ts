import { describe, it, expect, vi, beforeEach } from "vitest";
import { BehaviorSubject, of, Subject } from "rxjs";
import { NavigationEnd } from "@angular/router";
import { HomeLifecycleCoordinator, isRouterUrlHome } from "./home-lifecycle.coordinator";
import type { HomeLifecycleHost } from "./home-lifecycle.coordinator";

describe("HomeLifecycleCoordinator", () => {
  let coordinator: HomeLifecycleCoordinator;
  let host: HomeLifecycleHost;
  let userSessionSubject: BehaviorSubject<{ email?: string; defaultPrayerView?: string; isChurchMember?: boolean } | null>;
  let sessionInitializedSubject: BehaviorSubject<boolean>;
  let allPersonalPrayersSubject: BehaviorSubject<unknown[]>;
  let prayersSubject: BehaviorSubject<unknown[]>;
  let promptsSubject: BehaviorSubject<unknown[]>;
  let routerEvents$: Subject<NavigationEnd>;

  beforeEach(() => {
    coordinator = new HomeLifecycleCoordinator();
    userSessionSubject = new BehaviorSubject<{ email?: string; defaultPrayerView?: string; isChurchMember?: boolean } | null>(null);
    sessionInitializedSubject = new BehaviorSubject(false);
    allPersonalPrayersSubject = new BehaviorSubject<unknown[]>([]);
    prayersSubject = new BehaviorSubject<unknown[]>([]);
    promptsSubject = new BehaviorSubject<unknown[]>([]);
    routerEvents$ = new Subject<NavigationEnd>();

    host = {
      assignObservableStreams: vi.fn(),
      getPendingHomeReturnContext: vi.fn(() => null),
      setPendingHomeReturnContext: vi.fn(),
      getViewReady: vi.fn(() => false),
      setViewReady: vi.fn(),
      getActiveFilter: vi.fn(() => "current" as const),
      setActiveFilter: vi.fn(),
      setCurrentPrayers: vi.fn(),
      setPrayerCounts: vi.fn(),
      setPromptsCount: vi.fn(),
      setPersonalPrayers: vi.fn(),
      setPersonalPrayersCount: vi.fn(),
      setIsAdmin: vi.fn(),
      consumeHomeReturnContext: vi.fn(() => null),
      applyHomeReturnContext: vi.fn(),
      refreshHomeCatalog: vi.fn(),
      setFilter: vi.fn(),
      stripFilterQueryParam: vi.fn(),
      markForCheck: vi.fn(),
      detectChanges: vi.fn(),
      syncPersonalCategoriesFromPrayers: vi.fn().mockResolvedValue(undefined),
      syncMemorizedItems: vi.fn(),
      syncRecommendationGroups: vi.fn(),
    };

    coordinator.bindHost(host, {
      router: {
        url: "/",
        parseUrl: vi.fn(() => ({ queryParams: {} })),
        events: routerEvents$.asObservable(),
      } as any,
      analyticsService: { trackPageView: vi.fn() } as any,
      deepLinkCoordinator: {
        captureInitialQueryParams: vi.fn(),
        consumeInitialEmailFilterTab: vi.fn(() => null),
        consumeInitialHomeAreaFilter: vi.fn(() => null),
        handleNavigationDeepLinks: vi.fn(),
        applyPendingDeepLinksOnViewReady: vi.fn(),
        retryPendingPrayerDeepLinkIfNeeded: vi.fn(),
        retryPendingPromptDeepLinkIfNeeded: vi.fn(),
      } as any,
      helpTourLauncher: { tryResumeQueue: vi.fn() } as any,
      prayerService: {
        prayers$: prayersSubject.asObservable(),
        allPrayers$: prayersSubject.asObservable(),
        allPersonalPrayers$: allPersonalPrayersSubject.asObservable(),
        loading$: of(false),
        error$: of(null),
      } as any,
      promptService: {
        prompts$: promptsSubject.asObservable(),
        loadPrompts: vi.fn(),
      } as any,
      adminAuthService: {
        isAdmin$: of(false),
        hasAdminEmail$: of(false),
      } as any,
      userSessionService: {
        userSession$: userSessionSubject.asObservable(),
        sessionInitialized$: sessionInitializedSubject.asObservable(),
      } as any,
      badgeService: {
        getBadgeCount$: vi.fn(() => of(0)),
        refreshBadgeCounts: vi.fn(),
      } as any,
      prayerAllowancePolicy: { load: vi.fn().mockResolvedValue(undefined) } as any,
      planningCenter: {
        loadForCurrentUser: vi.fn(),
        loadForUser: vi.fn(),
        subscribe: vi.fn(),
      } as any,
      personalCategoryColorService: { loadColors: vi.fn() } as any,
      memorizationService: { memorizedItems$: of([]) } as any,
      memorizationRecommendationsService: { items$: of([]) } as any,
      prayerGroupService: { prayers$: of([]) } as any,
    });
  });

  it("identifies home URLs", () => {
    expect(isRouterUrlHome("/")).toBe(true);
    expect(isRouterUrlHome("/?filter=memorize")).toBe(true);
    expect(isRouterUrlHome("/presentation")).toBe(false);
  });

  it("wires observable streams and applies default filter on first session", async () => {
    const destroy$ = new Subject<void>();
    coordinator.initialize(destroy$);

    expect(host.assignObservableStreams).toHaveBeenCalled();

    sessionInitializedSubject.next(true);
    userSessionSubject.next({ defaultPrayerView: "personal" });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(host.setActiveFilter).toHaveBeenCalledWith("personal");
    expect(host.setFilter).toHaveBeenCalledWith("personal");
    expect(host.setViewReady).toHaveBeenCalledWith(true);

    destroy$.next();
    destroy$.complete();
  });

  it("reloads Planning Center data when session email emits after logout", () => {
    const destroy$ = new Subject<void>();
    const planningCenter = {
      loadForCurrentUser: vi.fn(),
      loadForUser: vi.fn(),
      subscribe: vi.fn(),
    };
    coordinator.bindHost(host, {
      router: {
        url: "/",
        parseUrl: vi.fn(() => ({ queryParams: {} })),
        events: of(),
      } as any,
      analyticsService: { trackPageView: vi.fn() } as any,
      deepLinkCoordinator: {
        captureInitialQueryParams: vi.fn(),
        consumeInitialEmailFilterTab: vi.fn(() => null),
        consumeInitialHomeAreaFilter: vi.fn(() => null),
        handleNavigationDeepLinks: vi.fn(),
        applyPendingDeepLinksOnViewReady: vi.fn(),
        retryPendingPrayerDeepLinkIfNeeded: vi.fn(),
        retryPendingPromptDeepLinkIfNeeded: vi.fn(),
      } as any,
      helpTourLauncher: { tryResumeQueue: vi.fn() } as any,
      prayerService: {
        prayers$: of([]),
        allPrayers$: of([]),
        allPersonalPrayers$: of([]),
        loading$: of(false),
        error$: of(null),
      } as any,
      promptService: { prompts$: of([]), loadPrompts: vi.fn() } as any,
      adminAuthService: { isAdmin$: of(false), hasAdminEmail$: of(false) } as any,
      userSessionService: {
        userSession$: userSessionSubject.asObservable(),
        sessionInitialized$: sessionInitializedSubject.asObservable(),
      } as any,
      badgeService: {
        getBadgeCount$: vi.fn(() => of(0)),
        refreshBadgeCounts: vi.fn(),
      } as any,
      prayerAllowancePolicy: { load: vi.fn().mockResolvedValue(undefined) } as any,
      planningCenter,
      personalCategoryColorService: { loadColors: vi.fn() } as any,
      memorizationService: { memorizedItems$: of([]) } as any,
      memorizationRecommendationsService: { items$: of([]) } as any,
      prayerGroupService: { prayers$: of([]) } as any,
    });

    coordinator.initialize(destroy$);
    sessionInitializedSubject.next(true);
    userSessionSubject.next({ email: "user@example.com" });
    userSessionSubject.next(null);
    userSessionSubject.next({ email: "user@example.com" });

    expect(planningCenter.loadForUser).toHaveBeenCalledTimes(2);
    expect(planningCenter.loadForUser).toHaveBeenCalledWith("user@example.com");

    destroy$.next();
    destroy$.complete();
  });

  it("redirects to groups when session loads group-only after a stale cache", async () => {
    const destroy$ = new Subject<void>();
    vi.mocked(host.getViewReady).mockReturnValue(true);
    coordinator.initialize(destroy$);
    sessionInitializedSubject.next(true);
    userSessionSubject.next({
      email: "group@example.com",
      defaultPrayerView: "current",
      isChurchMember: true,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.mocked(host.setFilter).mockClear();
    vi.mocked(host.setActiveFilter).mockClear();

    userSessionSubject.next({
      email: "group@example.com",
      defaultPrayerView: "current",
      isChurchMember: false,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(host.setActiveFilter).toHaveBeenCalledWith("groups");
    expect(host.setFilter).toHaveBeenCalledWith("groups");

    destroy$.next();
    destroy$.complete();
  });

  it("syncs personal categories when allPersonalPrayers$ emits an empty list", async () => {
    const destroy$ = new Subject<void>();
    coordinator.initialize(destroy$);

    allPersonalPrayersSubject.next([{ id: "p1", category: "Health" }]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    vi.mocked(host.syncPersonalCategoriesFromPrayers).mockClear();

    allPersonalPrayersSubject.next([]);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(host.syncPersonalCategoriesFromPrayers).toHaveBeenCalledWith([]);

    destroy$.next();
    destroy$.complete();
  });

  it("redirects group-only users to groups after presentation return context", async () => {
    const destroy$ = new Subject<void>();
    vi.mocked(host.getPendingHomeReturnContext).mockReturnValue({
      activeFilter: "current",
    });
    vi.mocked(host.getActiveFilter).mockReturnValue("current");

    coordinator.initialize(destroy$);
    sessionInitializedSubject.next(true);
    userSessionSubject.next({
      email: "group@example.com",
      isChurchMember: false,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(host.applyHomeReturnContext).toHaveBeenCalled();
    expect(host.setActiveFilter).toHaveBeenCalledWith("groups");
    expect(host.setFilter).toHaveBeenCalledWith("groups");

    destroy$.next();
    destroy$.complete();
  });

  it("stores pending return context when navigation arrives before viewReady", () => {
    const destroy$ = new Subject<void>();
    vi.mocked(host.consumeHomeReturnContext).mockReturnValue({
      activeFilter: "personal",
    });

    coordinator.initialize(destroy$);
    routerEvents$.next(new NavigationEnd(1, "/", "/"));

    expect(host.setPendingHomeReturnContext).toHaveBeenCalledWith({
      activeFilter: "personal",
    });

    destroy$.next();
    destroy$.complete();
  });
});
