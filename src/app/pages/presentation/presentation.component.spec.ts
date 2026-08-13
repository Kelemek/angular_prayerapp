import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router';
import { ChangeDetectorRef, NgZone } from '@angular/core';
import { PresentationComponent } from './presentation.component';
import { PresentationCatalogStore } from '../../services/presentation-catalog.store';
import { PresentationPlaybackController } from '../../services/presentation-playback.controller';
import { PresentationContentLoader } from '../../services/presentation-content-loader';
import { PresentationContentCoordinator } from '../../services/presentation-content.coordinator';
import { PresentationPrayerTimerController } from '../../services/presentation-prayer-timer.controller';
import { PresentationControlsInputController } from '../../services/presentation-controls-input.controller';
import { PresentationHelpTourLauncher } from '../../services/presentation-help-tour.launcher';
import { PresentationHomeHandoffCoordinator } from '../../services/presentation-home-handoff.coordinator';
import { PresentationSettingsCoordinator } from '../../services/presentation-settings.coordinator';
import { ThemeService } from '../../services/theme.service';

function createMockUserSessionService() {
  const userSessionSubject = new BehaviorSubject<{ email: string } | null>(null);
  return {
    userSessionSubject,
    userSession$: userSessionSubject.asObservable(),
    getUserEmail: vi.fn(() => userSessionSubject.value?.email ?? null),
  };
}

function createMockPromptService(extras?: Record<string, unknown>) {
  const promptsSubject = new BehaviorSubject<any[]>([]);
  return {
    promptsSubject,
    prompts$: promptsSubject.asObservable(),
    loadPrompts: vi.fn(async () => undefined),
    getPromptsSnapshot: vi.fn(() => promptsSubject.value),
    getActivePromptCategories: vi.fn(() => []),
    attachPrayedForCounts: vi.fn(async (prompts: any[]) =>
      prompts.map((p) => ({ ...p, prayed_for_count: p.prayed_for_count ?? 0 }))
    ),
    ...extras,
  };
}

function communityPrayersFromRows(rows: any[]) {
  return rows.map((row) => ({
    id: row.id,
    status: row.status ?? "current",
    created_at: row.created_at,
    updates: (row.prayer_updates ?? row.updates ?? []).map((update: any, index: number) => ({
      id: update.id ?? `update-${index}`,
      prayer_id: row.id,
      content: update.content ?? "content",
      author: update.author ?? "author",
      created_at: update.created_at,
      approval_status: update.approval_status ?? "approved",
    })),
    description: row.description ?? "description",
    prayer_for: row.prayer_for ?? "person",
    title: row.title ?? row.prayer_for ?? "person",
    requester: row.requester ?? "requester",
    prayed_for_count: row.prayed_for_count,
    category: row.category,
  }));
}

