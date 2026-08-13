import {
  Component,
  OnInit,
  OnDestroy,
  HostListener,
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  ViewChild,
  ElementRef,
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Subject } from "rxjs";
import { distinctUntilChanged, takeUntil } from "rxjs/operators";
import { PromptService } from "../../services/prompt.service";
import { UserSessionService } from "../../services/user-session.service";
import { PlanningCenterListService } from "../../services/planning-center-list.service";
import { ThemeService, type Theme } from "../../services/theme.service";
import {
  HomeReturnContext,
  PresentationTimeFilter,
  SelectablePresentationContentType,
} from "../../types/presentation";
import { PresentationToolbarComponent } from "../../components/presentation-toolbar/presentation-toolbar.component";
import { PrayerPrompt } from "../../components/prompt-card/prompt-card.component";
import { PresentationSlideCardComponent } from "../../components/presentation-slide-card/presentation-slide-card.component";
import { PrayerAllowancePolicyService } from "../../services/prayer-allowance-policy.service";
import {
  PresentationCatalogStore,
  type PresentationSlideItem,
  isPresentationPrompt,
} from "../../services/presentation-catalog.store";
import { PresentationSettingsModalComponent } from "../../components/presentation-settings-modal/presentation-settings-modal.component";
import { HelpDriverTourService } from "../../services/help-driver-tour.service";
import { PresentationPlaybackController } from "../../services/presentation-playback.controller";
import { PresentationPlaybackHostAdapter } from "../../services/presentation-playback-host.adapter";
import { PresentationContentCoordinator } from "../../services/presentation-content.coordinator";
import { PresentationContentLoader } from "../../services/presentation-content-loader";
import { PresentationPrayerTimerController } from "../../services/presentation-prayer-timer.controller";
import { PresentationPrayerTimerHostAdapter } from "../../services/presentation-prayer-timer-host.adapter";
import { PresentationControlsInputController } from "../../services/presentation-controls-input.controller";
import { PresentationControlsInputHostAdapter } from "../../services/presentation-controls-input-host.adapter";
import { PresentationHelpTourLauncher } from "../../services/presentation-help-tour.launcher";
import { PresentationHelpTourHostAdapter } from "../../services/presentation-help-tour-host.adapter";
import { PresentationHomeHandoffCoordinator } from "../../services/presentation-home-handoff.coordinator";
import { PresentationSettingsCoordinator } from "../../services/presentation-settings.coordinator";
import {
  getPresentationContentLoadingLabel,
  getPresentationEmptyContentMessage,
} from "../../lib/presentation-content-messages";
import { shuffleCopy } from "../../lib/shuffle-copy";
import type { PrayerRequest } from "../../services/prayer.service";

@Component({
  selector: "app-presentation",
  standalone: true,
  providers: [
    PresentationCatalogStore,
    PresentationPlaybackController,
    PresentationContentLoader,
    PresentationContentCoordinator,
    PresentationPrayerTimerController,
    PresentationControlsInputController,
    PresentationHelpTourLauncher,
    PresentationHomeHandoffCoordinator,
    PresentationSettingsCoordinator,
  ],
  imports: [
    PresentationToolbarComponent,
    PresentationSlideCardComponent,
    PresentationSettingsModalComponent,
  ],
  templateUrl: './presentation.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './presentation.component.css',
})
export class PresentationComponent implements OnInit, OnDestroy {
  planningCenterListMembers: Array<{
    id: string;
    name: string;
    avatar?: string | null;
  }> = [];
  hasPlanningCenterList = false;
  get hasMembers(): boolean {
    return (
      this.hasPlanningCenterList ||
      (this.planningCenterListMembers &&
        this.planningCenterListMembers.length > 0)
    );
  }
  currentIndex = 0;
  displayDuration = 10;
  smartMode = true;
  showSettings = false;
  loading = true;
  showControls = true;
  contentTypes: SelectablePresentationContentType[] = ["prayers"];
  statusFilters = { current: true, answered: true };
  timeFilter: PresentationTimeFilter = "all";
  randomize = false;
  loop = true;
  selectedPersonalCategories: string[] = [];
  uniquePersonalCategories: string[] = [];
  selectedPromptCategories: string[] = [];
  uniquePromptCategories: string[] = [];

