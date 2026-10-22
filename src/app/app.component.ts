import {
  Component,
  OnInit,
  OnDestroy,
  Injector,
  NgZone,
  ChangeDetectorRef,
  HostListener,
  ChangeDetectionStrategy,
} from "@angular/core";
import { Router, RouterOutlet, NavigationEnd } from "@angular/router";
import { CommonModule } from "@angular/common";
import { Capacitor } from "@capacitor/core";
import { maybeReloadForStaleChunk } from "../lib/stale-chunk-recovery";
import { WEB_BUILD_REVISION } from "../lib/web-build-info";
import {
  liveBuildRevisionUrl,
  maybeReloadIfWebRevisionStale,
  shouldSkipWebRevisionCheck,
} from "../lib/web-revision-reload";
import {
  applyResumePaintHint,
  dispatchAppBecameVisible,
  isAppShellAttached,
  isRoutedPagePainted,
  maybeReloadBlankVisiblePage,
} from "../lib/visible-page-recovery";
import { ToastContainerComponent } from "./components/toast-container/toast-container.component";
import { HelpDriverTourService } from "./services/help-driver-tour.service";
import { AdminDataService } from "./services/admin-data.service";
import { PosthogService } from "./services/posthog.service";
import { ClientPreferencesService } from "./services/client-preferences.service";
import { combineLatest, filter, firstValueFrom, Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";
import {
  UserSessionService,
  type UserSessionData,
} from "./services/user-session.service";
import { groupOnlyChurchSurfaceRedirect } from "./lib/church-member-access";
import { churchPushTarget } from "./lib/prayer-groups-feature";
import type { PushNotificationEvent } from "./services/capacitor.service";
import {
  findAppScrollContainer,
  scrollAppContainerToTop,
  extractNavigationPath,
  shouldSkipAppScrollResetOnNavigation,
} from "./lib/app-scroll-container";

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, RouterOutlet, ToastContainerComponent],
  template: `
    <ng-container>
      <div
        class="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
      >
        @if (helpDriverTour.fullGuidedTourProgress$ | async; as tourProg) {
        <div
          class="fixed top-0 left-0 right-0 z-[10050] pointer-events-none shadow-lg shadow-black/10 dark:shadow-black/40"
          style="padding-top: env(safe-area-inset-top, 0px)"
          role="status"
          aria-live="polite"
        >
          <div
            class="border-b-2 border-emerald-800/25 dark:border-emerald-400/30 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md"
          >
            <div class="h-2.5 w-full bg-gray-200/95 dark:bg-gray-800/95">
              <div
                class="h-full bg-gradient-to-r from-emerald-700 to-emerald-600 dark:from-emerald-500 dark:to-emerald-400 transition-[width] duration-300 ease-out shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
                [style.width.%]="
                  ((tourProg.current + 1) / tourProg.total) * 100
                "
              ></div>
            </div>
            <div class="flex justify-center px-3 py-2.5">
              <span
                class="text-sm sm:text-base font-bold tabular-nums not-dark:text-gray-900 dark:text-white"
              >
                Step {{ tourProg.current + 1 }} of {{ tourProg.total }}
              </span>
            </div>
          </div>
        </div>
        }
        <router-outlet></router-outlet>
        <app-toast-container></app-toast-container>
      </div>
    </ng-container>
  `,
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [],
})
export class AppComponent implements OnInit, OnDestroy {
  title = "prayerapp";
  private lastVisibilityState = !document.hidden;
  private hasBeenHidden = document.hidden;
  private hadPaintedRoutedPage = false;
  private lastNavigationPath: string | null = null;
  private blankResumeCheckTimeoutId: ReturnType<typeof setTimeout> | null =
    null;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private injector: Injector,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
    readonly helpDriverTour: HelpDriverTourService,
    _posthog: PosthogService,
    _clientPreferences: ClientPreferencesService
  ) {
    // Add native-app class immediately so bottom blur strip shows before first paint
    if (Capacitor.isNativePlatform()) {
      document.documentElement.classList.add("native-app");
    }
    // Set up global error handler for unhandled errors
    this.setupGlobalErrorHandler();
    // Listen for navigation events and scroll to top on mobile
    this.setupScrollToTopOnNavigation();
    // Initialize Capacitor for mobile apps
    this.initializeCapacitor();
  }

  /**
   * Initialize Capacitor service for mobile app features.
   * Also inject PushNotificationService so it subscribes to pushToken$ and stores device tokens in the backend.
   */
  private async initializeCapacitor(): Promise<void> {
    try {
      const { Capacitor } = await import("@capacitor/core");
      if (Capacitor.isNativePlatform()) {
        document.documentElement.classList.add("native-app");
      }
      const { CapacitorService } = await import("./services/capacitor.service");
      const { PushNotificationService } = await import(
        "./services/push-notification.service"
      );
      this.injector.get(CapacitorService);
      this.injector.get(PushNotificationService);
    } catch (error) {
      console.debug("Capacitor service not available (running on web)", error);
    }
  }

  /**
   * Setup router navigation listener to scroll to top
   * Critical for mobile (iOS/Edge) where scroll position can get stuck
   */
  private setupScrollToTopOnNavigation(): void {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        const urlAfterRedirects = (event as NavigationEnd).urlAfterRedirects;
        this.noteRoutedPagePaintedIfPresent();
        if (
          shouldSkipAppScrollResetOnNavigation(
            urlAfterRedirects,
            this.lastNavigationPath
          )
        ) {
          this.lastNavigationPath = extractNavigationPath(urlAfterRedirects);
          return;
        }
        this.lastNavigationPath = extractNavigationPath(urlAfterRedirects);
        // Small delay to ensure DOM is updated (home safe-area viewport may mount after route)
        setTimeout(() => {
          this.noteRoutedPagePaintedIfPresent();
          scrollAppContainerToTop(findAppScrollContainer(), "instant");
        }, 0);
      });
  }

  private noteRoutedPagePaintedIfPresent(): void {
    if (isRoutedPagePainted()) {
      this.hadPaintedRoutedPage = true;
    }
  }

  /**
   * Set up a global error handler to catch uncaught errors and prevent blank pages
   */
  private setupGlobalErrorHandler(): void {
    // Catch unhandled promise rejections
    this.ngZone.run(() => {
      window.addEventListener("unhandledrejection", (event) => {
        console.error(
          "[GlobalErrorHandler] Unhandled promise rejection:",
          event.reason
        );
        maybeReloadForStaleChunk(event.reason);
      });

      // Catch global errors
      window.addEventListener("error", (event) => {
        console.error("[GlobalErrorHandler] Global error:", event.error);
        maybeReloadForStaleChunk(event.error, event.message);
      });
    });
  }

  /**
   * Handle window focus event - Edge on iOS needs explicit change detection trigger.
   * Safari often does not fire focus when a background tab is opened again.
   */
  @HostListener("window:focus")
  onWindowFocus(): void {
    console.log(
      "[AppComponent] Window regained focus, triggering change detection"
    );
    this.lastVisibilityState = !document.hidden;
    this.recoverVisiblePage({ allowBlankReload: this.hasBeenHidden });
  }

  /**
   * Safari restores a background tab with visibilitychange and often skips focus.
   * Recover only on the hidden → visible edge. A change while already visible
   * used to be the only path that ran, so returning to the tab did nothing.
   */
  @HostListener("document:visibilitychange")
  onVisibilityChange(): void {
    const visible = !document.hidden;
    if (!visible) {
      this.hasBeenHidden = true;
    }
    const becameVisible = visible && !this.lastVisibilityState;
    this.lastVisibilityState = visible;
    if (!becameVisible) {
      return;
    }
    console.log(
      "[AppComponent] Page became visible, triggering change detection and recovery"
    );
    this.recoverVisiblePage({ allowBlankReload: true });
  }

  /**
   * Safari can fire pageshow without bfcache (`persisted` false) when a tab
   * is brought back. Recover whenever the document is visible.
   */
  @HostListener("window:pageshow", ["$event"])
  onPageShow(event: PageTransitionEvent): void {
    const visible = !document.hidden;
    this.lastVisibilityState = visible;
    if (!visible) {
      return;
    }
    if (event.persisted) {
      console.log("[AppComponent] Page restored from back-forward cache");
    }
    this.recoverVisiblePage({
      allowBlankReload: event.persisted || this.hasBeenHidden,
    });
  }

  private recoverVisiblePage(options?: { allowBlankReload?: boolean }): void {
    this.ngZone.run(() => {
      this.cdr.markForCheck();
      this.cdr.detectChanges();
      applyResumePaintHint();
      this.repaintAfterResume();
      dispatchAppBecameVisible();
      this.triggerDOMRecoveryIfNeeded(options?.allowBlankReload === true);
      this.checkWebRevision();
    });
  }

  private checkWebRevision(): void {
    if (typeof window === "undefined") {
      return;
    }
    if (
      shouldSkipWebRevisionCheck({
        hostname: window.location.hostname,
        currentRevision: WEB_BUILD_REVISION,
      })
    ) {
      return;
    }
    void maybeReloadIfWebRevisionStale({
      revisionUrl: liveBuildRevisionUrl(window.location.origin),
      fetchFn: fetch,
      timeoutMs: 4000,
      hidden: document.hidden,
      bypassThrottle: true,
    });
  }

  /** WebKit can drop the composited layer while a tab is frozen. A reflow paints it again. */
  private repaintAfterResume(): void {
    const body = document.body;
    if (!body) {
      return;
    }
    const previous = body.style.opacity;
    body.style.opacity = "0.999";
    void body.offsetHeight;
    body.style.opacity = previous;
  }

  /**
   * Check if router-outlet is still attached to DOM
   * On Edge/iOS, the DOM can be detached during background suspension
   */
  private triggerDOMRecoveryIfNeeded(allowBlankReload: boolean): void {
    try {
      const painted = isRoutedPagePainted();
      if (painted) {
        this.noteRoutedPagePaintedIfPresent();
        maybeReloadBlankVisiblePage({
          hidden: document.hidden,
          painted: true,
          previouslyPainted: true,
          shellAttached: true,
        });
        return;
      }
      if (
        document.hidden ||
        !allowBlankReload ||
        !this.hadPaintedRoutedPage ||
        isAppShellAttached()
      ) {
        return;
      }
      console.warn("[AppComponent] No routed page painted after resume");
      this.cdr.detectChanges();
      if (this.blankResumeCheckTimeoutId != null) {
        clearTimeout(this.blankResumeCheckTimeoutId);
      }
      this.blankResumeCheckTimeoutId = setTimeout(() => {
        this.blankResumeCheckTimeoutId = null;
        if (document.hidden) {
          return;
        }
        this.cdr.markForCheck();
        this.cdr.detectChanges();
        maybeReloadBlankVisiblePage({
          hidden: document.hidden,
          painted: isRoutedPagePainted(),
          previouslyPainted: this.hadPaintedRoutedPage,
          shellAttached: isAppShellAttached(),
        });
      }, 300);
    } catch (err) {
      console.debug("[AppComponent] DOM recovery check failed:", err);
    }
  }

  ngOnInit() {
    this.handleApprovalCode();
    this.setupPushRefreshListener();
    this.watchChurchRouteAccess();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.blankResumeCheckTimeoutId != null) {
      clearTimeout(this.blankResumeCheckTimeoutId);
      this.blankResumeCheckTimeoutId = null;
    }
  }

  private watchChurchRouteAccess(): void {
    const session = this.injector.get(UserSessionService);
    if (!session.sessionInitialized$ || !session.userSession$) {
      return;
    }
    combineLatest([session.sessionInitialized$, session.userSession$])
      .pipe(
        filter(([ready]) => ready),
        takeUntil(this.destroy$)
      )
      .subscribe(([, row]) => {
        this.leaveChurchSurfacesIfGroupOnly(row);
      });
  }

  private leaveChurchSurfacesIfGroupOnly(
    row: UserSessionData | null
  ): void {
    const tree = this.router.parseUrl(this.router.url);
    const redirect = groupOnlyChurchSurfaceRedirect({
      path: this.router.url,
      session: row ?? {},
      query: (key) => {
        const value = tree.queryParams[key];
        return typeof value === "string" ? value : null;
      },
    });
    if (!redirect) {
      return;
    }
    void this.router.navigate(redirect.commands, {
      queryParams: redirect.queryParams,
    });
  }

  /**
   * Old email links used a `code` query param. Account approval uses the
   * admin portal, the same path as prayer approval. The guard sends a
   * signed-out visitor to login.
   */
  private handleApprovalCode() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code) return;

    window.history.replaceState({}, "", window.location.pathname);
    this.router.navigate(["/admin"]);
  }


  /**
   * Subscribe to native push notification events and refresh prayers when relevant.
   * This only has effect in the Capacitor (native) app where push notifications are active.
   */
  private async setupPushRefreshListener(): Promise<void> {
    try {
      const { CapacitorService } = await import("./services/capacitor.service");
      const { PrayerService } = await import("./services/prayer.service");
      const { PrayerGroupService } = await import("./services/prayer-group.service");
      const { PromptService } = await import("./services/prompt.service");

      const capacitorService = this.injector.get(CapacitorService);
      const prayerService = this.injector.get(PrayerService);
      const prayerGroupService = this.injector.get(PrayerGroupService);
      const promptService = this.injector.get(PromptService);

      capacitorService.notificationEvents$
        .pipe(
          filter((event) => event.source === "tap"),
          filter((event) => Boolean(event.data?.["groupId"]))
        )
        .subscribe((event) => {
          void this.openGroupActivityPush(event, prayerGroupService);
        });

      capacitorService.notificationEvents$
        .pipe(
          filter((event) => event.source === "tap"),
          filter((event) => !event.data?.["groupId"]),
          filter(
            (event) =>
              event.type === "prayer_update" ||
              event.type === "prayer_approved" ||
              event.type === "update_approved"
          )
        )
        .subscribe((event) => {
          console.log(
            "[AppComponent] Push notification tapped, refreshing prayers:",
            event
          );
          prayerService.loadPrayers(false).catch((err) => {
            console.error(
              "[AppComponent] Failed to refresh prayers after push:",
              err
            );
          });
        });

      // Navigate to admin when an admin push notification is tapped
      capacitorService.notificationEvents$
        .pipe(
          filter((event) => event.source === "tap"),
          filter((event) => event.data?.["target"] === "admin")
        )
        .subscribe(() => {
          // Pre-fetch admin data so the approval list is ready when the page loads.
          // Run in NgZone so change detection runs when the app was resumed from background.
          const adminDataService = this.injector.get(AdminDataService);
          adminDataService.fetchAdminData(false, true).catch((err) => {
            console.error(
              "[AppComponent] Failed to pre-fetch admin data after push tap:",
              err
            );
          });
          this.ngZone.run(() => {
            this.router.navigate(["/admin"]);
          });
        });

      // Open Memorize tab when a memorization reminder push is tapped
      capacitorService.notificationEvents$
        .pipe(
          filter((event) => event.source === "tap"),
          filter((event) => event.type === "memorization_reminder")
        )
        .subscribe(() => {
          this.ngZone.run(() => {
            void this.router.navigate(["/"], {
              queryParams: { filter: "memorize" },
            });
          });
        });

      // Open Memorize tab with verse when a verse memorization prayer push is tapped
      capacitorService.notificationEvents$
        .pipe(
          filter((event) => event.source === "tap"),
          filter((event) => event.type === "verse_memorization_prayer")
        )
        .subscribe((event) => {
          const verseRef =
            typeof event.data?.["verseRef"] === "string"
              ? event.data["verseRef"]
              : null;
          const verseTranslation =
            typeof event.data?.["verseTranslation"] === "string"
              ? event.data["verseTranslation"]
              : null;
          const queryParams: Record<string, string> = { filter: "memorize" };
          if (verseRef) {
            queryParams["verseRef"] = verseRef;
          }
          if (verseTranslation) {
            queryParams["verseTranslation"] = verseTranslation;
          }
          this.ngZone.run(() => {
            void this.router.navigate(["/"], { queryParams });
          });
        });

      capacitorService.notificationEvents$
        .pipe(
          filter((event) => event.source === "tap"),
          filter(
            (event) =>
              event.type === "prayer_item_reminder" ||
              event.type === "prayer_reminder"
          )
        )
        .subscribe((event) => {
          const prayerId =
            typeof event.data?.["prayerId"] === "string"
              ? event.data["prayerId"]
              : null;
          if (event.type === "prayer_reminder" && !prayerId) {
            return;
          }
          const prayerKind =
            typeof event.data?.["prayerKind"] === "string"
              ? event.data["prayerKind"]
              : null;
          const promptId =
            typeof event.data?.["promptId"] === "string"
              ? event.data["promptId"]
              : null;
          this.ngZone.run(() => {
            void this.openChurchOrGroupReminder({
              event: event.type === "prayer_reminder"
                ? "prayer_reminder"
                : "prayer_item_reminder",
              prayerKind,
              prayerId,
              promptId,
              prayerService,
              promptService,
              prayerGroupService,
            });
          });
        });
    } catch (error) {
      // Likely running on web where Capacitor/PrayerService lazy imports may not be needed
      console.debug(
        "[AppComponent] Push refresh listener not initialized (probably web):",
        error
      );
    }
  }

  private async whenSessionReady(): Promise<UserSessionData | null> {
    const sessionService = this.injector.get(UserSessionService);
    await firstValueFrom(
      sessionService.sessionInitialized$.pipe(filter((ready) => ready)),
    );
    return firstValueFrom(sessionService.userSession$);
  }

  private async openGroupActivityPush(
    event: PushNotificationEvent,
    prayerGroupService: { loadCatalog(forceRefresh?: boolean): Promise<void> },
  ): Promise<void> {
    await this.whenSessionReady();
    const groupId = String(event.data!["groupId"]);
    const prayerId = event.data?.["prayerId"];
    void prayerGroupService.loadCatalog(true);
    await this.ngZone.run(() =>
      this.router.navigate(["/"], {
        queryParams: {
          filter: "groups",
          groupId,
          ...(prayerId ? { prayerId: String(prayerId) } : {}),
        },
      }),
    );
  }

  private async openChurchOrGroupReminder(input: {
    event: "prayer_item_reminder" | "prayer_reminder";
    prayerKind: string | null;
    prayerId: string | null;
    promptId: string | null;
    prayerService: { loadPrayers(silentRefresh?: boolean): Promise<void> };
    promptService: { loadPrompts(): Promise<void> };
    prayerGroupService: { loadCatalog(forceRefresh?: boolean): Promise<void> };
  }): Promise<void> {
    const row = await this.whenSessionReady();
    const target = churchPushTarget({
      event: input.event,
      prayerKind: input.prayerKind,
      prayerId: input.prayerId,
      promptId: input.promptId,
      session: row ?? {},
    });
    switch (target.kind) {
      case "church_prayer":
        await this.router.navigate(["/"], {
          queryParams: target.prayerId ? { prayerId: target.prayerId } : {},
        });
        await input.prayerService.loadPrayers(false).catch((err) => {
          console.error(
            "[AppComponent] Failed to refresh prayers after reminder tap:",
            err
          );
        });
        break;
      case "groups":
        void input.prayerGroupService.loadCatalog(true);
        await this.router.navigate(["/"], {
          queryParams: target.prayerId
            ? { filter: "groups", prayerId: target.prayerId }
            : { filter: "groups" },
        });
        break;
      case "personal":
        await this.router.navigate(["/"], {
          queryParams: { filter: "personal" },
        });
        break;
      case "prompt":
        await this.router.navigate(["/"], {
          queryParams: { promptId: target.promptId },
        });
        void input.promptService.loadPrompts();
        break;
      default: {
        const _never: never = target;
        return _never;
      }
    }
  }
}