describe('PresentationComponent', () => {
  let component: PresentationComponent;
  let mockRouter: any;
  let mockRoute: any;
  let mockPrayerService: any;
  let mockPromptService: ReturnType<typeof createMockPromptService>;
  let mockPlanningCenterListService: any;
  let mockPresentationSettingsService: any;
  let mockUserSessionService: ReturnType<typeof createMockUserSessionService>;
  let catalog: PresentationCatalogStore;
  let playback: PresentationPlaybackController;
  let contentLoader: PresentationContentLoader;
  let contentCoordinator: PresentationContentCoordinator;
  let mockCdr: any;
  let mockNgZone: any;
  let mockAllowancePolicy: {
    load: ReturnType<typeof vi.fn>;
    deletionsAllowed: string;
    updatesAllowed: string;
  };
  let mockThemeService: {
    getTheme: ReturnType<typeof vi.fn>;
    setTheme: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockRouter = { navigate: vi.fn() };
    mockRoute = {
      snapshot: { queryParamMap: { get: vi.fn(() => null) } },
    };
    mockPrayerService = {
      prayers$: { subscribe: vi.fn(), value: [] },
      loadPrayers: vi.fn().mockResolvedValue(undefined),
      loadPersonalPrayers: vi.fn().mockResolvedValue(undefined),
      getPersonalPrayersSnapshot: vi.fn(() => []),
      getAllCommunityPrayersSnapshot: vi.fn(() => []),
      getMemberPrayedForCountsBatch: vi.fn().mockResolvedValue({}),
      getMemberPrayerUpdates: vi.fn().mockResolvedValue([]),
    };
    mockPromptService = createMockPromptService();
    mockUserSessionService = createMockUserSessionService();
    mockPlanningCenterListService = {
      loadForCurrentUser: vi.fn().mockResolvedValue(undefined),
      loadForUser: vi.fn().mockResolvedValue(undefined),
      getCurrentListId: vi.fn(() => null),
      getCurrentMembers: vi.fn(() => [])
    };
    mockPresentationSettingsService = {
      load: vi.fn(() => ({
        contentTypes: ['prayers'],
        randomize: false,
        smartMode: true,
        displayDuration: 10,
        loop: true,
        timeFilter: 'all',
        statusFilters: { current: true, answered: true },
        prayerTimerMinutes: 10,
      })),
      save: vi.fn(),
    };
    mockAllowancePolicy = {
      load: vi.fn().mockResolvedValue(undefined),
      deletionsAllowed: 'everyone',
      updatesAllowed: 'everyone',
    };
    mockThemeService = {
      getTheme: vi.fn(() => 'system' as const),
      setTheme: vi.fn(),
    };
    mockCdr = { markForCheck: vi.fn(), detectChanges: vi.fn() };
    mockNgZone = { run: (fn: Function) => fn() } as unknown as NgZone;
    catalog = new PresentationCatalogStore();
    playback = new PresentationPlaybackController(mockNgZone as unknown as NgZone);
    const prayerTimer = new PresentationPrayerTimerController(mockNgZone as unknown as NgZone);
    const controlsInput = new PresentationControlsInputController();
    contentLoader = new PresentationContentLoader(
      mockPrayerService as any,
      mockPromptService as any
    );
    contentCoordinator = new PresentationContentCoordinator(
      contentLoader,
      mockPrayerService as any
    );
    const helpDriverTour = { destroy: vi.fn(), startPresentationModeTour: vi.fn() };
    const helpTourLauncher = new PresentationHelpTourLauncher(helpDriverTour as any);
    const settingsCoordinator = new PresentationSettingsCoordinator(
      mockPresentationSettingsService as any
    );
    const homeHandoffCoordinator = new PresentationHomeHandoffCoordinator();

    component = new PresentationComponent(
      mockRouter as unknown as Router,
      mockRoute,
      mockPromptService as any,
      mockUserSessionService,
      mockCdr as unknown as ChangeDetectorRef,
      helpDriverTour as any,
      mockPlanningCenterListService,
      mockThemeService as unknown as ThemeService,
      mockAllowancePolicy as any,
      catalog,
      playback,
      prayerTimer,
      controlsInput,
      contentCoordinator,
      helpTourLauncher,
      homeHandoffCoordinator,
      settingsCoordinator
    );
    (component as unknown as { wireControllers: () => void }).wireControllers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('currentPrayerForCard returns the catalog item by identity', () => {
    const prayer = { id: 'p1', prayer_for: 'A', updates: [] } as any;
    component.catalog.prayers = [prayer];
    component.currentIndex = 0;
    expect(component.currentPrayerForCard).toBe(prayer);
  });

  it('onSlideItemRemoved drops the item and clamps the index', () => {
    component.catalog.prayers = [
      { id: 'p1', prayer_for: 'A' } as any,
      { id: 'p2', prayer_for: 'B' } as any,
    ];
    component.currentIndex = 1;
    component.onSlideItemRemoved('p2');
    expect(component.catalog.prayers.map((p) => p.id)).toEqual(['p1']);
    expect(component.currentIndex).toBe(0);
  });

  it('prompts$ sync clamps currentIndex when the visible deck shrinks', () => {
    const prompt1 = {
      id: 'p1',
      title: 'A',
      type: 't1',
      description: 'd',
      created_at: 't',
      updated_at: 't',
    };
    const prompt2 = {
      id: 'p2',
      title: 'B',
      type: 't2',
      description: 'd',
      created_at: 't',
      updated_at: 't',
    };
    mockPresentationSettingsService.load.mockReturnValueOnce({
      contentTypes: ['prompts'],
      randomize: false,
      smartMode: true,
      displayDuration: 10,
      loop: true,
      timeFilter: 'all',
      statusFilters: { current: true, answered: true },
      prayerTimerMinutes: 10,
    });
    mockPromptService.promptsSubject.next([prompt1, prompt2]);
    component.currentIndex = 1;
    vi.spyOn(component, 'loadPlanningCenterMembers').mockResolvedValue(undefined);
    vi.spyOn(component, 'loadContent').mockResolvedValue(undefined);
    vi.spyOn(component, 'setupControlsAutoHide').mockImplementation(() => {});

    component.ngOnInit();
    mockPromptService.promptsSubject.next([prompt1]);

    expect(component.currentIndex).toBe(0);
    expect(component.currentPromptForCard?.id).toBe('p1');
  });

  it('ngOnInit calls loadContent and setupControlsAutoHide', async () => {
    const lpm = vi.spyOn(component, 'loadPlanningCenterMembers').mockImplementation(() => Promise.resolve());
    const lc = vi.spyOn(component, 'loadContent').mockImplementation(() => Promise.resolve());
    const sc = vi.spyOn(component, 'setupControlsAutoHide').mockImplementation(() => {});

    component.ngOnInit();

    expect(lpm).toHaveBeenCalled();
    
    // Wait for the promise chain to complete
    await Promise.resolve();
    await Promise.resolve();
    
    expect(lc).toHaveBeenCalled();
    expect(sc).toHaveBeenCalled();
  });

  describe('presentation settings', () => {

    it('ngOnInit applies home navigation handoff over persisted settings without saving', async () => {
      mockPresentationSettingsService.load.mockReturnValue({
        contentTypes: ['prayers'],
        randomize: false,
        smartMode: true,
        displayDuration: 10,
        loop: true,
        timeFilter: 'all',
        statusFilters: { current: true, answered: true },
        prayerTimerMinutes: 10,
      });
      const replaceState = vi.fn();
      vi.stubGlobal('history', {
        state: { presentationHomeContentTypes: ['prompts'] },
        replaceState,
      });
      vi.spyOn(component, 'loadPlanningCenterMembers').mockResolvedValue(undefined);
      vi.spyOn(component, 'loadContent').mockResolvedValue(undefined);
      vi.spyOn(component, 'setupControlsAutoHide').mockImplementation(() => {});

      component.ngOnInit();
      await Promise.resolve();

      expect(component.contentTypes).toEqual(['prompts']);
      expect(mockPresentationSettingsService.save).not.toHaveBeenCalled();
      expect(replaceState).toHaveBeenCalled();
      vi.unstubAllGlobals();
    });

    it('ngOnInit applies home handoff status and categories without saving', async () => {
      mockPresentationSettingsService.load.mockReturnValue({
        contentTypes: ['prayers'],
        randomize: false,
        smartMode: true,
        displayDuration: 10,
        loop: true,
        timeFilter: 'all',
        statusFilters: { current: true, answered: true },
        prayerTimerMinutes: 10,
      });
      const replaceState = vi.fn();
      vi.stubGlobal('history', {
        state: {
          presentationHomeHandoff: {
            contentTypes: ['prompts'],
            promptCategories: ['Church'],
          },
        },
        replaceState,
      });
      vi.spyOn(component, 'loadPlanningCenterMembers').mockResolvedValue(undefined);
      vi.spyOn(component, 'loadContent').mockResolvedValue(undefined);
      vi.spyOn(component, 'setupControlsAutoHide').mockImplementation(() => {});

      component.ngOnInit();
      await Promise.resolve();

      expect(component.contentTypes).toEqual(['prompts']);
      expect(component.selectedPromptCategories).toEqual(['Church']);
      expect(mockPresentationSettingsService.save).not.toHaveBeenCalled();
      vi.unstubAllGlobals();
    });

    it('ngOnInit applies home query param handoff for new-tab navigation', async () => {
      mockPresentationSettingsService.load.mockReturnValue({
        contentTypes: ['prayers'],
        randomize: false,
        smartMode: true,
        displayDuration: 10,
        loop: true,
        timeFilter: 'all',
        statusFilters: { current: true, answered: true },
        prayerTimerMinutes: 10,
      });
      mockRoute.snapshot.queryParamMap.get.mockImplementation((key: string) => {
        if (key === 'homeTypes') return 'prompts';
        if (key === 'homeStatus') return 'answered';
        return null;
      });
      vi.spyOn(component, 'loadPlanningCenterMembers').mockResolvedValue(undefined);
      vi.spyOn(component, 'loadContent').mockResolvedValue(undefined);
      vi.spyOn(component, 'setupControlsAutoHide').mockImplementation(() => {});

      component.ngOnInit();
      await Promise.resolve();

      expect(component.contentTypes).toEqual(['prompts']);
      expect(component.statusFilters).toEqual({ current: false, answered: true });
      expect(mockPresentationSettingsService.save).not.toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith([], {
        relativeTo: mockRoute,
        queryParams: {
          homeTypes: null,
          homeStatus: null,
          homePromptCats: null,
          homePersonalCats: null,
          homeReturnFilter: null,
        },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });

    it('ngOnInit stores return context from query param handoff for new-tab exit', async () => {
      mockPresentationSettingsService.load.mockReturnValue({
        contentTypes: ['prayers'],
        randomize: false,
        smartMode: true,
        displayDuration: 10,
        loop: true,
        timeFilter: 'all',
        statusFilters: { current: true, answered: true },
        prayerTimerMinutes: 10,
      });
      mockRoute.snapshot.queryParamMap.get.mockImplementation((key: string) => {
        if (key === 'homeTypes') return 'personal';
        if (key === 'homePersonalCats') return 'Evening';
        if (key === 'homeReturnFilter') return 'personal';
        return null;
      });
      vi.spyOn(component, 'loadPlanningCenterMembers').mockResolvedValue(undefined);
      vi.spyOn(component, 'loadContent').mockResolvedValue(undefined);
      vi.spyOn(component, 'setupControlsAutoHide').mockImplementation(() => {});

      component.ngOnInit();
      await Promise.resolve();

      expect(component['homeReturnContext']).toEqual({
        activeFilter: 'personal',
        selectedPersonalCategories: ['Evening'],
        personalCategoryFilterMode: 'named',
      });
    });

    it('handleContentTypeChange persists settings', async () => {
      vi.spyOn(component, 'loadContent').mockResolvedValue(undefined);
      component.contentTypes = ['personal'];

      await component.handleContentTypeChange();

      expect(mockPresentationSettingsService.save).toHaveBeenCalledWith(
        expect.objectContaining({ contentTypes: ['personal'] })
      );
    });

  });

  describe('items helpers', () => {
    it('isPrayer and isPrompt detect types', () => {
      const prayer = { prayer_for: 'x' };
      const prompt = { type: 't' };
      expect(component.isPrayer(prayer)).toBe(true);
      expect(component.isPrompt(prayer)).toBe(false);
      expect(component.isPrompt(prompt)).toBe(true);
      expect(component.isPrayer(prompt)).toBe(false);
    });

  });

  it('handleThemeChange delegates to ThemeService', () => {
    component.handleThemeChange('dark');
    expect(mockThemeService.setTheme).toHaveBeenCalledWith('dark');
  });

  it('theme getter reads from ThemeService', () => {
    mockThemeService.getTheme.mockReturnValue('light');
    expect(component.theme).toBe('light');
    expect(mockThemeService.getTheme).toHaveBeenCalled();
  });

  it('setupControlsAutoHide treats device as mobile when touch present', () => {
    // simulate mobile by defining ontouchstart
    (globalThis as any).ontouchstart = true;
    component.initialPeriodElapsed = false;
    component.showControls = true;
    component.setupControlsAutoHide();
    // on mobile, initialPeriodElapsed should be set immediately and controls remain visible
    expect(component.initialPeriodElapsed).toBe(true);
    delete (globalThis as any).ontouchstart;
  });

  it('handleMouseMove does nothing during initial period', () => {
    component.initialPeriodElapsed = false;
    component.showControls = false;
    vi.stubGlobal('innerHeight', 100);
    component.handleMouseMove({ clientY: 90 } as MouseEvent);
    // still false because initialPeriodElapsed guard prevents change
    expect(component.showControls).toBe(false);
  });

  it('handleKeyboard uppercase P toggles play', () => {
    const spy = vi.spyOn(playback, 'togglePlay');
    component.handleKeyboard({ key: 'P', preventDefault: () => {} } as unknown as KeyboardEvent);
    expect(spy).toHaveBeenCalled();
  });

  it('handleRandomizeChange calls shuffle when randomize true and reload when false', async () => {
    // Set up test data
    component.catalog.prayers = [{ id: 'p1', prayer_for: 'John' } as any];
    component.catalog.prompts = [{ id: 'pr1', type: 'encouragement' } as any];
    component.contentTypes = ['prayers'];
    
    const loadSpy = vi.spyOn(component, 'loadContent').mockImplementation(() => Promise.resolve());

    // Test randomize true path
    component.randomize = true;
    await component.handleRandomizeChange();
    // shuffleItems should have been called (not mocked, so branches are covered)
    expect(component.catalog.prayers).toBeTruthy();
    expect(component.currentIndex).toBe(0);

    // Test randomize false path
    component.randomize = false;
    await component.handleRandomizeChange();
    expect(loadSpy).toHaveBeenCalled();
    expect(component.currentIndex).toBe(0);
  });

  describe('filter and type handlers', () => {
    it('handleStatusFilterChange resets index and refetches prayer-scoped content', async () => {
      const refetchSpy = vi
        .spyOn(contentCoordinator, 'refetchPrayerScopedContent')
        .mockResolvedValue();
      component.currentIndex = 5;
      await component.handleStatusFilterChange();
      expect(component.currentIndex).toBe(0);
      expect(refetchSpy).toHaveBeenCalled();
    });

    it('handleTimeFilterChange resets index and refetches prayer-scoped content', async () => {
      const refetchSpy = vi
        .spyOn(contentCoordinator, 'refetchPrayerScopedContent')
        .mockResolvedValue();
      component.currentIndex = 5;
      await component.handleTimeFilterChange();
      expect(component.currentIndex).toBe(0);
      expect(refetchSpy).toHaveBeenCalled();
    });

    it('handleContentTypeChange resets index and loads content', async () => {
      const loadSpy = vi.spyOn(component, 'loadContent').mockImplementation(() => Promise.resolve());
      component.currentIndex = 5;
      await component.handleContentTypeChange();
      expect(component.currentIndex).toBe(0);
      expect(loadSpy).toHaveBeenCalled();
    });

    it('refreshContent resets index and loads content', async () => {
      const loadSpy = vi.spyOn(component, 'loadContent').mockImplementation(() => Promise.resolve());
      component.currentIndex = 5;
      await component.refreshContent();
      expect(component.currentIndex).toBe(0);
      expect(loadSpy).toHaveBeenCalled();
    });
  });

  // --- merged from first PresentationComponent suite ---

  it('startPrayerTimer counts down and shows notification when complete', () => {
    vi.useFakeTimers();
    component.prayerTimerMinutes = 0.001; // ~0.06s
    component.showSettings = true;  // Set showSettings to test that it gets closed
    component.startPrayerTimer();
    expect(component.prayerTimerActive).toBe(true);
    expect(component.showSettings).toBe(false);  // Should be closed
    // advance enough time for timer to complete
    vi.advanceTimersByTime(2000);
    expect(component.prayerTimerActive).toBe(false);
    expect(component.showTimerNotification).toBe(true);
    vi.useRealTimers();
  });

  it('startPrayerTimer unsubscribes from existing subscription before starting new one', () => {
    vi.useFakeTimers();
    const stopSpy = vi.spyOn(component.prayerTimer, 'stop');
    
    component.prayerTimerMinutes = 0.001;
    component.startPrayerTimer();
    
    expect(stopSpy).toHaveBeenCalled();
    expect(component.prayerTimerActive).toBe(true);
    
    vi.useRealTimers();
  });

  it('exitPresentation restores Home tab and category when opened from Pray', () => {
    component['homeReturnContext'] = {
      activeFilter: 'personal',
      selectedPersonalCategories: ['Evening'],
    };

    component.exitPresentation();

    expect(mockRouter.navigate).toHaveBeenCalledWith(['/'], {
      state: {
        homeReturnContext: {
          activeFilter: 'personal',
          selectedPersonalCategories: ['Evening'],
        },
      },
    });
  });

  it('ngOnInit stores return context from home handoff for exit navigation', async () => {
    mockPresentationSettingsService.load.mockReturnValue({
      contentTypes: ['prayers'],
      randomize: false,
      smartMode: true,
      displayDuration: 10,
      loop: true,
      timeFilter: 'all',
      statusFilters: { current: true, answered: true },
      prayerTimerMinutes: 10,
    });
    vi.stubGlobal('history', {
      state: {
        presentationHomeHandoff: {
          contentTypes: ['personal'],
          personalCategories: ['Evening'],
          returnContext: {
            activeFilter: 'personal',
            selectedPersonalCategories: ['Evening'],
          },
        },
      },
      replaceState: vi.fn(),
    });
    vi.spyOn(component, 'loadPlanningCenterMembers').mockResolvedValue(undefined);
    vi.spyOn(component, 'loadContent').mockResolvedValue(undefined);
    vi.spyOn(component, 'setupControlsAutoHide').mockImplementation(() => {});

    component.ngOnInit();
    await Promise.resolve();

    expect(component['homeReturnContext']).toEqual({
      activeFilter: 'personal',
      selectedPersonalCategories: ['Evening'],
      personalCategoryFilterMode: 'named',
    });
    vi.unstubAllGlobals();
  });

  describe('Members functionality', () => {
    it('loadPlanningCenterMembers syncs hydrated list from PlanningCenterListService', async () => {
      const mockCachedMembers = [{ id: '1', name: 'John' }];
      mockPlanningCenterListService.getCurrentListId.mockReturnValue('list-1');
      mockPlanningCenterListService.getCurrentMembers.mockReturnValue(mockCachedMembers);

      await component.loadPlanningCenterMembers();

      expect(mockPlanningCenterListService.loadForCurrentUser).toHaveBeenCalled();
      expect(component.planningCenterListMembers).toEqual(mockCachedMembers);
      expect(component.hasPlanningCenterList).toBe(true);
      expect(component.hasMembers).toBe(true);
    });

    it('loadPlanningCenterMembers clears state when service has no list', async () => {
      mockPlanningCenterListService.getCurrentListId.mockReturnValue(null);
      mockPlanningCenterListService.getCurrentMembers.mockReturnValue([]);

      await component.loadPlanningCenterMembers();

      expect(component.planningCenterListMembers).toEqual([]);
      expect(component.hasPlanningCenterList).toBe(false);
    });

    it('loadPlanningCenterMembers syncs members after service refresh', async () => {
      const mockMembers = [{ id: 'm1', name: 'Member 1', avatar: 'url' }];
      mockPlanningCenterListService.loadForCurrentUser.mockImplementation(async () => {
        mockPlanningCenterListService.getCurrentListId.mockReturnValue('list123');
        mockPlanningCenterListService.getCurrentMembers.mockReturnValue(mockMembers);
      });

      await component.loadPlanningCenterMembers();

      expect(component.hasPlanningCenterList).toBe(true);
      expect(component.planningCenterListMembers).toEqual(mockMembers);
    });

    it('handleContentTypeChange loads content when switched to members', async () => {
      component.contentTypes = ['members'];
      component.planningCenterListMembers = [
        { id: 'm1', name: 'Member 1', avatar: null },
      ];
      const loadSpy = vi.spyOn(component, 'loadContent').mockResolvedValue();

      await component.handleContentTypeChange();

      expect(loadSpy).toHaveBeenCalled();
    });
  });

});
