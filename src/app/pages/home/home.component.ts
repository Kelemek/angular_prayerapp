import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Router, ActivatedRoute } from "@angular/router";
import { PrayerFormComponent } from "../../components/prayer-form/prayer-form.component";
import { PrayerFiltersComponent } from "../../components/prayer-filters/prayer-filters.component";
import { MemorizationRecommendationsService } from "../../services/memorization-recommendations.service";
import { ScriptureService } from "../../services/scripture.service";
import { SkeletonLoaderComponent } from "../../components/skeleton-loader/skeleton-loader.component";
import {
  PROMPT_TYPE_CHIP_ACTIVE_CLASS,
  PROMPT_TYPE_CHIP_INACTIVE_CLASS,
} from "../../lib/prompt-type-chip-classes";
import {
  PrayerService,
  PrayerRequest,
} from "../../services/prayer.service";
import { PromptService } from "../../services/prompt.service";
import { AdminAuthService } from "../../services/admin-auth.service";
import { UserSessionService } from "../../services/user-session.service";
import { BadgeService } from "../../services/badge.service";
import { Observable, Subject } from "rxjs";
import { PlanningCenterListService } from "../../services/planning-center-list.service";
import { ToastService } from "../../services/toast.service";
import { PrayerCardActionsFacade } from "../../services/prayer-card-actions.facade";
import { PrayerAllowancePolicyService } from "../../services/prayer-allowance-policy.service";
import { HomeDeepLinkCoordinator } from "../../services/home-deep-link.coordinator";
import type { HomeDeepLinkHostAdapter } from "../../services/home-deep-link-host.adapter";
import type { AllowanceLevel } from "../../types/prayer";
import { PersonalCategoryColorService } from "../../services/personal-category-color.service";
import { AnalyticsService } from "../../services/analytics.service";
import { PullToRefreshDirective } from "../../directives/pull-to-refresh.directive";
import { ScrollingModule } from "@angular/cdk/scrolling";
import {
  PERSONAL_PRAYER_WALKTHROUGH_DESCRIPTION,
  PERSONAL_PRAYER_WALKTHROUGH_PRAYER_FOR,
} from "../../services/help-driver-tour.service";
import { HomeHelpTourLauncher } from "../../services/home-help-tour.launcher";
import { HomeCatalogStore } from "../../services/home-catalog.store";
import { HomeFilterCoordinator } from "../../services/home-filter.coordinator";
import { HomePersonalCategoryController } from "../../services/home-personal-category.controller";
import { HomeMemorizationPanelController } from "../../services/home-memorization-panel.controller";
import { HomePlanningCenterController } from "../../services/home-planning-center.controller";
import { HomeLifecycleCoordinator } from "../../services/home-lifecycle.coordinator";
import { HomeModalController } from "../../services/home-modal.controller";
import { HomeRefreshCoordinator } from "../../services/home-refresh.coordinator";
import { PresentationHomeHandoffCoordinator } from "../../services/presentation-home-handoff.coordinator";
import { HomeAdminNavigationController } from "../../services/home-admin-navigation.controller";
import { HomePrayerCardActionsController } from "../../services/home-prayer-card-actions.controller";
import { HomePresentationNavigationController } from "../../services/home-presentation-navigation.controller";
import { HomeHeaderComponent } from "../../components/home-header/home-header.component";
import { HomeModalsHostComponent } from "../../components/home-modals-host/home-modals-host.component";
import { HomeFilterTabsComponent } from "../../components/home-filter-tabs/home-filter-tabs.component";
import { HomePromptTypeFiltersComponent } from "../../components/home-prompt-type-filters/home-prompt-type-filters.component";
import { HomePersonalCategoryFiltersComponent } from "../../components/home-personal-category-filters/home-personal-category-filters.component";
import { HomePublicStatusFiltersComponent } from "../../components/home-public-status-filters/home-public-status-filters.component";
import { HomePrayerContentComponent } from "../../components/home-prayer-content/home-prayer-content.component";
import { ScrollToTopButtonComponent } from "../../components/scroll-to-top-button/scroll-to-top-button.component";
import { isPublicTabFilter, isCommunityPrayerFilter } from "../../lib/home-community-filter";
import { HOME_SHELL_FOOTER_BORDER_TOP_CLASS } from "../../lib/home-sub-filter-chip-classes";
import {
  createHomeCatalogBindings,
  readHomeFilteredPersonalPrayers,
  syncHomeCatalog,
  wireHomeCoordinators,
  type HomeCoordinatorWiringPage,
} from "../../services/home-coordinator-wiring";
import type { HomeLifecyclePageBindings } from "../../services/home-lifecycle-host.adapter";
import type { PrayerPrompt } from "../../components/prompt-card/prompt-card.component";
import type { PrayerFilters } from "../../components/prayer-filters/prayer-filters.component";
import type { HomeActiveFilter } from "../../services/home-deep-link-host.adapter";
import { MemorizationService } from "../../services/memorization.service";
import { PrayerEncouragementService } from "../../services/prayer-encouragement.service";
import {
  createHomePageShell,
  type HomePageShell,
} from "../../lib/home-page-shell";