  prayerTimerMinutes = 10;
  showTimerNotification = false;
  showSmartModeDetails = false;

  initialPeriodElapsed = false;

  @ViewChild("presentationScroll")
  presentationScrollRef?: ElementRef<HTMLElement>;

  homeReturnContext: HomeReturnContext | null = null;

  /** Completes on destroy so prompt count sync unsubscribes. */
  private readonly destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private promptService: PromptService,
    private userSessionService: UserSessionService,
    private cdr: ChangeDetectorRef,
    private helpDriverTourService: HelpDriverTourService,
    private readonly planningCenterListService: PlanningCenterListService,
    private readonly themeService: ThemeService,
    readonly prayerAllowancePolicy: PrayerAllowancePolicyService,
    readonly catalog: PresentationCatalogStore,
    readonly playback: PresentationPlaybackController,
    readonly prayerTimer: PresentationPrayerTimerController,
    readonly controlsInput: PresentationControlsInputController,
    private readonly contentCoordinator: PresentationContentCoordinator,
    private readonly helpTourLauncher: PresentationHelpTourLauncher,
    private readonly homeHandoffCoordinator: PresentationHomeHandoffCoordinator,
    private readonly settingsCoordinator: PresentationSettingsCoordinator
  ) {}

  private prayerTimerHost!: PresentationPrayerTimerHostAdapter;
  private controlsInputHost!: PresentationControlsInputHostAdapter;
  private helpTourHost!: PresentationHelpTourHostAdapter;

  get prayerTimerActive(): boolean {
    return this.prayerTimer.active;
  }

  set prayerTimerActive(value: boolean) {
    this.prayerTimer.active = value;
  }

  get prayerTimerRemaining(): number {
    return this.prayerTimer.remainingSeconds;
  }

  set prayerTimerRemaining(value: number) {
    this.prayerTimer.remainingSeconds = value;
  }

  get theme(): Theme {
    return this.themeService.getTheme();
  }

  private wireControllers(): void {
    this.playback.bindHost(
      new PresentationPlaybackHostAdapter(this, this.cdr)
    );
    this.prayerTimerHost = new PresentationPrayerTimerHostAdapter(this, this.cdr);
    this.controlsInputHost = new PresentationControlsInputHostAdapter(this, {
      onNextSlide: () => this.playback.nextSlide(),
      onPreviousSlide: () => this.playback.previousSlide(),
      onTogglePlay: () => this.playback.togglePlay(),
      onExitPresentation: () => this.exitPresentation(),
    });
    this.helpTourHost = new PresentationHelpTourHostAdapter(this, {
      markForCheck: () => this.cdr.markForCheck(),
      exitPresentation: () => this.exitPresentation(),
      cancelControlsInitialTimer: () =>
        this.controlsInput.cancelInitialAutoHideTimer(),
    });
  }

  ngOnInit(): void {
    this.wireControllers();
    this.settingsCoordinator.loadInto(this);
    this.homeHandoffCoordinator.consumeAndApplyFromRoute(
      this,
      this.router,
      this.route
    );
    // Presentation slide prompts mirror PromptService (single source of truth).
    this.promptService.prompts$
      .pipe(takeUntil(this.destroy$))
      .subscribe((servicePrompts) => {
        this.catalog.syncPromptsFromService(servicePrompts);
        this.clampCurrentIndexToVisibleDeck();
        this.cdr.markForCheck();
      });
    this.userSessionService.userSession$
      .pipe(
        distinctUntilChanged((prev, curr) => prev?.email === curr?.email),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.catalog.clearPromptPrayedForFloors();
      });
    // Load Planning Center members before setting up content
    this.loadPlanningCenterMembers().then(async () => {
      await this.prayerAllowancePolicy.load();
      this.sanitizeContentTypesForAvailableContent();
      this.loadContent();
      this.setupControlsAutoHide();
    });
  }

  /** Keep slide prompt lists in sync when Pray For increments on a prompt card. */
  onPresentationPromptPrayedForCountChange(event: {
    promptId: string;
    count: number;
  }): void {
    this.catalog.setPromptPrayedForFloor(event.promptId, event.count);
    this.catalog.patchItem(event.promptId, { prayed_for_count: event.count });
    this.cdr.markForCheck();
  }

  /** Keep slide prayer lists in sync when Pray For increments on a prayer card. */
  onPresentationPrayerPrayedForCountChange(event: {
    prayerId: string;
    count: number;
  }): void {
    this.catalog.patchItem(event.prayerId, { prayed_for_count: event.count });
    this.cdr.markForCheck();
  }

  /** Keep slide personal prayer category/status in sync when answered is toggled. */
  onPresentationPersonalPrayerCategoryChange(event: {
    prayerId: string;
    category: string | null;
    status: string;
  }): void {
    this.catalog.patchItem(event.prayerId, {
      category: event.category,
      status: event.status as PrayerRequest["status"],
    });
    this.cdr.markForCheck();
  }

  onSlideItemRemoved(id: string): void {
    this.catalog.removeItem(id);
    this.clampCurrentIndexToVisibleDeck();
    this.cdr.markForCheck();
  }

  private clampCurrentIndexToVisibleDeck(): void {
    if (this.currentIndex >= this.items.length) {
      this.currentIndex = Math.max(0, this.items.length - 1);
    }
  }

  async onSlideItemMutated(id: string): Promise<void> {
    await this.contentCoordinator.patchSlideItemAfterMutation(this.catalog, id);
    this.cdr.markForCheck();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.helpDriverTourService.destroy();
    this.playback.destroy();
    this.controlsInput.destroy();
    this.prayerTimer.destroy();
  }

  setupControlsAutoHide(): void {
    this.controlsInput.setupAutoHide(this.controlsInputHost);
  }

  @HostListener("window:mousemove", ["$event"])
  handleMouseMove(event: MouseEvent): void {
    this.controlsInput.handleMouseMove(event, this.controlsInputHost);
  }

  @HostListener("touchstart", ["$event"])
  onTouchStart(event: TouchEvent): void {
    this.controlsInput.onTouchStart(event, this.controlsInputHost);
  }

  @HostListener("touchmove", ["$event"])
  onTouchMove(event: TouchEvent): void {
    this.controlsInput.onTouchMove(event);
  }

  @HostListener("touchend")
  onTouchEnd(): void {
    this.controlsInput.onTouchEnd(this.controlsInputHost);
  }

  @HostListener("window:keydown", ["$event"])
  handleKeyboard(event: KeyboardEvent): void {
    this.controlsInput.handleKeyboard(event, this.controlsInputHost);
  }

  persistSettings(): void {
    this.settingsCoordinator.persistFrom(this);
  }

  handleSmartModeChange(enabled: boolean): void {
    this.settingsCoordinator.applyAndPersist(this, { smartMode: enabled });
  }

  handleDisplayDurationChange(seconds: number): void {
    this.settingsCoordinator.applyAndPersist(this, { displayDuration: seconds });
  }

  handlePrayerTimerMinutesChange(minutes: number): void {
    this.settingsCoordinator.applyAndPersist(this, { prayerTimerMinutes: minutes });
  }

  handleLoopChange(enabled: boolean): void {
    this.settingsCoordinator.applyAndPersist(this, { loop: enabled });
  }

  async loadPlanningCenterMembers(): Promise<void> {
    try {
      await this.planningCenterListService.loadForCurrentUser();
      this.syncPlanningCenterFromService();
    } catch (error) {
      console.error(
        "[Presentation] Error loading Planning Center members:",
        error
      );
    }
  }

  private syncPlanningCenterFromService(): void {
    this.planningCenterListMembers =
      this.planningCenterListService.getCurrentMembers();
    this.hasPlanningCenterList =
      !!this.planningCenterListService.getCurrentListId();
    this.cdr.markForCheck();
  }

  async loadContent(): Promise<void> {
    await this.contentCoordinator.loadAll(this);
    this.maybeStartPresentationHelpTourFromSession();
  }

  private maybeStartPresentationHelpTourFromSession(): void {
    this.helpTourLauncher.maybeStartFromSession(this.helpTourHost, this.cdr);
  }

  markForCheck(): void {
    this.cdr.markForCheck();
  }

  get items(): PresentationSlideItem[] {
    return this.catalog.getVisibleItems(this.getVisibleItemsOptions());
  }

  private getVisibleItemsOptions() {
    return {
      contentTypes: this.contentTypes,
      randomize: this.randomize,
      selectedPersonalCategories: this.selectedPersonalCategories,
      selectedPromptCategories: this.selectedPromptCategories,
    };
  }

  togglePersonalCategory(category: string): void {
    const index = this.selectedPersonalCategories.indexOf(category);
    if (index > -1) {
      this.selectedPersonalCategories.splice(index, 1);
    } else {
      this.selectedPersonalCategories.push(category);
    }
    this.currentIndex = 0; // Reset to first item when filters change
  }

  isPersonalCategorySelected(category: string): boolean {
    return this.selectedPersonalCategories.includes(category);
  }

  get currentItem(): PresentationSlideItem | undefined {
    return this.items[this.currentIndex];
  }

  get currentPrayerForCard(): PrayerRequest | null {
    const item = this.currentItem;
    return item && this.isPrayer(item) ? item : null;
  }

  get currentPromptForCard(): PrayerPrompt | null {
    const item = this.currentItem;
    return item && this.isPrompt(item) ? item : null;
  }

  isPrayer(item: PresentationSlideItem | null | undefined): item is PrayerRequest {
    return !!item && "prayer_for" in item;
  }

  isPrompt(item: PresentationSlideItem | null | undefined): item is PrayerPrompt {
    return isPresentationPrompt(item);
  }

  async refreshContent(): Promise<void> {
    await this.loadContent();
    this.currentIndex = 0;
    this.cdr.markForCheck();
  }

  async handleContentTypeChange(): Promise<void> {
    this.currentIndex = 0;
    this.persistSettings();
    await this.scheduleFilterReload(() => this.loadContent());
    this.cdr.markForCheck();
  }

  async handleStatusFilterChange(): Promise<void> {
    this.currentIndex = 0;
    this.persistSettings();
    await this.scheduleFilterReload(() => this.refetchPrayerScopedContent());
    this.cdr.markForCheck();
  }

  async handleTimeFilterChange(): Promise<void> {
    this.currentIndex = 0;
    this.persistSettings();
    await this.scheduleFilterReload(() => this.refetchPrayerScopedContent());
    this.cdr.markForCheck();
  }

  private scheduleFilterReload(task: () => Promise<void>): Promise<void> {
    return this.contentCoordinator.scheduleFilterReload(task);
  }

  handlePersonalCategoriesChange(categories: string[]): void {
    this.selectedPersonalCategories = categories;
    this.refreshCombinedShuffleIfNeeded();
    this.currentIndex = 0;
    this.cdr.markForCheck();
  }

  handlePromptCategoriesChange(categories: string[]): void {
    this.selectedPromptCategories = categories;
    this.refreshCombinedShuffleIfNeeded();
    this.currentIndex = 0;
    this.cdr.markForCheck();
  }

  private sanitizeContentTypesForAvailableContent(): void {
    if (this.hasMembers) {
      return;
    }
    const filtered = this.contentTypes.filter((type) => type !== "members");
    if (filtered.length === this.contentTypes.length) {
      return;
    }
    this.contentTypes = filtered.length > 0 ? filtered : ["prayers"];
    this.persistSettings();
  }

  private async refetchPrayerScopedContent(): Promise<void> {
    return this.contentCoordinator.refetchPrayerScopedContent(this);
  }

  private refreshCombinedShuffleIfNeeded(): void {
    this.contentCoordinator.refreshCombinedShuffleIfNeeded(this);
  }

  async handleRandomizeChange(): Promise<void> {
    this.persistSettings();
    if (this.randomize) {
      this.shuffleItems();
    } else {
      await this.scheduleFilterReload(() => this.loadContent());
    }
    this.currentIndex = 0;
    this.cdr.markForCheck();
  }

  shuffleItems(): void {
    this.catalog.shuffleVisibleItems(
      this.getVisibleItemsOptions(),
      shuffleCopy
    );
  }

  getContentLoadingLabel(): string {
    return getPresentationContentLoadingLabel(this.contentTypes);
  }

  getEmptyContentMessage(): string {
    return getPresentationEmptyContentMessage(this.contentTypes);
  }

  handleThemeChange(newTheme: Theme): void {
    this.themeService.setTheme(newTheme);
  }

  startPrayerTimer(): void {
    this.prayerTimer.start(this.prayerTimerMinutes, this.prayerTimerHost);
  }

  exitPresentation(): void {
    this.homeHandoffCoordinator.navigateExit(
      this.router,
      this.homeReturnContext
    );
  }
}