@Component({
  selector: "app-home",
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    HomeHeaderComponent,
    HomeModalsHostComponent,
    HomeFilterTabsComponent,
    HomePromptTypeFiltersComponent,
    HomePersonalCategoryFiltersComponent,
    HomePublicStatusFiltersComponent,
    HomePrayerContentComponent,
    ScrollToTopButtonComponent,
    PrayerFiltersComponent,
    SkeletonLoaderComponent,
    PullToRefreshDirective,
    ScrollingModule,
  ],
  templateUrl: "./home.component.html",
  styleUrl: "./home.component.css",
  providers: [
    HomeDeepLinkCoordinator,
    HomeHelpTourLauncher,
    HomeCatalogStore,
    HomeFilterCoordinator,
    HomePersonalCategoryController,
    HomeMemorizationPanelController,
    HomePlanningCenterController,
    HomeLifecycleCoordinator,
    HomeModalController,
    HomeRefreshCoordinator,
    PresentationHomeHandoffCoordinator,
    HomeAdminNavigationController,
    HomePrayerCardActionsController,
    HomePresentationNavigationController,
  ],
})
export class HomeComponent
  implements OnInit, OnDestroy, HomeCoordinatorWiringPage, HomeLifecyclePageBindings
{
  prayers$!: Observable<PrayerRequest[]>;
  prompts$!: Observable<PrayerPrompt[]>;
  loading$!: Observable<boolean>;
  error$!: Observable<string | null>;
  isAdmin$!: Observable<boolean>;
  hasAdminEmail$!: Observable<boolean>;

  currentPrayers: PrayerRequest[] = [];
  personalPrayers: PrayerRequest[] = [];

  currentPrayerBadge$!: Observable<number>;
  answeredPrayerBadge$!: Observable<number>;
  promptBadge$!: Observable<number>;

  currentPrayersCount = 0;
  answeredPrayersCount = 0;
  archivedPrayersCount = 0;
  totalPrayersCount = 0;
  promptsCount = 0;
  personalPrayersCount = 0;

  filters: PrayerFilters = { status: "current" };
  isRefreshing = false;
  hasLogo = false;
  activeFilter: HomeActiveFilter = "current";
  viewReady = false;
  selectedPromptTypes: string[] = [];
  lastExplicitRefreshAt = 0;

  isAdmin = false;

  readonly promptTypeActiveClass = PROMPT_TYPE_CHIP_ACTIVE_CLASS;
  readonly promptTypeInactiveClass = PROMPT_TYPE_CHIP_INACTIVE_CLASS;
  readonly personalWalkthroughPrayerFor = PERSONAL_PRAYER_WALKTHROUGH_PRAYER_FOR;
  readonly personalWalkthroughDescription =
    PERSONAL_PRAYER_WALKTHROUGH_DESCRIPTION;

  readonly isPublicTabFilter = isPublicTabFilter;
  readonly isCommunityPrayerFilter = isCommunityPrayerFilter;
  readonly bottomSafeBarClass = `bottom-safe-bar w-full bg-white/50 dark:bg-gray-800/50 backdrop-blur-md ${HOME_SHELL_FOOTER_BORDER_TOP_CLASS} sticky bottom-0 z-50`;

  personalCategoryPickerPrayerId: string | null = null;

  readonly shell: HomePageShell;

  private destroy$ = new Subject<void>();
  private deepLinkHost!: HomeDeepLinkHostAdapter;

  @ViewChild("modalsHost") private modalsHost?: HomeModalsHostComponent;
  @ViewChild(HomePrayerContentComponent)
  private prayerContent?: HomePrayerContentComponent;
  @ViewChild("memorizeKeyboardBridge")
  private memorizeKeyboardBridge?: ElementRef<HTMLInputElement>;

  get deletionsAllowed(): AllowanceLevel {
    return this.prayerAllowancePolicy.deletionsAllowed;
  }

  get updatesAllowed(): AllowanceLevel {
    return this.prayerAllowancePolicy.updatesAllowed;
  }

  constructor(
    public prayerService: PrayerService,
    public promptService: PromptService,
    public adminAuthService: AdminAuthService,
    public userSessionService: UserSessionService,
    public planningCenterListService: PlanningCenterListService,
    public badgeService: BadgeService,
    public memorizationService: MemorizationService,
    public prayerEncouragementService: PrayerEncouragementService,
    public memorizationRecommendationsService: MemorizationRecommendationsService,
    private scriptureService: ScriptureService,
    private toastService: ToastService,
    private analyticsService: AnalyticsService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private route: ActivatedRoute,
    private personalCategoryColorService: PersonalCategoryColorService,
    readonly prayerCardActions: PrayerCardActionsFacade,
    readonly prayerAllowancePolicy: PrayerAllowancePolicyService,
    private readonly deepLinkCoordinator: HomeDeepLinkCoordinator,
    readonly helpTour: HomeHelpTourLauncher,
    readonly catalog: HomeCatalogStore,
    readonly filter: HomeFilterCoordinator,
    readonly personalCategory: HomePersonalCategoryController,
    readonly memorizationPanel: HomeMemorizationPanelController,
    readonly planningCenter: HomePlanningCenterController,
    private readonly lifecycleCoordinator: HomeLifecycleCoordinator,
    readonly modals: HomeModalController,
    readonly refresh: HomeRefreshCoordinator,
    readonly presentationNav: HomePresentationNavigationController,
    readonly adminNav: HomeAdminNavigationController,
    readonly memberCardActions: HomePrayerCardActionsController
  ) {
    const windowCache = (window as { __cachedLogos?: { useLogo?: boolean } })
      .__cachedLogos;
    this.hasLogo =
      windowCache?.useLogo ||
      localStorage.getItem("branding_use_logo") === "true";

    const wired = wireHomeCoordinators({
      page: this,
      filterPage: this,
      lifecyclePage: this,
      cdr: this.cdr,
      router: this.router,
      route: this.route,
      prayerService: this.prayerService,
      promptService: this.promptService,
      adminAuthService: this.adminAuthService,
      userSessionService: this.userSessionService,
      planningCenterListService: this.planningCenterListService,
      badgeService: this.badgeService,
      memorizationService: this.memorizationService,
      memorizationRecommendationsService: this.memorizationRecommendationsService,
      scriptureService: this.scriptureService,
      personalCategoryColorService: this.personalCategoryColorService,
      toastService: this.toastService,
      analyticsService: this.analyticsService,
      prayerCardActions: this.prayerCardActions,
      prayerAllowancePolicy: this.prayerAllowancePolicy,
      deepLinkCoordinator: this.deepLinkCoordinator,
      helpTourLauncher: this.helpTour,
      catalog: this.catalog,
      filterCoordinator: this.filter,
      personalCategory: this.personalCategory,
      memorizationPanel: this.memorizationPanel,
      planningCenter: this.planningCenter,
      lifecycleCoordinator: this.lifecycleCoordinator,
      modals: this.modals,
      refreshCoordinator: this.refresh,
      presentationNav: this.presentationNav,
    });
    this.deepLinkHost = wired.deepLinkHost;

    this.shell = createHomePageShell({
      prayerCardActions: this.prayerCardActions,
      memberCardActions: this.memberCardActions,
      modals: this.modals,
      filter: this.filter,
      personalCategory: this.personalCategory,
      memorizationPanel: this.memorizationPanel,
      helpTour: this.helpTour,
      adminNav: this.adminNav,
      presentationNav: this.presentationNav,
      memorizationRecommendationsService: this.memorizationRecommendationsService,
      planningCenterListId: () => this.planningCenter.planningCenterListId,
      catalog: this.catalog,
      getActiveFilter: () => this.activeFilter,
      getPersonalPrayers: () => this.personalPrayers,
    });
  }

  ngOnInit(): void {
    this.lifecycleCoordinator.initialize(this.destroy$);
  }

  ngOnDestroy(): void {
    this.personalCategory.dispose();
    this.destroy$.next();
    this.destroy$.complete();
  }

  getCatalogBindings() {
    return createHomeCatalogBindings({
      personalPrayers: this.personalPrayers,
      planningCenterPrayers: this.planningCenter.filteredPlanningCenterPrayers,
      prompts: this.promptService.promptsSubject.value,
      activeFilter: this.activeFilter,
      filters: this.filters,
      personalCategoryFilterMode: this.personalCategory.personalCategoryFilterMode,
      selectedPersonalCategories: this.personalCategory.selectedPersonalCategories,
      selectedPromptTypes: this.selectedPromptTypes,
    });
  }

  refreshHomeCatalog(): void {
    syncHomeCatalog(this.catalog, this.getCatalogBindings());
  }

  getFilteredPersonalPrayers(): PrayerRequest[] {
    return readHomeFilteredPersonalPrayers(this.catalog, this.getCatalogBindings());
  }

  getPrayerFormComp(): PrayerFormComponent | undefined {
    return this.modalsHost?.prayerFormComp;
  }

  getMemorizeKeyboardBridge(): HTMLInputElement | undefined {
    return this.memorizeKeyboardBridge?.nativeElement;
  }

  scrollHomePromptIntoView(promptId: string): boolean {
    return this.prayerContent?.scrollPromptIntoView(promptId) ?? false;
  }

  scrollHomePrayerIntoView(prayerId: string): boolean {
    return this.prayerContent?.scrollPrayerIntoView(prayerId) ?? false;
  }

  usesVirtualScrollMainLayout(activeFilter: HomeActiveFilter): boolean {
    return (
      activeFilter === "prompts" || isCommunityPrayerFilter(activeFilter)
    );
  }

  onPersonalCategoryPickerOpenChange(prayerId: string, open: boolean): void {
    this.personalCategoryPickerPrayerId = open ? prayerId : null;
  }
}
