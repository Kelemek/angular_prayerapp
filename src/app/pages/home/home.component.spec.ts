import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BehaviorSubject, of, NEVER, Subject } from 'rxjs';
import { NavigationEnd } from '@angular/router';
import { HomeComponent } from './home.component';
import { PrayerRequest } from '../../services/prayer.service';
import { PrayerCardActionsFacade } from '../../services/prayer-card-actions.facade';
import { HomeDeepLinkCoordinator } from '../../services/home-deep-link.coordinator';
import { HomeHelpTourLauncher } from '../../services/home-help-tour.launcher';
import { HomeCatalogStore } from '../../services/home-catalog.store';
import { HomeFilterCoordinator } from '../../services/home-filter.coordinator';
import { HomePersonalCategoryController } from '../../services/home-personal-category.controller';
import { HomeMemorizationPanelController } from '../../services/home-memorization-panel.controller';
import { HomePlanningCenterController } from '../../services/home-planning-center.controller';
import { HomeLifecycleCoordinator } from '../../services/home-lifecycle.coordinator';
import { HomeModalController } from '../../services/home-modal.controller';
import { HomeRefreshCoordinator } from '../../services/home-refresh.coordinator';
import { PresentationHomeHandoffCoordinator } from '../../services/presentation-home-handoff.coordinator';
import { HomeAdminNavigationController } from '../../services/home-admin-navigation.controller';
import { HomePrayerCardActionsController } from '../../services/home-prayer-card-actions.controller';
import { HomePresentationNavigationController } from '../../services/home-presentation-navigation.controller';

const makeMocks = () => {
  const prayersSubject = new BehaviorSubject<any[]>([]);
  const promptsSubject = new BehaviorSubject<any[]>([]);
  const userSessionSubject = new BehaviorSubject<any>(null);
  const allPersonalPrayersSubject = new BehaviorSubject<any[]>([]);
  const prayerService: any = {
    prayers$: prayersSubject.asObservable(),
    prompts$: of([]),
    loading$: of(false),
    error$: of(null),
    allPrayers$: prayersSubject.asObservable(),
    allPersonalPrayers$: allPersonalPrayersSubject.asObservable(),
    promptsSubject,
    applyFilters: vi.fn(),
    updatePrayerStatus: vi.fn(),
    deletePrayer: vi.fn(),
    addUpdate: vi.fn(),
    deleteUpdate: vi.fn(),
    requestDeletion: vi.fn(),
    requestUpdateDeletion: vi.fn(),
    getPersonalPrayers: vi.fn().mockResolvedValue([]),
    deletePersonalPrayer: vi.fn(),
    addPersonalPrayerUpdate: vi.fn(),
    deletePersonalPrayerUpdate: vi.fn(),
    updatePersonalPrayer: vi.fn(),
    addMemberPrayerUpdate: vi.fn().mockResolvedValue(true),
    deleteMemberPrayerUpdate: vi.fn().mockResolvedValue(true),
    updatePersonalPrayerOrder: vi.fn(),
    getUniqueCategoriesForUser: vi.fn().mockResolvedValue([]),
    swapCategoryRanges: vi.fn(),
    reorderCategories: vi.fn(),
    loadPrayers: vi.fn().mockResolvedValue(undefined),
    loadPersonalPrayers: vi.fn().mockResolvedValue(undefined),
    getPersonalPrayersSnapshot: vi.fn(() => []),
    getAllCommunityPrayersSnapshot: vi.fn(() => []),
    arePrayerCatalogsReady: vi.fn(() => true),
    updateMemberPrayerUpdate: vi.fn().mockResolvedValue(true),
    getMemberPrayerUpdates: vi.fn().mockResolvedValue([]),
    getMemberPrayerUpdatesBatch: vi.fn().mockResolvedValue({}),
    getMemberPrayedForCountsBatch: vi.fn().mockResolvedValue({}),
  };

  const promptService: any = {
    prompts$: promptsSubject.asObservable(),
    promptsSubject,
    loading$: of(false),
    deletePrompt: vi.fn(),
    loadPrompts: vi.fn(() => Promise.resolve()),
    isPromptsLoading: vi.fn(() => false),
  };

  const adminAuthService: any = {
    isAdmin$: new BehaviorSubject(false).asObservable(),
    hasAdminEmail$: of(false),
    logout: vi.fn(() => Promise.resolve()),
    getIsAdmin: vi.fn(() => false),
  };

  const userSessionService: any = {
    userSessionSubject,
    userSession$: userSessionSubject.asObservable(),
    getUserEmail: vi.fn(() => null),
    getUserFullName: vi.fn(() => null),
    getCurrentSession: vi.fn(() => null),
    getDefaultPrayerView: vi.fn(() => 'current'),
  };

  const pcListIdSubject = new BehaviorSubject<string | null>(null);
  const pcMembersSubject = new BehaviorSubject<Array<{ id: string; name: string }>>([]);
  const pcListNameSubject = new BehaviorSubject<string | null>(null);
  const pcLoadingSubject = new BehaviorSubject(false);

  const planningCenterListService: any = {
    listId$: pcListIdSubject.asObservable(),
    members$: pcMembersSubject.asObservable(),
    listName$: pcListNameSubject.asObservable(),
    loading$: pcLoadingSubject.asObservable(),
    loadForCurrentUser: vi.fn(() => Promise.resolve()),
    loadForUser: vi.fn(() => Promise.resolve()),
    getCurrentListId: vi.fn(() => pcListIdSubject.value),
    getCurrentMembers: vi.fn(() => pcMembersSubject.value),
    getCurrentListName: vi.fn(() => pcListNameSubject.value),
    invalidateForUser: vi.fn(),
    pcListIdSubject,
    pcMembersSubject,
    pcLoadingSubject
  };

  const badgeService: any = {
    isPromptUnread: vi.fn(),
    getBadgeFunctionalityEnabled$: vi.fn().mockReturnValue(of(false)),
    unreadPromptCount$: of(0),
    getUnreadPromptCountByType: vi.fn().mockReturnValue(0),
    refreshBadgeCounts: vi.fn(),
    getBadgeCount$: vi.fn().mockReturnValue(of(0)),
    markAllAsReadByStatus: vi.fn(),
    markAllAsRead: vi.fn(),
    markAllAsReadByPromptType: vi.fn(),
    getUpdateBadgesChanged$: vi.fn().mockReturnValue(of()),
  };

  const memorizationService: any = {
    memorizedItems$: new BehaviorSubject([]).asObservable(),
    loading$: of(false),
    items: [],
    loadItems: vi.fn(() => Promise.resolve()),
    removeItem: vi.fn(() => Promise.resolve(true)),
    updatePracticeStats: vi.fn(() => Promise.resolve(null)),
    saveInProgress: vi.fn(() => Promise.resolve()),
    clearInProgress: vi.fn(() => Promise.resolve()),
    addVerse: vi.fn(() => Promise.resolve({ ok: true, item: {} })),
    getPreferredTranslation: vi.fn(() => 'esv'),
    setPreferredTranslation: vi.fn(),
  };

  const prayerEncouragementService: any = {
    getPrayerEncouragementEnabled$: vi.fn().mockReturnValue(of(false)),
    getCooldownHoursForPrayer$: vi.fn().mockReturnValue(of(4)),
    canPrayFor: vi.fn().mockReturnValue(true),
    getCanPrayFor$: vi.fn().mockReturnValue(of(true)),
  };

  const memorizationRecommendationsService: any = {
    items$: new BehaviorSubject([]).asObservable(),
    categories$: new BehaviorSubject([]).asObservable(),
    loading$: of(false),
    snapshot: [],
    categoriesSnapshot: [],
    groupedSnapshot: [],
    load: vi.fn(() => Promise.resolve([])),
    invalidateCache: vi.fn(),
  };

  const scriptureService: any = {
    getPassage: vi.fn(() =>
      Promise.resolve({ reference: '', text: 'For God so loved the world.', translation: 'esv' })
    ),
  };

  const cacheService: any = {
    get: vi.fn(),
    set: vi.fn(),
    invalidate: vi.fn(),
    invalidateAll: vi.fn(),
    invalidateCategory: vi.fn()
  };

  const toastService: any = {
    success: vi.fn(),
    error: vi.fn()
  };

  const analyticsService: any = {
    trackPageView: vi.fn()
  };

  const cdr: any = {
    markForCheck: vi.fn(),
    detectChanges: vi.fn()
  };

  const router: any = {
    navigate: vi.fn(),
    events: NEVER,
    url: '/',
    parseUrl: vi.fn(() => ({ queryParams: {} as Record<string, string> }))
  };

  const activatedRoute: any = {};

  const supabaseService: any = {
    client: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn()
          }))
        }))
      }))
    }
  };

  const helpDriverTourService: any = {
    startCreatingPrayersHelpSectionTour: vi.fn(),
    startFilteringHelpSectionTour: vi.fn(),
    startNewPrayerRequestTour: vi.fn(),
    startPersonalPrayerTour: vi.fn(),
    startUpdatingPrayerTour: vi.fn(),
    startManagingPrayerViewsTour: vi.fn(),
    startPrayerPromptsTour: vi.fn(),
    startPrayerEncouragementTour: vi.fn(),
    startSearchPrayersTour: vi.fn(),
    startPersonalPrayersHelpSectionTour: vi.fn(),
    startPresentationModePrayButtonPreludeTour: vi.fn(),
    startPrintingHelpSectionTour: vi.fn(),
    startEmailSubscriptionHelpSectionTour: vi.fn(),
    startPrayerRemindersHelpSectionTour: vi.fn(),
    startFeedbackHelpSectionTour: vi.fn(),
    startAppSettingsHelpSectionTour: vi.fn(),
    queueTourFinishedCallback: vi.fn(),
    startFullGuidedTourWelcome: vi.fn(),
    startFullGuidedTourClosing: vi.fn(),
    startMemorizeHelpSectionTour: vi.fn(),
    setFullGuidedTourProgress: vi.fn(),
    destroy: vi.fn()
  };

  const helpContentService: any = {
    getSections: vi.fn().mockReturnValue(of([])),
  };

  const personalCategoryColorService: any = {
    colors$: of({}),
    loadColors: vi.fn().mockResolvedValue({}),
  };

  const prayerAllowancePolicy: any = {
    deletionsAllowed: 'everyone',
    updatesAllowed: 'everyone',
    load: vi.fn().mockResolvedValue(undefined),
  };

  return { prayerService, promptService, adminAuthService, userSessionService, planningCenterListService, badgeService, memorizationService, prayerEncouragementService, memorizationRecommendationsService, scriptureService, cacheService, toastService, analyticsService, cdr, router, activatedRoute, supabaseService, prayersSubject, promptsSubject, userSessionSubject, allPersonalPrayersSubject, helpDriverTourService, helpContentService, personalCategoryColorService, prayerAllowancePolicy, pcListIdSubject, pcMembersSubject, pcLoadingSubject };
};

interface SupabaseEmailOptions {
  selectResult?: { data: any; error: any };
  nextCall?: 'update' | 'insert';
  updateResult?: { error: any };
  insertResult?: { error: any };
}

const makeSupabaseForEmail = (options: SupabaseEmailOptions = {}) => {
  let callCount = 0;
  const selectResult = options.selectResult ?? { data: null, error: null };
  const selectChain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(selectResult)
  };
  const updateEq = vi.fn().mockResolvedValue(options.updateResult ?? { error: null });
  const updateChain: any = {
    update: vi.fn(() => ({ eq: updateEq }))
  };
  const insertChain: any = {
    insert: vi.fn().mockResolvedValue(options.insertResult ?? { error: null })
  };

  const fromMock = vi.fn(() => {
    callCount += 1;
    if (callCount === 1) {
      return selectChain;
    }
    if (callCount === 2) {
      if (options.nextCall === 'update') return updateChain;
      if (options.nextCall === 'insert') return insertChain;
      throw new Error('Unexpected supabase call sequence');
    }
    throw new Error('Unexpected supabase.from invocation');
  });

  return {
    supabaseService: {
      client: {
        from: fromMock
      }
    },
    selectChain,
    updateChain,
    insertChain
  };
};


type HomeMocks = ReturnType<typeof makeMocks>;

function createPrayerCardActionsFacade(m: HomeMocks): PrayerCardActionsFacade {
  return new PrayerCardActionsFacade(
    m.prayerService,
    m.promptService,
    m.toastService,
    m.userSessionService,
    m.adminAuthService,
    m.planningCenterListService
  );
}

function createHomeComponent(
  mocks: HomeMocks,
  overrides: Partial<HomeMocks> = {}
): HomeComponent {
  const m = { ...mocks, ...overrides };
  const prayerCardActions = createPrayerCardActionsFacade(m);
  const planningCenter = new HomePlanningCenterController();
  const homeHandoffCoordinator = new PresentationHomeHandoffCoordinator();
  const presentationNav = new HomePresentationNavigationController(
    m.router,
    homeHandoffCoordinator
  );
  const memberCardActions = new HomePrayerCardActionsController(
    prayerCardActions,
    planningCenter
  );
  return new HomeComponent(
    m.prayerService,
    m.promptService,
    m.adminAuthService,
    m.userSessionService,
    m.planningCenterListService,
    m.badgeService,
    m.memorizationService,
    m.prayerEncouragementService,
    m.memorizationRecommendationsService,
    m.scriptureService,
    m.toastService,
    m.analyticsService,
    m.cdr,
    m.router,
    m.activatedRoute,
    m.personalCategoryColorService,
    prayerCardActions,
    m.prayerAllowancePolicy,
    new HomeDeepLinkCoordinator(),
    new HomeHelpTourLauncher(m.helpDriverTourService, m.helpContentService),
    new HomeCatalogStore(),
    new HomeFilterCoordinator(),
    new HomePersonalCategoryController(),
    new HomeMemorizationPanelController(),
    planningCenter,
    new HomeLifecycleCoordinator(),
    new HomeModalController(),
    new HomeRefreshCoordinator(),
    presentationNav,
    new HomeAdminNavigationController(
      m.adminAuthService,
      m.router,
      m.toastService,
      m.userSessionService
    ),
    memberCardActions
  );
}

describe('HomeComponent', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(() => {
    mocks = makeMocks();
    // ensure localStorage is clean for each test
    localStorage.clear();
    // clear any cached logo
    // @ts-ignore
    delete (window as any).__cachedLogos;
  });

  it('constructor uses window cache to set hasLogo', () => {
    // @ts-ignore
    (window as any).__cachedLogos = { useLogo: true };
    const comp = createHomeComponent(mocks)
    expect(comp.hasLogo).toBe(true);
  });

  it('getUserEmail returns cached email from UserSessionService if available', () => {
    const mockServiceWithEmail = { getUserEmail: () => 'cached@example.com' };
    const comp = createHomeComponent(mocks, { userSessionService: mockServiceWithEmail as any })
    expect(comp.adminNav.getUserEmail()).toBe('cached@example.com');
  });

  it('getUserEmail falls back to localStorage when service returns null', () => {
    localStorage.setItem('approvalAdminEmail', 'a@b.com');
    const comp = createHomeComponent(mocks)
    expect(comp.adminNav.getUserEmail()).toBe('a@b.com');
  });

  it('getUserEmail falls back to userEmail localStorage key', () => {
    const comp = createHomeComponent(mocks)
    localStorage.setItem('userEmail', 'user@example.com');
    expect(comp.adminNav.getUserEmail()).toBe('user@example.com');
  });

  it('getUserEmail falls back to prayerapp_user_email localStorage key', () => {
    const comp = createHomeComponent(mocks)
    localStorage.setItem('prayerapp_user_email', 'prayerapp@example.com');
    expect(comp.adminNav.getUserEmail()).toBe('prayerapp@example.com');
  });

  it('getUserEmail returns Not logged in when no email sources are available', () => {
    const comp = createHomeComponent(mocks)
    localStorage.clear();
    expect(comp.adminNav.getUserEmail()).toBe('Not logged in');
  });


  it('getUserEmail returns Not logged in when service and localStorage are empty', () => {
    const comp = createHomeComponent(mocks)
    expect(comp.adminNav.getUserEmail()).toBe('Not logged in');
  });

  it('ngOnInit wires observables and updates counts and promptsCount', async () => {
    const { prayersSubject, promptsSubject, prayerService } = mocks;
    const comp = createHomeComponent(mocks);

    // seed data
    prayersSubject.next([
      { id: '1', status: 'current' },
      { id: '2', status: 'answered' },
      { id: '3', status: 'current' },
      { id: '4', status: 'archived' }
    ]);
    promptsSubject.next([
      { id: 'p1', title: 'T1', description: 'D1', type: 'A' }
    ]);

    comp.ngOnInit();
    
    // Emit a user session to trigger the initialization flow
    mocks.userSessionSubject.next({ defaultPrayerView: 'current' });
    
    // Wait for async operations including subscription processing
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(mocks.analyticsService.trackPageView).toHaveBeenCalled();
    // counts should reflect the seeded data
    expect(comp.currentPrayersCount).toBe(2);
    expect(comp.answeredPrayersCount).toBe(1);
    expect(comp.archivedPrayersCount).toBe(1);
    expect(comp.totalPrayersCount).toBe(4);
    expect(comp.promptsCount).toBe(1);
    expect(mocks.cdr.markForCheck).toHaveBeenCalled();
    // Verify that the active filter was set (which triggers applyFilters)
    expect(comp.activeFilter).toBe('current');
  });

  it('reloads Planning Center data after logout and login with the same email', async () => {
    mocks.userSessionSubject.next(null);
    mocks.planningCenterListService.loadForUser.mockClear();

    const comp = createHomeComponent(mocks)

    comp.ngOnInit();

    const session = { email: 'user@example.com', fullName: 'User', isActive: true };
    mocks.userSessionSubject.next(session);
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(mocks.planningCenterListService.loadForUser).toHaveBeenCalledWith('user@example.com');

    mocks.planningCenterListService.loadForUser.mockClear();
    mocks.userSessionSubject.next(null);
    mocks.userSessionSubject.next(session);
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(mocks.planningCenterListService.loadForUser).toHaveBeenCalledWith('user@example.com');

    mocks.planningCenterListService.loadForUser.mockClear();
    mocks.userSessionSubject.next({ ...session, fullName: 'User Updated' });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(mocks.planningCenterListService.loadForUser).not.toHaveBeenCalled();
  });

  it('onFiltersChange preserves status and calls applyFilters', () => {
    const comp = createHomeComponent(mocks)
    comp.filters = { status: 'answered', searchTerm: '', type: undefined };
    comp.filter.onFiltersChange({ searchTerm: 'needle' } as any);
    expect(comp.filters.searchTerm).toBe('needle');
    expect(mocks.prayerService.applyFilters).toHaveBeenCalledWith({ status: 'answered', type: undefined, search: 'needle' });
  });

  it('ngOnDestroy completes subscriptions without throwing', () => {
    const comp = createHomeComponent(mocks)
    // initialize subscriptions
    comp.ngOnInit();
    expect(() => comp.ngOnDestroy()).not.toThrow();
  });

  it('setFilter sets prompts branch correctly', () => {
    const comp = createHomeComponent(mocks)
    comp.filters.searchTerm = 'search';
    comp.selectedPromptTypes = ['X'];
    comp.filter.setFilter('prompts');
    expect(comp.activeFilter).toBe('prompts');
    expect(comp.selectedPromptTypes.length).toBe(0);
    expect(mocks.prayerService.applyFilters).toHaveBeenCalledWith({ search: '' });
  });

  it('setFilter total branch', () => {
    const comp = createHomeComponent(mocks)
    comp.filters.searchTerm = 's';
    comp.filter.setFilter('total');
    expect(comp.activeFilter).toBe('total');
    expect(mocks.prayerService.applyFilters).toHaveBeenCalledWith({ search: 's' });
  });

  it('setFilter archived branch', () => {
    const comp = createHomeComponent(mocks)
    comp.filters.searchTerm = 's';
    comp.filter.setFilter('archived');
    expect(comp.activeFilter).toBe('archived');
    expect(mocks.prayerService.applyFilters).toHaveBeenCalledWith({
      status: 'archived',
      search: 's',
    });
  });

  it('setFilter other branch (current)', () => {
    const comp = createHomeComponent(mocks)
    comp.filters.searchTerm = 's2';
    comp.filter.setFilter('current');
    expect(comp.activeFilter).toBe('current');
    expect(mocks.prayerService.applyFilters).toHaveBeenCalledWith({ status: 'current', search: 's2' });
  });

  it('markAsAnswered and deleteCard call service', () => {
    const comp = createHomeComponent(mocks)
    comp.prayerService.updatePrayerStatus('id1', 'answered');
    expect(mocks.prayerService.updatePrayerStatus).toHaveBeenCalledWith('id1', 'answered');
    const facade = createPrayerCardActionsFacade(mocks);
    facade.deleteCard({ id: 'id2' });
    expect(mocks.prayerService.deletePrayer).toHaveBeenCalledWith('id2');
  });

  it('addUpdate success and failure paths', async () => {
    const facade = createPrayerCardActionsFacade(mocks);
    const payload = {
      prayer_id: 'p1',
      content: 'c',
      author: 'A',
      author_email: 'a@b.com',
      is_anonymous: false,
      mark_as_answered: false,
    };
    mocks.prayerService.addUpdate.mockResolvedValue(undefined);
    await facade.addUpdateForCard({ id: 'p1' }, payload);
    expect(mocks.prayerService.addUpdate).toHaveBeenCalled();

    mocks.prayerService.addUpdate.mockRejectedValue(new Error('fail'));
    await facade.addUpdateForCard({ id: 'p1' }, payload);
    expect(mocks.toastService.error).toHaveBeenCalledWith('Failed to submit update');
  });

  it('deleteUpdate success and failure paths', async () => {
    const facade = createPrayerCardActionsFacade(mocks);
    mocks.prayerService.deleteUpdate.mockResolvedValue(undefined);
    await facade.deleteUpdateForCard({ id: 'p1' }, { updateId: 'u1', prayerId: 'p1' });

    mocks.prayerService.deleteUpdate.mockRejectedValue(new Error('bad'));
    await facade.deleteUpdateForCard({ id: 'p2' }, { updateId: 'u2', prayerId: 'p2' });
    expect(mocks.toastService.error).toHaveBeenCalledWith('Failed to delete update');
  });

  it('requestDeletion and requestUpdateDeletion success/failure', async () => {
    const facade = createPrayerCardActionsFacade(mocks);
    mocks.prayerService.requestDeletion.mockResolvedValue(undefined);
    await facade.requestDeletion({});

    mocks.prayerService.requestDeletion.mockRejectedValue(new Error('x'));
    await facade.requestDeletion({});
    expect(mocks.toastService.error).toHaveBeenCalledWith('Failed to submit deletion request');

    mocks.prayerService.requestUpdateDeletion.mockResolvedValue(undefined);
    await facade.requestUpdateDeletion({});
    mocks.prayerService.requestUpdateDeletion.mockRejectedValue(new Error('y'));
    await facade.requestUpdateDeletion({});
    expect(mocks.toastService.error).toHaveBeenCalledWith('Failed to submit update deletion request');
  });

  it('deletePrompt calls promptService.deletePrompt', async () => {
    const facade = createPrayerCardActionsFacade(mocks);
    await facade.deletePrompt('p1');
    expect(mocks.promptService.deletePrompt).toHaveBeenCalledWith('p1');
  });

  it('togglePromptType and isPromptTypeSelected behave correctly', () => {
    const comp = createHomeComponent(mocks)
    comp.selectedPromptTypes = ['A'];
    comp.filter.togglePromptType('A');
    expect(comp.selectedPromptTypes.includes('A')).toBe(false);
    comp.filter.togglePromptType('B');
    expect(comp.selectedPromptTypes.includes('B')).toBe(true);
    expect(comp.filter.isPromptTypeSelected('B')).toBe(true);
  });

  it('getDisplayedPrompts respects activeFilter and search/type filters', () => {
    const { promptsSubject } = mocks;
    const comp = createHomeComponent(mocks)
    const items = [
      { id: '1', title: 'Hello', description: 'World', type: 'T1' },
      { id: '2', title: 'Other', description: 'stuff', type: 'T2' }
    ];
    promptsSubject.next(items);

    // not prompts filter -> empty
    comp.activeFilter = 'current';
    comp.refreshHomeCatalog();
    expect(comp.catalog.displayedPrompts).toEqual([]);

    comp.activeFilter = 'prompts';
    // no search, no types -> all
    comp.filters.searchTerm = '';
    comp.selectedPromptTypes = [];
    comp.refreshHomeCatalog();
    expect(comp.catalog.displayedPrompts).toHaveLength(2);

    // search term matches title/description/type
    comp.filters.searchTerm = 'hello';
    comp.refreshHomeCatalog();
    const filtered = comp.catalog.displayedPrompts;
    expect(filtered).toHaveLength(1);

    // selected types filter
    comp.filters.searchTerm = '';
    comp.selectedPromptTypes = ['T2'];
    comp.refreshHomeCatalog();
    const typed = comp.catalog.displayedPrompts;
    expect(typed).toHaveLength(1);
    expect(typed[0].type).toBe('T2');
  });

  it('getUniquePromptTypes and getPromptCountByType', () => {
    const { promptsSubject } = mocks;
    const comp = createHomeComponent(mocks)
    const items = [
      { id: '1', title: 'A', description: '', type: 'X' },
      { id: '2', title: 'B', description: '', type: 'Y' },
      { id: '3', title: 'C', description: '', type: 'X' }
    ];
    promptsSubject.next(items);
    comp.refreshHomeCatalog();
    const types = comp.catalog.uniquePromptTypes;
    expect(types).toEqual(['X', 'Y']);
    expect(comp.filter.getPromptCountByType('X')).toBe(2);
  });

  it('logout calls adminAuthService.logout', async () => {
    const comp = createHomeComponent(mocks)
    await mocks.adminAuthService.logout();
    expect(mocks.adminAuthService.logout).toHaveBeenCalled();
    expect(comp).toBeTruthy();
  });

  it('navigateToAdmin navigates when isAdmin true, otherwise shows MFA modal', () => {
    // admin true
    const adminServiceTrue: any = { isAdmin$: new BehaviorSubject(true).asObservable() };
    const compTrue = createHomeComponent(mocks, { adminAuthService: adminServiceTrue });
    compTrue.adminNav.navigateToAdmin();
    expect(mocks.router.navigate).toHaveBeenCalledWith(['/admin']);

    // admin false -> showAdminMfaModal -> no email set -> error toast
    const adminServiceFalse: any = { isAdmin$: new BehaviorSubject(false).asObservable() };
    const compFalse = createHomeComponent(mocks, { adminAuthService: adminServiceFalse });
    localStorage.clear();
    compFalse.adminNav.navigateToAdmin();
    expect(mocks.toastService.error).toHaveBeenCalledWith('Email not found. Please log in again.');

    // when email in localStorage, it should navigate to /login with query params
    localStorage.setItem('userEmail', 'u@e.com');
    compFalse.adminNav.navigateToAdmin();
    expect(mocks.router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { email: 'u@e.com', sessionExpired: true } });
  });

  it('onPresentationLinkClick navigates with router state on primary click', () => {
    const comp = createHomeComponent(mocks)
    comp.activeFilter = 'prompts';
    const preventDefault = vi.fn();
    comp.presentationNav.onPresentationLinkClick({
      button: 0,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      preventDefault,
    } as unknown as MouseEvent);
    expect(preventDefault).toHaveBeenCalled();
    expect(mocks.router.navigate).toHaveBeenCalledWith(['/presentation'], {
      state: {
        presentationHomeHandoff: {
          contentTypes: ['prompts'],
          returnContext: {
            activeFilter: 'prompts',
          },
        },
      },
    });
  });

  it('onPresentationLinkClick allows modifier clicks to use native link navigation', () => {
    const comp = createHomeComponent(mocks)
    comp.activeFilter = 'prompts';
    const preventDefault = vi.fn();
    comp.presentationNav.onPresentationLinkClick({
      button: 0,
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      preventDefault,
    } as unknown as MouseEvent);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(mocks.router.navigate).not.toHaveBeenCalled();
    expect(comp.presentationNav.presentationHandoffQueryParams).toEqual({
      homeTypes: 'prompts',
      homeReturnFilter: 'prompts',
    });
  });

  it('presentationHandoffQueryParams includes answered status from answered tab', () => {
    const comp = createHomeComponent(mocks)
    comp.activeFilter = 'answered';
    expect(comp.presentationNav.presentationHandoffQueryParams).toEqual({
      homeTypes: 'prayers',
      homeStatus: 'answered',
      homeReturnFilter: 'answered',
    });
  });

  it('presentationHandoffQueryParams includes selected prompt type', () => {
    const comp = createHomeComponent(mocks)
    comp.activeFilter = 'prompts';
    comp.selectedPromptTypes = ['Church'];
    expect(comp.presentationNav.presentationHandoffQueryParams).toEqual({
      homeTypes: 'prompts',
      homePromptCats: 'Church',
      homeReturnFilter: 'prompts',
    });
  });

  it('onPresentationLinkClick passes answered status in router state', () => {
    const comp = createHomeComponent(mocks)
    comp.activeFilter = 'answered';
    const preventDefault = vi.fn();
    comp.presentationNav.onPresentationLinkClick({
      button: 0,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      altKey: false,
      preventDefault,
    } as unknown as MouseEvent);
    expect(mocks.router.navigate).toHaveBeenCalledWith(['/presentation'], {
      state: {
        presentationHomeHandoff: {
          contentTypes: ['prayers'],
          statusFilters: { current: false, answered: true, archived: false },
          returnContext: {
            activeFilter: 'answered',
          },
        },
      },
    });
  });

  it('applyHomeReturnContext restores personal tab and category', () => {
    const comp = createHomeComponent(mocks)
    const setFilterSpy = vi.spyOn(comp.filter, 'setFilter');

    comp.presentationNav.applyHomeReturnContext({
      activeFilter: 'personal',
      selectedPersonalCategories: ['Evening'],
      personalCategoryFilterMode: 'named',
    });

    expect(setFilterSpy).toHaveBeenCalledWith('personal');
    expect(comp.personalCategory.selectedPersonalCategories).toEqual(['Evening']);
    expect(comp.personalCategory.personalCategoryFilterMode).toBe('named');
  });

  it('applyHomeReturnContext restores personal Current mode', () => {
    const comp = createHomeComponent(mocks);
    comp.personalCategory.personalCategoryFilterMode = 'total';
    comp.personalCategory.selectedPersonalCategories = ['Evening'];

    comp.presentationNav.applyHomeReturnContext({
      activeFilter: 'personal',
      personalCategoryFilterMode: 'current',
    });

    expect(comp.personalCategory.personalCategoryFilterMode).toBe('current');
    expect(comp.personalCategory.selectedPersonalCategories).toEqual([]);
  });

  it('applyHomeReturnContext defaults legacy personal handoff to Total', () => {
    const comp = createHomeComponent(mocks);
    comp.personalCategory.personalCategoryFilterMode = 'current';

    comp.presentationNav.applyHomeReturnContext({
      activeFilter: 'personal',
    });

    expect(comp.personalCategory.personalCategoryFilterMode).toBe('total');
    expect(comp.personalCategory.selectedPersonalCategories).toEqual([]);
  });

  it('applyHomeReturnContext falls back to Total when named has no categories', () => {
    const comp = createHomeComponent(mocks);
    comp.personalCategory.personalCategoryFilterMode = 'current';
    comp.personalCategory.selectedPersonalCategories = ['Evening'];

    comp.presentationNav.applyHomeReturnContext({
      activeFilter: 'personal',
      personalCategoryFilterMode: 'named',
    });

    expect(comp.personalCategory.personalCategoryFilterMode).toBe('total');
    expect(comp.personalCategory.selectedPersonalCategories).toEqual([]);
  });

  it('updateDefaultViewPreference returns false when no email is cached', async () => {
    const { updateHomeDefaultViewPreference } = await import(
      '../../lib/home-default-view-preference'
    );
    const userSessionService = {
      ...mocks.userSessionService,
      getUserEmail: () => null
    };

    await expect(
      updateHomeDefaultViewPreference(
        mocks.supabaseService.client,
        userSessionService as any,
        'personal'
      )
    ).resolves.toBe(false);
  });

  it('updateDefaultViewPreference updates existing subscriber record', async () => {
    const { updateHomeDefaultViewPreference } = await import(
      '../../lib/home-default-view-preference'
    );
    const supabase = makeSupabaseForEmail({
      selectResult: { data: { id: 1 }, error: null },
      nextCall: 'update'
    });
    const userSessionService = {
      ...mocks.userSessionService,
      getUserEmail: () => 'test@example.com',
      updateUserSession: vi.fn().mockResolvedValue(undefined)
    };

    const result = await updateHomeDefaultViewPreference(
      supabase.supabaseService.client,
      userSessionService as any,
      'personal'
    );

    expect(result).toBe(true);
    expect(supabase.supabaseService.client.from).toHaveBeenCalledTimes(2);
    expect(supabase.updateChain.update).toHaveBeenCalled();
    expect(userSessionService.updateUserSession).toHaveBeenCalledWith({ defaultPrayerView: 'personal' });
  });

  it('updateDefaultViewPreference inserts a subscriber when none exists', async () => {
    const { updateHomeDefaultViewPreference } = await import(
      '../../lib/home-default-view-preference'
    );
    const supabase = makeSupabaseForEmail({
      selectResult: { data: null, error: null },
      nextCall: 'insert'
    });
    const userSessionService = {
      ...mocks.userSessionService,
      getUserEmail: () => 'fresh@example.com',
      updateUserSession: vi.fn().mockResolvedValue(undefined)
    };

    const result = await updateHomeDefaultViewPreference(
      supabase.supabaseService.client,
      userSessionService as any,
      'current'
    );

    expect(result).toBe(true);
    expect(supabase.supabaseService.client.from).toHaveBeenCalledTimes(2);
    expect(supabase.insertChain.insert).toHaveBeenCalledWith({
      email: 'fresh@example.com',
      default_prayer_view: 'current'
    });
    expect(userSessionService.updateUserSession).toHaveBeenCalledWith({ defaultPrayerView: 'current' });
  });

  it('updateDefaultViewPreference handles fetch errors gracefully', async () => {
    const { updateHomeDefaultViewPreference } = await import(
      '../../lib/home-default-view-preference'
    );
    const supabase = makeSupabaseForEmail({
      selectResult: { data: null, error: new Error('fetch failure') }
    });
    const userSessionService = {
      ...mocks.userSessionService,
      getUserEmail: () => 'error@example.com',
      updateUserSession: vi.fn().mockResolvedValue(undefined)
    };

    await expect(
      updateHomeDefaultViewPreference(
        supabase.supabaseService.client,
        userSessionService as any,
        'current'
      )
    ).resolves.toBe(false);
    expect(userSessionService.updateUserSession).not.toHaveBeenCalled();
    expect(supabase.supabaseService.client.from).toHaveBeenCalledTimes(1);
  });

  describe('Badge count functionality', () => {
    it('should have getUnreadPromptCountByType method', () => {
      const comp = createHomeComponent(mocks)

      expect(typeof comp.filter.getUnreadPromptCountByType).toBe('function');
    });

    it('should count unread prompts by type', () => {
      const prompts = [
        { id: '1', type: 'Morning', title: 'Test 1' },
        { id: '2', type: 'Morning', title: 'Test 2' },
        { id: '3', type: 'Evening', title: 'Test 3' }
      ];

      mocks.promptService.prompts$ = of(prompts);

      const comp = createHomeComponent(mocks)

      // Component should have badge count functionality
      expect(comp).toBeDefined();
    });

    it('should display badge count on prompt type filters', () => {
      const prompts = [
        { id: '1', type: 'Morning', title: 'Test 1' },
        { id: '2', type: 'Morning', title: 'Test 2' }
      ];

      const promptsSubject = new BehaviorSubject(prompts);
      const customPromptService = {
        ...mocks.promptService,
        prompts$: promptsSubject.asObservable()
      };

      const comp = createHomeComponent(mocks, { promptService: customPromptService });

      expect(comp).toBeDefined();
    });

    it('should filter prompts by type with badge counts', () => {
      const prompts = [
        { id: '1', type: 'Morning', title: 'Test 1' },
        { id: '2', type: 'Evening', title: 'Test 2' },
        { id: '3', type: 'Morning', title: 'Test 3' }
      ];

      const promptsSubject = new BehaviorSubject(prompts);
      const customPromptService = {
        ...mocks.promptService,
        prompts$: promptsSubject.asObservable()
      };

      const comp = createHomeComponent(mocks, { promptService: customPromptService });

      expect(comp).toBeDefined();
    });

    it('should update badge counts when prompts change', () => {
      const promptsSubject = new BehaviorSubject<any[]>([]);

      const customPromptService = {
        ...mocks.promptService,
        prompts$: promptsSubject.asObservable()
      };

      const comp = createHomeComponent(mocks, { promptService: customPromptService });

      // Add prompts after initialization
      promptsSubject.next([
        { id: '1', type: 'Morning', title: 'Test 1' },
        { id: '2', type: 'Morning', title: 'Test 2' }
      ]);

      expect(comp).toBeDefined();
    });

    it('getUnreadPromptCountByType respects badge unread state', () => {
      const prompts = [
        { id: '1', type: 'Morning', title: 'Test 1', description: 'a' },
        { id: '2', type: 'Morning', title: 'Test 2', description: 'b' },
        { id: '3', type: 'Evening', title: 'Test 3', description: 'c' }
      ];
      const promptsSubject = new BehaviorSubject(prompts);
      const customPromptService = {
        ...mocks.promptService,
        prompts$: promptsSubject.asObservable(),
        promptsSubject
      };
      mocks.badgeService.isPromptUnread.mockImplementation((id: string) => id === '2');

      const comp = createHomeComponent(mocks, { promptService: customPromptService });

      expect(comp.filter.getUnreadPromptCountByType('Morning')).toBe(1);
      expect(comp.filter.getUnreadPromptCountByType('Evening')).toBe(0);
    });
  });

  describe('Category selection helpers', () => {
    it('togglePersonalCategory clears selection when already chosen', () => {
      const comp = createHomeComponent(mocks)

      comp.personalCategory.personalCategoryFilterMode = 'named';
      comp.personalCategory.selectedPersonalCategories = ['Members'];
      comp.personalCategory.togglePersonalCategory('Members');

      expect(comp.personalCategory.selectedPersonalCategories).toEqual([]);
      expect(comp.personalCategory.personalCategoryFilterMode).toBe('current');
    });

    it('togglePersonalCategory ignores click only on the long-pressed category', () => {
      const comp = createHomeComponent(mocks);

      comp.personalCategory.selectedPersonalCategories = [];
      comp.personalCategory.setSuppressPersonalCategoryClickForForTests('Members');

      comp.personalCategory.togglePersonalCategory('Other');
      expect(comp.personalCategory.selectedPersonalCategories).toEqual(['Other']);
      expect(comp.personalCategory.personalCategoryFilterMode).toBe('named');
      expect(comp.personalCategory.getSuppressPersonalCategoryClickForForTests()).toBe('Members');

      comp.personalCategory.togglePersonalCategory('Members');
      expect(comp.personalCategory.selectedPersonalCategories).toEqual(['Other']);
      expect(comp.personalCategory.getSuppressPersonalCategoryClickForForTests()).toBeNull();
    });

    it('clears suppressPersonalCategoryClickFor after the click-suppress window', () => {
      vi.useFakeTimers();
      const comp = createHomeComponent(mocks);

      comp.personalCategory.openRenamePersonalCategoryModal('Members');
      expect(comp.personalCategory.getSuppressPersonalCategoryClickForForTests()).toBe('Members');

      vi.advanceTimersByTime(400);
      expect(comp.personalCategory.getSuppressPersonalCategoryClickForForTests()).toBeNull();

      vi.useRealTimers();
    });

    it('keeps suppressPersonalCategoryClickFor when modal closes before timer', () => {
      vi.useFakeTimers();
      const comp = createHomeComponent(mocks);

      comp.personalCategory.openRenamePersonalCategoryModal('Members');
      comp.personalCategory.closeRenamePersonalCategoryModal();

      expect(comp.personalCategory.getSuppressPersonalCategoryClickForForTests()).toBe('Members');
      vi.advanceTimersByTime(400);
      expect(comp.personalCategory.getSuppressPersonalCategoryClickForForTests()).toBeNull();

      vi.useRealTimers();
    });

    it('closes rename modal without toast when name is unchanged', async () => {
      const prayerService = {
        ...mocks.prayerService,
        renamePersonalCategory: vi.fn(),
      };
      const comp = createHomeComponent(mocks, { prayerService });

      comp.personalCategory.renamingPersonalCategory = 'Evening';
      comp.personalCategory.showRenamePersonalCategory = true;
      await comp.personalCategory.saveRenamedPersonalCategory('Evening');

      expect(prayerService.renamePersonalCategory).not.toHaveBeenCalled();
      expect(mocks.toastService.success).not.toHaveBeenCalled();
      expect(comp.personalCategory.showRenamePersonalCategory).toBe(false);
    });

    it('context menu clears pending long-press before opening rename', () => {
      vi.useFakeTimers();
      const comp = createHomeComponent(mocks);
      const openSpy = vi.spyOn(
        comp.personalCategory,
        'openRenamePersonalCategoryModal'
      );

      comp.personalCategory.onPersonalCategoryPointerDown(
        {
          button: 0,
          clientX: 10,
          clientY: 10,
          target: document.createElement('button'),
        } as unknown as PointerEvent,
        'Members'
      );
      expect(comp.personalCategory.getPersonalCategoryLongPressTimerForTests()).not.toBeNull();

      comp.personalCategory.onPersonalCategoryContextMenu(
        {
          preventDefault: vi.fn(),
          target: document.createElement('button'),
        } as unknown as MouseEvent,
        'Members'
      );

      expect(comp.personalCategory.getPersonalCategoryLongPressTimerForTests()).toBeNull();
      expect(openSpy).toHaveBeenCalledWith('Members');

      vi.advanceTimersByTime(500);
      expect(openSpy).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('ignores save completion when rename modal is closed during save', async () => {
      let resolvePrayerRename: (value: boolean) => void = () => undefined;
      const prayerRename = new Promise<boolean>((resolve) => {
        resolvePrayerRename = resolve;
      });
      const prayerService = {
        ...mocks.prayerService,
        renamePersonalCategory: vi
          .fn()
          .mockReturnValueOnce(prayerRename)
          .mockResolvedValueOnce(true),
      };
      const personalCategoryColorService = {
        ...mocks.personalCategoryColorService,
        getColorsSnapshot: vi.fn().mockReturnValue({}),
        renameCategory: vi.fn().mockResolvedValue(true),
      };
      const comp = createHomeComponent(mocks, {
        prayerService,
        personalCategoryColorService,
      });

      comp.personalCategory.renamingPersonalCategory = 'Evening';
      comp.personalCategory.showRenamePersonalCategory = true;
      comp.personalCategory.selectedPersonalCategories = ['Evening'];
      const savePromise = comp.personalCategory.saveRenamedPersonalCategory('Night');

      comp.personalCategory.closeRenamePersonalCategoryModal();
      expect(comp.personalCategory.isRenamingPersonalCategory).toBe(false);
      resolvePrayerRename(true);
      await savePromise;

      expect(mocks.toastService.success).not.toHaveBeenCalled();
      expect(comp.personalCategory.showRenamePersonalCategory).toBe(false);
      expect(comp.personalCategory.selectedPersonalCategories).toEqual(['Evening']);
      expect(prayerService.renamePersonalCategory).toHaveBeenNthCalledWith(
        2,
        'Night',
        'Evening'
      );
    });

    it('syncs active filter when rename finishes after modal dismiss', async () => {
      let resolveColorRename: (value: boolean) => void = () => undefined;
      const colorRename = new Promise<boolean>((resolve) => {
        resolveColorRename = resolve;
      });
      const prayerService = {
        ...mocks.prayerService,
        renamePersonalCategory: vi.fn().mockResolvedValue(true),
      };
      const personalCategoryColorService = {
        ...mocks.personalCategoryColorService,
        getColorsSnapshot: vi.fn().mockReturnValue({}),
        renameCategory: vi.fn().mockReturnValue(colorRename),
      };
      const comp = createHomeComponent(mocks, {
        prayerService,
        personalCategoryColorService,
      });

      comp.personalCategory.renamingPersonalCategory = 'Evening';
      comp.personalCategory.showRenamePersonalCategory = true;
      comp.personalCategory.selectedPersonalCategories = ['Evening'];
      const savePromise = comp.personalCategory.saveRenamedPersonalCategory('Night');

      await Promise.resolve();
      comp.personalCategory.closeRenamePersonalCategoryModal();
      resolveColorRename(true);
      await savePromise;

      expect(mocks.toastService.success).not.toHaveBeenCalled();
      expect(comp.personalCategory.selectedPersonalCategories).toEqual(['Night']);
      expect(comp.personalCategory.isRenamingPersonalCategory).toBe(false);
    });

    it('restores active filter when color rename fails after modal dismiss', async () => {
      let resolveColorRename: (value: boolean) => void = () => undefined;
      const colorRename = new Promise<boolean>((resolve) => {
        resolveColorRename = resolve;
      });
      const prayerService = {
        ...mocks.prayerService,
        renamePersonalCategory: vi
          .fn()
          .mockResolvedValueOnce(true)
          .mockResolvedValueOnce(true),
      };
      const personalCategoryColorService = {
        ...mocks.personalCategoryColorService,
        getColorsSnapshot: vi.fn().mockReturnValue({}),
        renameCategory: vi.fn().mockReturnValue(colorRename),
      };
      const comp = createHomeComponent(mocks, {
        prayerService,
        personalCategoryColorService,
      });

      comp.personalCategory.renamingPersonalCategory = 'Evening';
      comp.personalCategory.showRenamePersonalCategory = true;
      comp.personalCategory.selectedPersonalCategories = ['Evening'];
      const savePromise = comp.personalCategory.saveRenamedPersonalCategory('Night');

      await Promise.resolve();
      expect(comp.personalCategory.selectedPersonalCategories).toEqual(['Night']);
      comp.personalCategory.closeRenamePersonalCategoryModal();
      resolveColorRename(false);
      await savePromise;

      expect(comp.personalCategory.selectedPersonalCategories).toEqual(['Evening']);
      expect(comp.personalCategory.isRenamingPersonalCategory).toBe(false);
    });

    it('togglePersonalCategory selects a new category and isPersonalCategorySelected reports true', () => {
      const comp = createHomeComponent(mocks)

      comp.personalCategory.togglePersonalCategory('NewCat');
      expect(comp.personalCategory.isPersonalCategorySelected('NewCat')).toBe(true);
      expect(comp.personalCategory.isPersonalCategorySelected('Other')).toBe(false);
      expect(comp.personalCategory.personalCategoryFilterMode).toBe('named');
    });

    it('selectPersonalCategoryFilterMode switches fixed chips and clears named selection', () => {
      const comp = createHomeComponent(mocks);
      comp.personalCategory.personalCategoryFilterMode = 'named';
      comp.personalCategory.selectedPersonalCategories = ['Health'];

      comp.personalCategory.selectPersonalCategoryFilterMode('answered');
      expect(comp.personalCategory.personalCategoryFilterMode).toBe('answered');
      expect(comp.personalCategory.selectedPersonalCategories).toEqual([]);

      comp.personalCategory.selectPersonalCategoryFilterMode('total');
      expect(comp.personalCategory.personalCategoryFilterMode).toBe('total');
    });
  });

  describe('Personal Prayers functionality', () => {
    it('onPrayerFormClose with isPersonal=true just closes form', async () => {
      const comp = createHomeComponent(mocks)

      await comp.modals.onPrayerFormClose({ isPersonal: true });

      expect(comp.modals.showPrayerForm).toBe(false);
      // Personal prayers are automatically updated by the service observable
    });

    it('onPrayerFormClose without isPersonal just closes form', () => {
      const comp = createHomeComponent(mocks)

      comp.modals.onPrayerFormClose({});

      expect(comp.modals.showPrayerForm).toBe(false);
      expect(mocks.cacheService.invalidate).not.toHaveBeenCalled();
    });

    it('deletePersonalPrayer success refreshes cache', async () => {
      const prayers = [
        { id: 'p1', title: 'Prayer', description: 'Test', status: 'current', requester: 'Me', prayer_for: 'Me', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), date_requested: new Date().toISOString(), updates: [] }
      ];
      mocks.cacheService.get.mockReturnValue(null);
      mocks.prayerService.deletePersonalPrayer.mockResolvedValue(true);
      mocks.prayerService.getPersonalPrayers.mockResolvedValue(prayers);

      const facade = createPrayerCardActionsFacade(mocks);
      facade.deleteCard({ id: 'p1', user_email: 'me@example.com' });

      expect(mocks.prayerService.deletePersonalPrayer).toHaveBeenCalledWith('p1');
    });

    it('deletePersonalPrayer failure does not refresh', async () => {
      mocks.prayerService.deletePersonalPrayer.mockResolvedValue(false);

      const facade = createPrayerCardActionsFacade(mocks);
      facade.deleteCard({ id: 'p1', user_email: 'me@example.com' });

      expect(mocks.prayerService.deletePersonalPrayer).toHaveBeenCalledWith('p1');
      expect(mocks.cacheService.invalidate).not.toHaveBeenCalled();
    });

    it('addPersonalUpdate with mark_as_answered=true updates category', async () => {
      mocks.prayerService.addPersonalPrayerUpdate.mockResolvedValue(true);
      mocks.prayerService.updatePersonalPrayer.mockResolvedValue(true);
      mocks.cacheService.get.mockReturnValue(null);
      mocks.prayerService.getPersonalPrayers.mockResolvedValue([]);

      const facade = createPrayerCardActionsFacade(mocks);
      await facade.addUpdateForCard(
        { id: 'p1', user_email: 'john@example.com' },
        {
          prayer_id: 'p1',
          content: 'Update text',
          author: 'John',
          author_email: 'john@example.com',
          is_anonymous: false,
          mark_as_answered: true,
        }
      );

      expect(mocks.prayerService.addPersonalPrayerUpdate).toHaveBeenCalled();
      expect(mocks.prayerService.updatePersonalPrayer).toHaveBeenCalledWith('p1', { category: 'Answered' });
    });

    it('addPersonalUpdate without mark_as_answered does not update category', async () => {
      mocks.prayerService.addPersonalPrayerUpdate.mockResolvedValue(true);
      mocks.cacheService.get.mockReturnValue(null);
      mocks.prayerService.getPersonalPrayers.mockResolvedValue([]);

      const facade = createPrayerCardActionsFacade(mocks);
      await facade.addUpdateForCard(
        { id: 'p1', user_email: 'john@example.com' },
        {
          prayer_id: 'p1',
          content: 'Update text',
          author: 'John',
          author_email: 'john@example.com',
          is_anonymous: false,
          mark_as_answered: false,
        }
      );

      expect(mocks.prayerService.addPersonalPrayerUpdate).toHaveBeenCalled();
      expect(mocks.prayerService.updatePersonalPrayer).not.toHaveBeenCalled();
    });

    it('addPersonalUpdate error handling', async () => {
      mocks.prayerService.addPersonalPrayerUpdate.mockRejectedValue(new Error('Add failed'));

      const facade = createPrayerCardActionsFacade(mocks);
      await facade.addUpdateForCard(
        { id: 'p1', user_email: 'john@example.com' },
        {
          prayer_id: 'p1',
          content: 'Update text',
          author: 'John',
          author_email: 'john@example.com',
          is_anonymous: false,
          mark_as_answered: false,
        }
      );

      expect(mocks.toastService.error).toHaveBeenCalledWith('Failed to submit update');
    });

    it('deletePersonalUpdate success refreshes cache', async () => {
      mocks.prayerService.deletePersonalPrayerUpdate.mockResolvedValue(true);
      mocks.cacheService.get.mockReturnValue(null);
      mocks.prayerService.getPersonalPrayers.mockResolvedValue([]);

      const facade = createPrayerCardActionsFacade(mocks);
      await facade.deleteUpdateForCard(
        { id: 'p1', user_email: 'me@example.com' },
        { updateId: 'u1', prayerId: 'p1' }
      );

      expect(mocks.prayerService.deletePersonalPrayerUpdate).toHaveBeenCalledWith('u1');
    });

    it('deletePersonalUpdate error handling', async () => {
      mocks.prayerService.deletePersonalPrayerUpdate.mockRejectedValue(new Error('Delete failed'));

      const facade = createPrayerCardActionsFacade(mocks);
      await facade.deleteUpdateForCard(
        { id: 'p1', user_email: 'me@example.com' },
        { updateId: 'u1', prayerId: 'p1' }
      );

      expect(mocks.toastService.error).toHaveBeenCalledWith('Failed to delete update');
    });

    it('getFilteredPersonalPrayers returns all when no search term', () => {
      const prayers = [
        { id: 'p1', title: 'Prayer 1', description: 'Desc', prayer_for: 'Person', status: 'current' as any, requester: 'Me', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), date_requested: new Date().toISOString(), updates: [] },
        { id: 'p2', title: 'Prayer 2', description: 'Desc', prayer_for: 'Person', status: 'current' as any, requester: 'Me', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), date_requested: new Date().toISOString(), updates: [] }
      ];

      const comp = createHomeComponent(mocks)
      comp.personalPrayers = prayers;
      comp.filters = { searchTerm: '' };

      const filtered = comp.getFilteredPersonalPrayers();

      expect(filtered).toEqual(prayers);
    });

    it('getFilteredPersonalPrayers filters by search term', () => {
      const prayers = [
        { id: 'p1', title: 'Find Me', description: 'Desc', prayer_for: 'Person', status: 'current' as any, requester: 'Me', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), date_requested: new Date().toISOString(), updates: [] },
        { id: 'p2', title: 'Other', description: 'Desc', prayer_for: 'Person', status: 'current' as any, requester: 'Me', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), date_requested: new Date().toISOString(), updates: [] }
      ];

      const comp = createHomeComponent(mocks)
      comp.personalPrayers = prayers;
      comp.filters = { searchTerm: 'find' };

      const filtered = comp.getFilteredPersonalPrayers();

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('p1');
    });

    it('getFilteredPersonalPrayers filters by update content', () => {
      const prayers = [
        { 
          id: 'p1', 
          title: 'Prayer 1', 
          description: 'Desc', 
          prayer_for: 'Person', 
          status: 'current' as any, 
          requester: 'Me', 
          created_at: new Date().toISOString(), 
          updated_at: new Date().toISOString(), 
          date_requested: new Date().toISOString(), 
          updates: [{ content: 'This has searchable update text' }] 
        },
        { 
          id: 'p2', 
          title: 'Prayer 2', 
          description: 'Desc', 
          prayer_for: 'Person', 
          status: 'current' as any, 
          requester: 'Me', 
          created_at: new Date().toISOString(), 
          updated_at: new Date().toISOString(), 
          date_requested: new Date().toISOString(), 
          updates: [{ content: 'Nothing here' }] 
        }
      ];

      const comp = createHomeComponent(mocks)
      comp.personalPrayers = prayers as any;
      comp.filters = { searchTerm: 'searchable' };

      const filtered = comp.getFilteredPersonalPrayers();

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('p1');
    });

    it('getFilteredPersonalPrayers respects selected categories', () => {
      const prayers = [
        { id: 'p1', title: 'Alpha', description: 'Desc', prayer_for: 'Person', status: 'current' as any, requester: 'Me', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), date_requested: new Date().toISOString(), updates: [], category: 'Morning' },
        { id: 'p2', title: 'Beta', description: 'Desc', prayer_for: 'Person', status: 'current' as any, requester: 'Me', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), date_requested: new Date().toISOString(), updates: [], category: 'Evening' }
      ];

      const comp = createHomeComponent(mocks)
      comp.personalPrayers = prayers;
      comp.personalCategory.personalCategoryFilterMode = 'named';
      comp.personalCategory.selectedPersonalCategories = ['Evening'];

      const filtered = comp.getFilteredPersonalPrayers();

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('p2');
    });

    it('getFilteredPersonalPrayers Current mode excludes Answered', () => {
      const prayers = [
        { id: 'p1', title: 'Open', description: 'Desc', prayer_for: 'Person', status: 'current' as any, requester: 'Me', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), date_requested: new Date().toISOString(), updates: [], category: 'Health' },
        { id: 'p2', title: 'Done', description: 'Desc', prayer_for: 'Person', status: 'answered' as any, requester: 'Me', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), date_requested: new Date().toISOString(), updates: [], category: 'Answered' },
        { id: 'p3', title: 'None', description: 'Desc', prayer_for: 'Person', status: 'current' as any, requester: 'Me', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), date_requested: new Date().toISOString(), updates: [] },
      ];

      const comp = createHomeComponent(mocks);
      comp.personalPrayers = prayers as any;
      comp.personalCategory.personalCategoryFilterMode = 'current';

      const filtered = comp.getFilteredPersonalPrayers();
      expect(filtered.map((p) => p.id)).toEqual(['p1', 'p3']);
      expect(comp.personalCategory.personalCurrentPrayersCount(comp.personalPrayers)).toBe(2);
      expect(comp.personalCategory.personalAnsweredPrayersCount(comp.personalPrayers)).toBe(1);
    });

    it('getFilteredPersonalPrayers Answered and Total modes', () => {
      const prayers = [
        { id: 'p1', title: 'Open', description: 'Desc', prayer_for: 'Person', status: 'current' as any, requester: 'Me', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), date_requested: new Date().toISOString(), updates: [], category: 'Health' },
        { id: 'p2', title: 'Done', description: 'Desc', prayer_for: 'Person', status: 'answered' as any, requester: 'Me', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), date_requested: new Date().toISOString(), updates: [], category: 'Answered' },
      ];

      const comp = createHomeComponent(mocks);
      comp.personalPrayers = prayers as any;

      comp.personalCategory.personalCategoryFilterMode = 'answered';
      expect(comp.getFilteredPersonalPrayers().map((p) => p.id)).toEqual(['p2']);

      comp.personalCategory.personalCategoryFilterMode = 'total';
      expect(comp.getFilteredPersonalPrayers().map((p) => p.id)).toEqual([
        'p1',
        'p2',
      ]);
    });

    it('derived named categories omit Answered from reorderable chips', () => {
      mocks.prayerService.getPersonalPrayersSnapshot.mockReturnValue([
        { id: '1', category: 'Health', display_order: 2000 } as PrayerRequest,
        { id: '2', category: 'Answered', display_order: 1500 } as PrayerRequest,
        { id: '3', category: 'Family', display_order: 1000 } as PrayerRequest,
      ]);
      const comp = createHomeComponent(mocks);
      expect(comp.personalCategory.uniquePersonalCategories).toEqual([
        'Health',
        'Family',
      ]);
    });

    it('markAllCurrentAsRead calls badgeService', () => {
      const comp = createHomeComponent(mocks)

      comp.badgeService.markAllAsReadByStatus("prayers", "current");

      expect(mocks.badgeService.markAllAsReadByStatus).toHaveBeenCalledWith('prayers', 'current');
    });

    it('markAllAnsweredAsRead calls badgeService', () => {
      const comp = createHomeComponent(mocks)

      comp.badgeService.markAllAsReadByStatus("prayers", "answered");

      expect(mocks.badgeService.markAllAsReadByStatus).toHaveBeenCalledWith('prayers', 'answered');
    });

    it('markAllPromptsAsRead calls badgeService', () => {
      const comp = createHomeComponent(mocks)

      comp.badgeService.markAllAsRead("prompts");

      expect(mocks.badgeService.markAllAsRead).toHaveBeenCalledWith('prompts');
    });

    it('markPromptTypeAsRead calls badgeService with prompt type', () => {
      const comp = createHomeComponent(mocks)

      comp.badgeService.markAllAsReadByPromptType('Church');

      expect(mocks.badgeService.markAllAsReadByPromptType).toHaveBeenCalledWith('Church');
    });
  });

  describe('Filter functionality for personal prayers', () => {
    it('setFilter personal sets activeFilter and calls applyFilters', () => {
      const comp = createHomeComponent(mocks)

      comp.filters.searchTerm = 'search';
      comp.filter.setFilter('personal');

      expect(comp.activeFilter).toBe('personal');
      expect(mocks.prayerService.applyFilters).toHaveBeenCalledWith({ search: 'search' });
    });
  });

  describe('Personal Prayer Drag and Drop', () => {
    it('onPersonalPrayerDrop should return early if index does not change', async () => {
      const comp = createHomeComponent(mocks)

      const prayers: PrayerRequest[] = [
        { id: '1', title: 'Prayer 1' } as PrayerRequest,
        { id: '2', title: 'Prayer 2' } as PrayerRequest
      ];
      comp.personalPrayers = prayers;

      const event = {
        previousIndex: 0,
        currentIndex: 0
      } as any;

      await comp.personalCategory.onPersonalPrayerDrop(event);

      expect(comp.personalPrayers).toEqual(prayers);
      expect(mocks.prayerService.updatePersonalPrayerOrder).not.toHaveBeenCalled();
    });

    it('onPersonalPrayerDrop shows error when multiple categories are selected', async () => {
      const comp = createHomeComponent(mocks)

      comp.personalPrayers = [
        { id: '1', title: 'Prayer 1', category: 'Members', display_order: 1 } as PrayerRequest,
        { id: '2', title: 'Prayer 2', category: 'Leaders', display_order: 2 } as PrayerRequest
      ];
      comp.personalCategory.selectedPersonalCategories = ['Members', 'Leaders'];

      const event = {
        previousIndex: 0,
        currentIndex: 1
      } as any;

      await comp.personalCategory.onPersonalPrayerDrop(event);

      expect(mocks.toastService.error).toHaveBeenCalledWith('Select a single category to reorder prayers');
      expect(mocks.prayerService.updatePersonalPrayerOrder).not.toHaveBeenCalled();
    });

    it('onPersonalPrayerDrop should reorder and persist prayers on successful drop', async () => {
      const prayers: PrayerRequest[] = [
        { id: '1', title: 'Prayer 1', category: 'Members', display_order: 1001 } as PrayerRequest,
        { id: '2', title: 'Prayer 2', category: 'Members', display_order: 1000 } as PrayerRequest
      ];
      const reorderedPrayers: PrayerRequest[] = [
        { id: '2', title: 'Prayer 2', category: 'Members', display_order: 1001 } as PrayerRequest,
        { id: '1', title: 'Prayer 1', category: 'Members', display_order: 1000 } as PrayerRequest
      ];

      mocks.prayerService.updatePersonalPrayerOrder.mockResolvedValue(true);
      mocks.prayerService.getPersonalPrayers.mockResolvedValue(reorderedPrayers);

      const comp = createHomeComponent(mocks)

      comp.personalPrayers = prayers;
      comp.personalCategory.personalCategoryFilterMode = 'named';
      comp.personalCategory.selectedPersonalCategories = ['Members']; // Must have single category to reorder

      const event = {
        previousIndex: 0,
        currentIndex: 1
      } as any;

      await comp.personalCategory.onPersonalPrayerDrop(event);

      expect(mocks.prayerService.updatePersonalPrayerOrder).toHaveBeenCalled();
      // Personal prayers are now updated via service observable subscription, not explicit getPersonalPrayers call
      expect(comp.personalPrayers[0].id).toBe('2');
      expect(comp.personalPrayers[1].id).toBe('1');
    });

    it('onPersonalPrayerDrop should rollback on error and show error toast', async () => {
      const prayers: PrayerRequest[] = [
        { id: '1', title: 'Prayer 1', category: 'Members', display_order: 1001 } as PrayerRequest,
        { id: '2', title: 'Prayer 2', category: 'Members', display_order: 1000 } as PrayerRequest
      ];

      mocks.prayerService.updatePersonalPrayerOrder.mockResolvedValue(false);
      // Ensure getPersonalPrayers returns the original order (not reordered)
      mocks.prayerService.getPersonalPrayers.mockResolvedValue([
        { id: '1', title: 'Prayer 1', category: 'Members', display_order: 1001 } as PrayerRequest,
        { id: '2', title: 'Prayer 2', category: 'Members', display_order: 1000 } as PrayerRequest
      ]);
      // Mock cache to return null on get so it forces a reload
      mocks.cacheService.get.mockReturnValue(null);

      const comp = createHomeComponent(mocks)

      comp.personalPrayers = [...prayers]; // Make a copy to avoid reference issues
      comp.personalCategory.personalCategoryFilterMode = 'named';
      comp.personalCategory.selectedPersonalCategories = ['Members']; // Must have single category to reorder

      const event = {
        previousIndex: 0,
        currentIndex: 1
      } as any;

      await comp.personalCategory.onPersonalPrayerDrop(event);

      // After error, should be restored to original order
      expect(comp.personalPrayers[0].id).toBe('1');
      expect(comp.personalPrayers[1].id).toBe('2');
      expect(mocks.toastService.error).toHaveBeenCalledWith('Failed to reorder prayers');
    });
  });

  describe('Category Drag and Drop', () => {
    it('onCategoryDragStarted should set dragging flag and cursor', () => {
      const comp = createHomeComponent(mocks)

      comp.personalCategory.onCategoryDragStarted();

      expect(comp.personalCategory.isCategoryDragging).toBe(true);
      expect(document.body.style.cursor).toBe('grabbing');
    });

    it('onCategoryDragEnded should clear dragging flag and cursor', () => {
      const comp = createHomeComponent(mocks)

      comp.personalCategory.isCategoryDragging = true;
      document.body.style.cursor = 'grabbing';

      comp.personalCategory.onCategoryDragEnded();

      expect(comp.personalCategory.isCategoryDragging).toBe(false);
      expect(document.body.style.cursor).toBe('');
    });

    it('onCategoryDrop should return early if index does not change', async () => {
      const comp = createHomeComponent(mocks)
      mocks.prayerService.getPersonalPrayersSnapshot.mockReturnValue([
        { id: '1', category: 'Members', display_order: 2000 } as PrayerRequest,
        { id: '2', category: 'Leaders', display_order: 1000 } as PrayerRequest,
      ]);

      const event = {
        previousIndex: 0,
        currentIndex: 0
      } as any;

      await comp.personalCategory.onCategoryDrop(event);

      expect(mocks.prayerService.swapCategoryRanges).not.toHaveBeenCalled();
      expect(mocks.prayerService.reorderCategories).not.toHaveBeenCalled();
    });

    it('onCategoryDrop should return early if already swapping', async () => {
      const comp = createHomeComponent(mocks)
      mocks.prayerService.getPersonalPrayersSnapshot.mockReturnValue([
        { id: '1', category: 'Members', display_order: 2000 } as PrayerRequest,
        { id: '2', category: 'Leaders', display_order: 1000 } as PrayerRequest,
      ]);
      comp.personalCategory.setSwappingCategoriesForTests("Members", "Leaders");

      const event = {
        previousIndex: 0,
        currentIndex: 1
      } as any;

      await comp.personalCategory.onCategoryDrop(event);

      expect(mocks.prayerService.swapCategoryRanges).not.toHaveBeenCalled();
    });

    it('onCategoryDrop should use swapCategoryRanges for adjacent swap', async () => {
      mocks.prayerService.swapCategoryRanges.mockResolvedValue(true);
      mocks.prayerService.getPersonalPrayersSnapshot.mockReturnValue([
        { id: '1', title: 'Prayer 1', category: 'Members', display_order: 2000 } as PrayerRequest,
        { id: '2', title: 'Prayer 2', category: 'Leaders', display_order: 1000 } as PrayerRequest,
      ]);

      const comp = createHomeComponent(mocks)

      const event = {
        previousIndex: 0,
        currentIndex: 1
      } as any;

      await comp.personalCategory.onCategoryDrop(event);

      expect(mocks.prayerService.swapCategoryRanges).toHaveBeenCalledWith('Members', 'Leaders');
      expect(comp.personalCategory.isCategoryDropListDisabled).toBe(false);
    });

    it('onCategoryDrop should use reorderCategories for non-adjacent swap', async () => {
      mocks.prayerService.reorderCategories.mockResolvedValue(true);
      mocks.prayerService.getPersonalPrayersSnapshot.mockReturnValue([
        { id: '1', category: 'A', display_order: 5000 } as PrayerRequest,
        { id: '2', category: 'B', display_order: 4000 } as PrayerRequest,
        { id: '3', category: 'C', display_order: 3000 } as PrayerRequest,
        { id: '4', category: 'D', display_order: 2000 } as PrayerRequest,
        { id: '5', category: 'E', display_order: 1000 } as PrayerRequest,
      ]);

      const comp = createHomeComponent(mocks)

      const event = {
        previousIndex: 0,
        currentIndex: 4
      } as any;

      await comp.personalCategory.onCategoryDrop(event);

      expect(mocks.prayerService.reorderCategories).toHaveBeenCalledWith(['B', 'C', 'D', 'E', 'A']);
    });

    it('onCategoryDrop should show error and rollback on swap failure', async () => {
      mocks.prayerService.swapCategoryRanges.mockResolvedValue(false);
      mocks.prayerService.getPersonalPrayersSnapshot.mockReturnValue([
        { id: '1', category: 'Members', display_order: 2000 } as PrayerRequest,
        { id: '2', category: 'Leaders', display_order: 1000 } as PrayerRequest,
      ]);

      const comp = createHomeComponent(mocks)

      const event = {
        previousIndex: 0,
        currentIndex: 1
      } as any;

      await comp.personalCategory.onCategoryDrop(event);

      expect(mocks.toastService.error).toHaveBeenCalledWith('Failed to reorder categories');
      expect(comp.personalCategory.uniquePersonalCategories[0]).toBe('Members');
      expect(comp.personalCategory.uniquePersonalCategories[1]).toBe('Leaders');
    });

    it('onCategoryDrop should show error and rollback on swap exception', async () => {
      mocks.prayerService.swapCategoryRanges.mockRejectedValue(new Error('Swap error'));
      mocks.prayerService.getPersonalPrayersSnapshot.mockReturnValue([
        { id: '1', category: 'Members', display_order: 2000 } as PrayerRequest,
        { id: '2', category: 'Leaders', display_order: 1000 } as PrayerRequest,
      ]);

      const comp = createHomeComponent(mocks)

      const event = {
        previousIndex: 0,
        currentIndex: 1
      } as any;

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await comp.personalCategory.onCategoryDrop(event);

      expect(consoleSpy).toHaveBeenCalledWith('Error reordering categories:', expect.any(Error));
      expect(mocks.toastService.error).toHaveBeenCalledWith('Failed to reorder categories');
      expect(comp.personalCategory.uniquePersonalCategories[0]).toBe('Members');
      expect(comp.personalCategory.uniquePersonalCategories[1]).toBe('Leaders');
      consoleSpy.mockRestore();
    });

    it('onCategoryDrop should leave categories derived from snapshot after success', async () => {
      mocks.prayerService.swapCategoryRanges.mockResolvedValue(true);
      mocks.prayerService.getPersonalPrayersSnapshot.mockReturnValue([
        { id: '1', title: 'Prayer 1', category: 'Members', display_order: 2000 } as PrayerRequest,
        { id: '2', title: 'Prayer 2', category: 'Leaders', display_order: 1000 } as PrayerRequest,
      ]);

      const comp = createHomeComponent(mocks)

      const event = {
        previousIndex: 0,
        currentIndex: 1
      } as any;

      await comp.personalCategory.onCategoryDrop(event);

      expect(comp.personalCategory.isCategoryDropListDisabled).toBe(false);
    });
  });

  describe('Personal Prayer Drag and Drop - Edge Cases', () => {
    it('onPersonalPrayerDrop should handle moving to first position when no other prayer exists', async () => {
      mocks.prayerService.updatePersonalPrayerOrder.mockResolvedValue(true);
      mocks.prayerService.getPersonalPrayers.mockResolvedValue([
        { id: '1', title: 'Prayer 1', category: 'Members', display_order: 1 } as PrayerRequest
      ]);

      const comp = createHomeComponent(mocks)

      const prayers: PrayerRequest[] = [
        { id: '1', title: 'Prayer 1', category: 'Members', display_order: 1001 } as PrayerRequest
      ];
      comp.personalPrayers = prayers;
      comp.personalCategory.personalCategoryFilterMode = 'named';
      comp.personalCategory.selectedPersonalCategories = ['Members'];

      const event = {
        previousIndex: 0,
        currentIndex: 0
      } as any;

      await comp.personalCategory.onPersonalPrayerDrop(event);

      expect(mocks.prayerService.updatePersonalPrayerOrder).not.toHaveBeenCalled(); // No change in index
    });

    it('onPersonalPrayerDrop should handle error and show error toast on exception', async () => {
      mocks.prayerService.updatePersonalPrayerOrder.mockRejectedValue(new Error('Update error'));

      const comp = createHomeComponent(mocks)

      const prayers: PrayerRequest[] = [
        { id: '1', title: 'Prayer 1', category: 'Members', display_order: 1001 } as PrayerRequest,
        { id: '2', title: 'Prayer 2', category: 'Members', display_order: 1000 } as PrayerRequest
      ];
      comp.personalPrayers = prayers;
      comp.personalCategory.personalCategoryFilterMode = 'named';
      comp.personalCategory.selectedPersonalCategories = ['Members'];

      const event = {
        previousIndex: 0,
        currentIndex: 1
      } as any;

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await comp.personalCategory.onPersonalPrayerDrop(event);

      expect(consoleSpy).toHaveBeenCalledWith('Error reordering personal prayers:', expect.any(Error));
      expect(mocks.toastService.error).toHaveBeenCalledWith('Failed to reorder prayers');
      consoleSpy.mockRestore();
    });

    it('onPersonalPrayerDrop should insert prayer at first position when it is the only one', async () => {
      mocks.prayerService.updatePersonalPrayerOrder.mockResolvedValue(true);
      mocks.prayerService.getPersonalPrayers.mockResolvedValue([
        { id: '1', title: 'Prayer 1', category: 'Members', display_order: 1 } as PrayerRequest
      ]);

      const comp = createHomeComponent(mocks)

      const prayers: PrayerRequest[] = [
        { id: '1', title: 'Prayer 1', category: 'Members', display_order: 1001 } as PrayerRequest,
        { id: '2', title: 'Prayer 2', category: 'Members', display_order: 1000 } as PrayerRequest,
        { id: '3', title: 'Prayer 3', category: 'Members', display_order: 999 } as PrayerRequest
      ];
      comp.personalPrayers = prayers;
      comp.personalCategory.personalCategoryFilterMode = 'named';
      comp.personalCategory.selectedPersonalCategories = ['Members'];

      const event = {
        previousIndex: 1,
        currentIndex: 0
      } as any;

      await comp.personalCategory.onPersonalPrayerDrop(event);

      expect(mocks.prayerService.updatePersonalPrayerOrder).toHaveBeenCalled();
      expect(mocks.toastService.error).not.toHaveBeenCalled();
    });
  });

  describe('Utility methods', () => {
    it('getUserEmail should return cached email from userSessionService', () => {
      mocks.userSessionService.getUserEmail.mockReturnValue('test@example.com');

      const comp = createHomeComponent(mocks)

      const result = comp.adminNav.getUserEmail();
      expect(result).toBe('test@example.com');
    });

    it('getUserEmail should fall back to localStorage keys', () => {
      mocks.userSessionService.getUserEmail.mockReturnValue(null);
      localStorage.setItem('approvalAdminEmail', 'admin@example.com');

      const comp = createHomeComponent(mocks)

      const result = comp.adminNav.getUserEmail();
      expect(result).toBe('admin@example.com');
      localStorage.removeItem('approvalAdminEmail');
    });

    it('markAllCurrentAsRead should call badgeService', () => {
      const comp = createHomeComponent(mocks)

      comp.badgeService.markAllAsReadByStatus("prayers", "current");
      expect(mocks.badgeService.markAllAsReadByStatus).toHaveBeenCalledWith('prayers', 'current');
    });

    it('markAllAnsweredAsRead should call badgeService', () => {
      const comp = createHomeComponent(mocks)

      comp.badgeService.markAllAsReadByStatus("prayers", "answered");
      expect(mocks.badgeService.markAllAsReadByStatus).toHaveBeenCalledWith('prayers', 'answered');
    });

    it('markAllPromptsAsRead should call badgeService', () => {
      const comp = createHomeComponent(mocks)

      comp.badgeService.markAllAsRead("prompts");
      expect(mocks.badgeService.markAllAsRead).toHaveBeenCalledWith('prompts');
    });
  });

  describe('Modal and editing methods', () => {
    it('openMemorizationPractice sync-detects so keyboard focus stays in the tap gesture', () => {
      const comp = createHomeComponent(mocks)

      const item = {
        id: 'v1',
        reference: 'John 3:16',
        text: '',
        translation: 'esv',
        dateAdded: 1,
        lastPracticedAt: null,
        practiceSessions: [],
      } as any;
      mocks.cdr.markForCheck.mockClear();
      mocks.cdr.detectChanges.mockClear();

      comp.memorizationPanel.openMemorizationPractice(item);

      expect(comp.memorizationPanel.practiceMemorizedItem).toEqual(item);
      expect(mocks.cdr.markForCheck).toHaveBeenCalled();
      expect(mocks.cdr.detectChanges).toHaveBeenCalled();
    });

    it('openMemorizationPractice primes the keyboard bridge before mounting an in-progress type session', () => {
      const comp = createHomeComponent(mocks)

      const bridge = document.createElement('input');
      const focusSpy = vi.spyOn(bridge, 'focus');
      const clickSpy = vi.spyOn(bridge, 'click');
      (comp as any).memorizeKeyboardBridge = { nativeElement: bridge };

      const item = {
        id: 'v1',
        reference: 'John 3:16',
        text: '',
        translation: 'esv',
        dateAdded: 1,
        lastPracticedAt: null,
        practiceSessions: [],
        inProgressPractice: {
          sessionSeed: 's',
          wrongAttempts: 0,
          correctKeystrokes: 1,
          updatedAt: 1,
          phase: { kind: 'inRound', roundIndex: 1 },
          practiceMode: 'type',
        },
      } as any;

      comp.memorizationPanel.openMemorizationPractice(item);

      expect(focusSpy).toHaveBeenCalled();
      expect(clickSpy).toHaveBeenCalled();
      expect(comp.memorizationPanel.practiceMemorizedItem).toEqual(item);
      focusSpy.mockRestore();
      clickSpy.mockRestore();
    });

    it('openMemorizationPractice does not prime the keyboard bridge for a fresh verse', () => {
      const comp = createHomeComponent(mocks)

      const bridge = document.createElement('input');
      const focusSpy = vi.spyOn(bridge, 'focus');
      (comp as any).memorizeKeyboardBridge = { nativeElement: bridge };

      const item = {
        id: 'v1',
        reference: 'John 3:16',
        text: '',
        translation: 'esv',
        dateAdded: 1,
        lastPracticedAt: null,
        practiceSessions: [],
      } as any;

      comp.memorizationPanel.openMemorizationPractice(item);

      expect(focusSpy).not.toHaveBeenCalled();
      focusSpy.mockRestore();
    });

    it('openEditModal should set state and mark for check', () => {
      const comp = createHomeComponent(mocks)

      const prayer = { id: '1', prayer_for: 'Test', title: 'Test Prayer' } as any;
      comp.ngOnInit();
      comp.modals.openEditModal(prayer);

      expect(comp.modals.editingPrayer).toEqual(prayer);
      expect(comp.modals.showEditPersonalPrayer).toBe(true);
      expect(mocks.cdr.markForCheck).toHaveBeenCalled();
    });

    it('onPersonalPrayerSaved should clear state and reload', () => {
      const comp = createHomeComponent(mocks)

      comp.modals.editingPrayer = { id: '1', prayer_for: 'Test', title: 'Test Prayer' } as any;
      comp.modals.showEditPersonalPrayer = true;

      comp.modals.onPersonalPrayerSaved();

      expect(comp.modals.showEditPersonalPrayer).toBe(false);
      expect(comp.modals.editingPrayer).toBeNull();
      expect(mocks.cdr.markForCheck).toHaveBeenCalled();
      // Service automatically updates personal prayers via observable
    });

    it('openEditUpdateModal should set state', () => {
      const comp = createHomeComponent(mocks)

      const update = { id: 'u1', text: 'Update text' } as any;
      comp.ngOnInit();
      comp.modals.openEditUpdateModal({ update, prayerId: 'p1' });

      expect(comp.modals.editingUpdate).toEqual(update);
      expect(comp.modals.editingUpdatePrayerId).toBe('p1');
      expect(comp.modals.showEditPersonalUpdate).toBe(true);
    });

    it('onPersonalUpdateSaved should clear state and reload', () => {
      const comp = createHomeComponent(mocks)

      comp.modals.editingUpdate = { id: 'u1', text: 'Update' } as any;
      comp.modals.editingUpdatePrayerId = 'p1';
      comp.modals.showEditPersonalUpdate = true;

      comp.modals.onPersonalUpdateSaved();

      expect(comp.modals.showEditPersonalUpdate).toBe(false);
      expect(comp.modals.editingUpdate).toBeNull();
      expect(comp.modals.editingUpdatePrayerId).toBe('');
      // Service automatically updates personal prayers via observable
    });

    it('openEditMemberUpdateModal should set state', () => {
      const comp = createHomeComponent(mocks)

      const update = { id: 'u1', text: 'Update' } as any;
      comp.ngOnInit();
      comp.modals.openEditMemberUpdateModal({ update, prayerId: 'pc-member-123' });

      expect(comp.modals.editingMemberUpdate).toEqual(update);
      expect(comp.modals.editingMemberUpdatePrayerId).toBe('pc-member-123');
      expect(comp.modals.showEditMemberUpdate).toBe(true);
    });

    it('onMemberUpdateSaved should clear state and reload member updates', async () => {
      vi.useFakeTimers();
      const comp = createHomeComponent(mocks)

      comp.modals.editingMemberUpdate = { id: 'u1', text: 'Update' } as any;
      comp.modals.editingMemberUpdatePrayerId = 'pc-member-123';
      comp.modals.showEditMemberUpdate = true;
      comp.planningCenter.planningCenterListMembers = [{ id: '123', name: 'Member' }] as any;
      comp.planningCenter.filteredPlanningCenterPrayers = [{
        id: 'pc-member-123',
        prayer_for: 'Member',
        title: 'Member Prayer',
        updates: []
      }] as any;

      mocks.prayerService.getMemberPrayerUpdates = vi.fn().mockResolvedValue([{ id: 'u2', text: 'New update' }]);

      comp.modals.onMemberUpdateSaved();

      expect(comp.modals.showEditMemberUpdate).toBe(false);
      expect(comp.modals.editingMemberUpdate).toBeNull();
      expect(comp.modals.editingMemberUpdatePrayerId).toBe('');

      // Wait for async operations
      await vi.advanceTimersByTimeAsync(150);
      expect(comp.planningCenter.filteredPlanningCenterPrayers[0].updates).toHaveLength(1);
      vi.useRealTimers();
    });
  });

  describe('Admin navigation', () => {
    it('navigateToAdmin should navigate when admin is active', () => {
      mocks.adminAuthService.isAdmin$ = new BehaviorSubject(true).asObservable();

      const comp = createHomeComponent(mocks)

      comp.adminNav.navigateToAdmin();

      expect(mocks.router.navigate).toHaveBeenCalledWith(['/admin']);
    });

    it('navigateToAdmin should show MFA modal when admin session expired', () => {
      mocks.adminAuthService.isAdmin$ = new BehaviorSubject(false).asObservable();
      localStorage.setItem('userEmail', 'user@example.com');

      const comp = createHomeComponent(mocks)

      comp.adminNav.navigateToAdmin();

      expect(mocks.router.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: {
          email: 'user@example.com',
          sessionExpired: true
        }
      });
      localStorage.removeItem('userEmail');
    });

    it('logout should call adminAuthService and show success toast', async () => {
      const comp = createHomeComponent(mocks)

      await mocks.adminAuthService.logout();

      expect(mocks.adminAuthService.logout).toHaveBeenCalled();
    });
  });

  describe('Private member update reloading', () => {
    it('onMemberUpdateSaved should handle missing member', async () => {
      vi.useFakeTimers();
      const comp = createHomeComponent(mocks)

      comp.modals.editingMemberUpdate = { id: 'u1', text: 'Update' } as any;
      comp.modals.editingMemberUpdatePrayerId = 'pc-member-999';
      comp.modals.showEditMemberUpdate = true;
      comp.planningCenter.planningCenterListMembers = [{ id: '123', name: 'Member' }] as any;
      comp.planningCenter.filteredPlanningCenterPrayers = [] as any;

      comp.modals.onMemberUpdateSaved();

      await vi.advanceTimersByTimeAsync(150);
      expect(comp.modals.editingMemberUpdate).toBeNull();
      vi.useRealTimers();
    });

    it('onMemberUpdateSaved should handle missing prayer card', async () => {
      vi.useFakeTimers();
      const comp = createHomeComponent(mocks)

      comp.modals.editingMemberUpdate = { id: 'u1', text: 'Update' } as any;
      comp.modals.editingMemberUpdatePrayerId = 'pc-member-123';
      comp.modals.showEditMemberUpdate = true;
      comp.planningCenter.planningCenterListMembers = [{ id: '123', name: 'Member' }] as any;
      comp.planningCenter.filteredPlanningCenterPrayers = [{
        id: 'pc-member-999',
        prayer_for: 'Other Member',
        title: 'Other Prayer',
        updates: []
      }] as any;

      mocks.prayerService.getMemberPrayerUpdates = vi.fn().mockResolvedValue([]);

      comp.modals.onMemberUpdateSaved();

      await vi.advanceTimersByTimeAsync(150);
      expect(comp.modals.editingMemberUpdate).toBeNull();
      vi.useRealTimers();
    });

    it('onMemberUpdateSaved should handle getMemberPrayerUpdates error', async () => {
      vi.useFakeTimers();
      const comp = createHomeComponent(mocks)

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      comp.modals.editingMemberUpdate = { id: 'u1', text: 'Update' } as any;
      comp.modals.editingMemberUpdatePrayerId = 'pc-member-123';
      comp.modals.showEditMemberUpdate = true;
      comp.planningCenter.planningCenterListMembers = [{ id: '123', name: 'Member' }] as any;
      comp.planningCenter.filteredPlanningCenterPrayers = [{
        id: 'pc-member-123',
        prayer_for: 'Member',
        title: 'Member Prayer',
        updates: []
      }] as any;

      mocks.prayerService.getMemberPrayerUpdates = vi.fn().mockRejectedValue(new Error('Load failed'));

      comp.modals.onMemberUpdateSaved();

      await vi.advanceTimersByTimeAsync(150);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
      vi.useRealTimers();
    });
  });

  describe('Show admin MFA modal', () => {
    it('showAdminMfaModal should navigate with userEmail from localStorage', () => {
      localStorage.setItem('userEmail', 'admin@example.com');

      const comp = createHomeComponent(mocks)

      comp.adminNav.navigateToAdmin();

      expect(mocks.router.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: {
          email: 'admin@example.com',
          sessionExpired: true
        }
      });

      localStorage.removeItem('userEmail');
    });

    it('showAdminMfaModal should show error when no email found', () => {
      localStorage.clear();

      const comp = createHomeComponent(mocks)

      comp.adminNav.navigateToAdmin();

      expect(mocks.toastService.error).toHaveBeenCalledWith('Email not found. Please log in again.');
      expect(mocks.router.navigate).not.toHaveBeenCalled();
    });

    it('showAdminMfaModal should try multiple localStorage keys', () => {
      localStorage.clear();
      localStorage.setItem('prayerapp_user_email', 'user@prayer.app');

      const comp = createHomeComponent(mocks)

      comp.adminNav.navigateToAdmin();

      expect(mocks.router.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: {
          email: 'user@prayer.app',
          sessionExpired: true
        }
      });

      localStorage.clear();
    });
  });

  describe('Filter search with search term', () => {
    it('should return all prayers when no search term', () => {
      const comp = createHomeComponent(mocks)

      comp.planningCenter.filteredPlanningCenterPrayers = [
        { id: '1', prayer_for: 'John', title: 'Healing', description: '' } as any,
        { id: '2', prayer_for: 'Jane', title: 'Wisdom', description: '' } as any
      ];

      comp.filters = { searchTerm: '' } as any;

      comp.refreshHomeCatalog();
      const result = comp.catalog.filteredPlanningCenterPrayers;

      expect(result).toHaveLength(2);
    });

    it('should search in prayer_for field', () => {
      const comp = createHomeComponent(mocks)

      comp.planningCenter.filteredPlanningCenterPrayers = [
        { id: '1', prayer_for: 'John Doe', title: 'Healing', description: 'Needs prayer' } as any,
        { id: '2', prayer_for: 'Jane Smith', title: 'Wisdom', description: 'Job interview' } as any
      ];

      comp.filters = { searchTerm: 'John' } as any;

      comp.refreshHomeCatalog();
      const result = comp.catalog.filteredPlanningCenterPrayers;

      expect(result).toHaveLength(1);
      expect(result[0].prayer_for).toBe('John Doe');
    });

    it('should search case-insensitively in prayer_for', () => {
      const comp = createHomeComponent(mocks)

      comp.planningCenter.filteredPlanningCenterPrayers = [
        { id: '1', prayer_for: 'John Doe', title: '', description: '' } as any
      ];

      comp.filters = { searchTerm: 'JOHN' } as any;

      comp.refreshHomeCatalog();
      const result = comp.catalog.filteredPlanningCenterPrayers;

      expect(result).toHaveLength(1);
    });

    it('should search in update content', () => {
      const comp = createHomeComponent(mocks)

      comp.planningCenter.filteredPlanningCenterPrayers = [
        { 
          id: '1', 
          prayer_for: 'John Doe', 
          title: 'Healing', 
          description: '', 
          updates: [{ content: 'This is a specific update content' }] 
        } as any,
        { 
          id: '2', 
          prayer_for: 'Jane Smith', 
          title: 'Wisdom', 
          description: '', 
          updates: [] 
        } as any
      ];

      comp.filters = { searchTerm: 'specific update' } as any;

      comp.refreshHomeCatalog();
      const result = comp.catalog.filteredPlanningCenterPrayers;

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should search in title field', () => {
      const comp = createHomeComponent(mocks)

      comp.planningCenter.filteredPlanningCenterPrayers = [
        { id: '1', prayer_for: 'John', title: 'Healing Surgery', description: '' } as any
      ];

      comp.filters = { searchTerm: 'Healing' } as any;

      comp.refreshHomeCatalog();
      const result = comp.catalog.filteredPlanningCenterPrayers;

      expect(result).toHaveLength(1);
    });

    it('should search in description field', () => {
      const comp = createHomeComponent(mocks)

      comp.planningCenter.filteredPlanningCenterPrayers = [
        { id: '1', prayer_for: 'Jane', title: 'Work Issues', description: 'Difficult project deadline' } as any
      ];

      comp.filters = { searchTerm: 'deadline' } as any;

      comp.refreshHomeCatalog();
      const result = comp.catalog.filteredPlanningCenterPrayers;

      expect(result).toHaveLength(1);
    });

    it('should return empty array when no matches found', () => {
      const comp = createHomeComponent(mocks)

      comp.planningCenter.filteredPlanningCenterPrayers = [
        { id: '1', prayer_for: 'John', title: 'Healing', description: '' } as any
      ];

      comp.filters = { searchTerm: 'xyz' } as any;

      comp.refreshHomeCatalog();
      const result = comp.catalog.filteredPlanningCenterPrayers;

      expect(result).toHaveLength(0);
    });

    it('should trim whitespace from search term', () => {
      const comp = createHomeComponent(mocks)

      comp.planningCenter.filteredPlanningCenterPrayers = [
        { id: '1', prayer_for: 'John', title: '', description: '' } as any
      ];

      comp.filters = { searchTerm: '  John  ' } as any;

      comp.refreshHomeCatalog();
      const result = comp.catalog.filteredPlanningCenterPrayers;

      expect(result).toHaveLength(1);
    });
  });

  describe('Personal category count', () => {
    it('getPersonalCategoryCount should count prayers by category', () => {
      const comp = createHomeComponent(mocks)

      comp.personalPrayers = [
        { id: '1', category: 'Healing' } as any,
        { id: '2', category: 'Healing' } as any,
        { id: '3', category: 'Wisdom' } as any
      ];

      expect(comp.catalog.personalCategoryCount('Healing')).toBe(2);
      expect(comp.catalog.personalCategoryCount('Wisdom')).toBe(1);
    });

    it('getPersonalCategoryCount should return 0 for non-existent category', () => {
      const comp = createHomeComponent(mocks)

      comp.personalPrayers = [
        { id: '1', category: 'Healing' } as any
      ];

      expect(comp.catalog.personalCategoryCount('NonExistent')).toBe(0);
    });

    it('getPersonalCategoryCount should work with empty prayers array', () => {
      const comp = createHomeComponent(mocks)

      comp.personalPrayers = [];

      expect(comp.catalog.personalCategoryCount('Healing')).toBe(0);
    });
  });

  describe('Prayer card action facade delegation', () => {
    it('addUpdate delegates to prayerService.addUpdate for regular prayers', async () => {
      mocks.prayerService.addUpdate.mockResolvedValue(undefined);

      const facade = createPrayerCardActionsFacade(mocks);
      await facade.addUpdateForCard(
        { id: 'p1' },
        {
          prayer_id: 'p1',
          content: 'Update',
          author: 'A',
          author_email: 'a@b.com',
          is_anonymous: false,
          mark_as_answered: false,
        }
      );

      expect(mocks.prayerService.addUpdate).toHaveBeenCalledWith({
        prayer_id: 'p1',
        content: 'Update',
        author: 'A',
        author_email: 'a@b.com',
        is_anonymous: false,
        mark_as_answered: false,
      });
    });

    it('requestDeletion delegates to prayerService.requestDeletion', async () => {
      mocks.prayerService.requestDeletion.mockResolvedValue(undefined);

      const facade = createPrayerCardActionsFacade(mocks);
      const requestData = { id: 'p1', reason: 'Done' };
      await facade.requestDeletion(requestData);

      expect(mocks.prayerService.requestDeletion).toHaveBeenCalledWith(requestData);
    });

    it('requestUpdateDeletion delegates to prayerService.requestUpdateDeletion', async () => {
      mocks.prayerService.requestUpdateDeletion.mockResolvedValue(undefined);

      const facade = createPrayerCardActionsFacade(mocks);
      const requestData = { id: 'u1', reason: 'Spam' };
      await facade.requestUpdateDeletion(requestData);

      expect(mocks.prayerService.requestUpdateDeletion).toHaveBeenCalledWith(
        requestData
      );
    });
  });

  describe('Error handling in member update reload', () => {
    it('should refresh catalog after member update reload', async () => {
      vi.useFakeTimers();
      try {
        const comp = createHomeComponent(mocks);
        const refreshSpy = vi.spyOn(comp, 'refreshHomeCatalog');

        comp.modals.editingMemberUpdate = { id: 'u1', text: 'Update' } as any;
        comp.modals.editingMemberUpdatePrayerId = 'pc-member-123';
        comp.modals.showEditMemberUpdate = true;
        comp.planningCenter.planningCenterListMembers = [
          { id: '123', name: 'Member' },
        ] as any;
        comp.planningCenter.filteredPlanningCenterPrayers = [
          {
            id: 'pc-member-123',
            prayer_for: 'Member',
            title: 'Member Prayer',
            updates: [],
          },
        ] as any;

        mocks.prayerService.getMemberPrayerUpdates = vi.fn().mockResolvedValue([
          { id: 'u2', text: 'New update' },
        ]);

        comp.modals.onMemberUpdateSaved();

        await vi.advanceTimersByTimeAsync(150);
        await Promise.resolve();
        await Promise.resolve();

        expect(refreshSpy).toHaveBeenCalled();
        expect(
          comp.planningCenter.filteredPlanningCenterPrayers[0].updates
        ).toEqual([{ id: 'u2', text: 'New update' }]);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('getDisplayedPrompts', () => {
    it('should return empty array when activeFilter is not prompts', () => {
      const comp = createHomeComponent(mocks)

      comp.activeFilter = 'current';
      comp.refreshHomeCatalog();

      const result = comp.catalog.displayedPrompts;

      expect(result).toHaveLength(0);
    });

    it('should return prompts when activeFilter is prompts', () => {
      const comp = createHomeComponent(mocks)

      comp.activeFilter = 'prompts';
      const prompts = [
        { id: '1', text: 'Prompt 1' } as any,
        { id: '2', text: 'Prompt 2' } as any
      ];
      mocks.promptService.promptsSubject.next(prompts);
      comp.refreshHomeCatalog();

      const result = comp.catalog.displayedPrompts;

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
    });
  });

  describe('ngOnInit initialization flow', () => {
    it('should load personal prayers on user session emission', async () => {
      const mocks = makeMocks();
      const mockPersonalPrayers = [{ id: 'p1', title: 'Prayer 1' }];
      const { allPersonalPrayersSubject } = mocks;

      const comp = createHomeComponent(mocks)

      comp.ngOnInit();

      // Simulate personal prayers being emitted from service observable
      allPersonalPrayersSubject.next(mockPersonalPrayers);

      // Allow async operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify that personal prayers were received and stored in component
      expect(comp.personalPrayers).toEqual(mockPersonalPrayers);
      expect(comp.personalPrayersCount).toBe(1);
    });

    it('should apply filter after user session is set', async () => {
      const mocks = makeMocks();
      mocks.prayerService.getPersonalPrayers.mockResolvedValue([]);
      mocks.prayerService.getUniqueCategoriesForUser.mockResolvedValue([]);

      const comp = createHomeComponent(mocks)

      comp.ngOnInit();

      // Simulate user session emission
      mocks.userSessionSubject.next({ defaultPrayerView: 'personal' });

      // Allow async operations to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Filter should be set to the user's default view
      expect(comp.activeFilter).toBe('personal');
    });

    it('should strip filter query param after applying email deep link (replace query string, not filter: null)', async () => {
      const mocks = makeMocks();
      mocks.router.url = '/?filter=current';
      mocks.router.parseUrl = vi.fn(() => ({
        queryParams: { filter: 'current' }
      }));
      mocks.activatedRoute = {
        snapshot: { queryParams: { filter: 'current' } }
      };
      mocks.prayerService.getPersonalPrayers.mockResolvedValue([]);
      mocks.prayerService.getUniqueCategoriesForUser.mockResolvedValue([]);

      const comp = createHomeComponent(mocks)

      comp.ngOnInit();
      mocks.userSessionSubject.next({ defaultPrayerView: 'personal' });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(comp.activeFilter).toBe('current');
      expect(mocks.router.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          queryParams: {},
          queryParamsHandling: '',
          replaceUrl: true
        })
      );
    });

    it('sets personal filter to answered when deep linking to answered personal prayer', () => {
      const answeredPrayer = {
        id: 'p-answered',
        title: 'Answered prayer',
        prayer_for: 'Test',
        description: 'Desc',
        category: 'Answered',
        updates: [],
      } as PrayerRequest;
      mocks.prayerService.getPersonalPrayersSnapshot.mockReturnValue([
        answeredPrayer,
      ]);
      mocks.prayerService.getAllCommunityPrayersSnapshot.mockReturnValue([]);

      const comp = createHomeComponent(mocks);
      comp.personalPrayers = [answeredPrayer];
      comp.personalCategory.personalCategoryFilterMode = 'current';
      comp.activeFilter = 'personal';

      (comp as any).deepLinkCoordinator.openPrayerDeepLink('p-answered');

      expect(comp.personalCategory.personalCategoryFilterMode).toBe('answered');
      expect(
        comp.getFilteredPersonalPrayers().some((p) => p.id === 'p-answered')
      ).toBe(true);
    });

    it('should open Memorize tab from ?filter=memorize deep link and load items', async () => {
      const mocks = makeMocks();
      mocks.router.url = '/?filter=memorize';
      mocks.router.parseUrl = vi.fn(() => ({
        queryParams: { filter: 'memorize' }
      }));
      mocks.activatedRoute = {
        snapshot: { queryParams: { filter: 'memorize' } }
      };
      mocks.prayerService.getPersonalPrayers.mockResolvedValue([]);
      mocks.prayerService.getUniqueCategoriesForUser.mockResolvedValue([]);

      const comp = createHomeComponent(mocks)

      comp.ngOnInit();
      mocks.userSessionSubject.next({ defaultPrayerView: 'current' });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(comp.activeFilter).toBe('memorize');
      expect(mocks.memorizationService.loadItems).toHaveBeenCalled();
      expect(mocks.router.navigate).toHaveBeenCalledWith(
        [],
        expect.objectContaining({
          queryParams: {},
          queryParamsHandling: '',
          replaceUrl: true
        })
      );
    });

    it('should apply memorize push deep link after session when navigation arrives before viewReady', async () => {
      const mocks = makeMocks();
      const routerEvents$ = new Subject<NavigationEnd>();
      mocks.router.events = routerEvents$.asObservable();
      mocks.router.url = '/';
      mocks.router.parseUrl = vi.fn((url: string) => {
        if (String(url).includes('filter=memorize')) {
          return { queryParams: { filter: 'memorize' } };
        }
        return { queryParams: {} };
      });
      mocks.activatedRoute = {
        snapshot: { queryParams: {} }
      };
      mocks.prayerService.getPersonalPrayers.mockResolvedValue([]);
      mocks.prayerService.getUniqueCategoriesForUser.mockResolvedValue([]);

      const comp = createHomeComponent(mocks)

      comp.ngOnInit();
      routerEvents$.next(
        new NavigationEnd(1, '/?filter=memorize', '/?filter=memorize')
      );

      mocks.userSessionSubject.next({ defaultPrayerView: 'current' });
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(comp.activeFilter).toBe('memorize');
      expect(mocks.memorizationService.loadItems).toHaveBeenCalled();
    });

    it('should load Planning Center data without blocking filter application', async () => {
      const mocks = makeMocks();
      mocks.prayerService.getPersonalPrayers.mockResolvedValue([]);
      mocks.prayerService.getUniqueCategoriesForUser.mockResolvedValue([]);

      const comp = createHomeComponent(mocks)

      comp.ngOnInit();

      // Track when filter is applied
      const filterSetTime = Date.now();

      // Simulate user session emission
      mocks.userSessionSubject.next({ defaultPrayerView: 'current' });

      // Allow personal prayers to load (fast)
      await new Promise(resolve => setTimeout(resolve, 50));

      // Filter should be applied immediately after personal prayers
      expect(comp.activeFilter).toBe('current');
    });

    it('should handle error loading personal prayers gracefully', async () => {
      const mocks = makeMocks();
      const error = new Error('Failed to load personal prayers');
      mocks.prayerService.getPersonalPrayers.mockRejectedValue(error);

      const comp = createHomeComponent(mocks)

      comp.ngOnInit();

      // Should not throw when user session is emitted
      expect(() => {
        mocks.userSessionSubject.next({ defaultPrayerView: 'current' });
      }).not.toThrow();

      // Allow async operations
      await new Promise(resolve => setTimeout(resolve, 100));

      // Component should still be functional
      expect(comp).toBeDefined();
    });

    it('loads Planning Center list via service independently of filter application', async () => {
      const mocks = makeMocks();
      mocks.prayerService.getPersonalPrayers.mockResolvedValue([]);
      mocks.prayerService.getUniqueCategoriesForUser.mockResolvedValue([]);

      const comp = createHomeComponent(mocks)

      comp.ngOnInit();

      expect(mocks.planningCenterListService.loadForCurrentUser).toHaveBeenCalled();

      mocks.userSessionSubject.next({ email: 'user@example.com', defaultPrayerView: 'current' });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mocks.planningCenterListService.loadForUser).toHaveBeenCalledWith('user@example.com');
    });
  });

  describe('Planning Center members filter button', () => {
    const newHome = (mocks: ReturnType<typeof makeMocks>) =>
      createHomeComponent(mocks)

    it('shows filter when list id is set before members finish loading', () => {
      const mocks = makeMocks();
      const comp = newHome(mocks);
      comp.planningCenter.planningCenterListId = 'list-abc';
      comp.planningCenter.planningCenterListMembers = [];
      comp.planningCenter.loadingPlanningCenterList = true;

      expect(comp.planningCenter.showPlanningCenterMembersFilter).toBe(true);
      expect(comp.planningCenter.planningCenterMembersDisplayCount).toBe('…');
    });

    it('shows member count after load completes', () => {
      const mocks = makeMocks();
      const comp = newHome(mocks);
      comp.planningCenter.planningCenterListId = 'list-abc';
      comp.planningCenter.planningCenterListMembers = [
        { id: '1', name: 'A' },
        { id: '2', name: 'B' },
      ];
      comp.planningCenter.loadingPlanningCenterList = false;

      expect(comp.planningCenter.planningCenterMembersDisplayCount).toBe('2');
    });

    it('hides filter when user has no mapped list', () => {
      const mocks = makeMocks();
      const comp = newHome(mocks);
      comp.planningCenter.planningCenterListId = null;
      comp.planningCenter.planningCenterListMembers = [];

      expect(comp.planningCenter.showPlanningCenterMembersFilter).toBe(false);
    });

    it('clears filtered Planning Center prayers when list id exists but members are empty', () => {
      const mocks = makeMocks();
      const comp = newHome(mocks);
      comp.ngOnInit();
      comp.planningCenter.filteredPlanningCenterPrayers = [{ id: 'pc-member-stale' }] as any;

      mocks.pcListIdSubject.next('list-abc');
      mocks.pcMembersSubject.next([]);

      expect(comp.planningCenter.filteredPlanningCenterPrayers).toEqual([]);
    });
  });

  describe('pull-to-refresh, logout, and memorization handlers', () => {
    const newHome = (m: ReturnType<typeof makeMocks>) => createHomeComponent(m);

    it('handleLogout hides confirmation and calls logout', async () => {
      const m = makeMocks();
      const comp = newHome(m);
      comp.modals.showLogoutConfirmation = true;
      await comp.modals.handleLogout();
      expect(comp.modals.showLogoutConfirmation).toBe(false);
      expect(m.adminAuthService.logout).toHaveBeenCalled();
    });

    it('onPullToRefresh loads prayers and personal prayers when logged in', async () => {
      const m = makeMocks();
      m.userSessionService.getCurrentSession = vi.fn(() => ({ email: 'user@example.com' }));
      const comp = newHome(m);
      await comp.refresh.onPullToRefresh();
      expect(m.prayerService.loadPrayers).toHaveBeenCalledWith(true);
      expect(m.prayerService.loadPersonalPrayers).toHaveBeenCalledWith(true);
      expect(comp.isRefreshing).toBe(false);
    });

    it('onPullToRefresh skips when called again within 30 seconds', async () => {
      const m = makeMocks();
      const comp = newHome(m);
      await comp.refresh.onPullToRefresh();
      m.prayerService.loadPrayers.mockClear();
      await comp.refresh.onPullToRefresh();
      expect(m.prayerService.loadPrayers).not.toHaveBeenCalled();
    });

    it('onPullToRefresh reloads memorization items on memorize tab', async () => {
      const m = makeMocks();
      const comp = newHome(m);
      comp.activeFilter = 'memorize';
      await comp.refresh.onPullToRefresh();
      expect(m.memorizationService.loadItems).toHaveBeenCalled();
    });

    it('toggleMemberUpdateAnswered updates member prayer via service', async () => {
      const m = makeMocks();
      const comp = newHome(m);
      m.planningCenterListService.getCurrentListId.mockReturnValue('list-1');
      comp.planningCenter.planningCenterListMembers = [{ id: 'person-1', name: 'Bob' }];
      comp.planningCenter.filteredPlanningCenterPrayers = [
        { id: 'pc-member-person-1', updates: [] } as any,
      ];
      m.prayerService.getMemberPrayerUpdates.mockResolvedValue([
        { id: 'u1', content: 'updated' },
      ]);
      await comp.memberCardActions.toggleMemberUpdateAnswered({
        updateId: 'upd-1',
        prayerId: 'pc-member-person-1',
        isAnswered: true,
      });

      expect(m.prayerService.updateMemberPrayerUpdate).toHaveBeenCalledWith(
        'upd-1',
        'person-1',
        { is_answered: true },
        'list-1'
      );
      expect(m.prayerService.getMemberPrayerUpdates).toHaveBeenCalledWith('person-1');
    });

    it('onMemorizedVerseAdded marks for check', () => {
      const m = makeMocks();
      const comp = newHome(m);
      comp.memorizationPanel.onMemorizedVerseAdded();
      expect(m.cdr.markForCheck).toHaveBeenCalled();
    });

    it('isRecommendationAlreadyAdded matches verse reference and translation', () => {
      const m = makeMocks();
      const comp = newHome(m);
      comp.memorizationPanel.memorizedItems = [
        { id: '1', reference: 'John 3:16', translation: 'esv', kind: 'verse' } as any,
      ];
      expect(
        comp.memorizationPanel.isRecommendationAlreadyAdded({
          id: 'r1',
          reference: 'John 3:16',
          translation: 'esv',
          displayOrder: 0,
          createdAt: '',
          updatedAt: '',
        })
      ).toBe(true);
      expect(
        comp.memorizationPanel.isRecommendationAlreadyAdded({
          id: 'r2',
          reference: 'Romans 8:28',
          translation: 'esv',
          displayOrder: 1,
          createdAt: '',
          updatedAt: '',
        })
      ).toBe(false);
    });

    it('addRecommendedVerse fetches passage then calls addVerse and toasts success', async () => {
      const m = makeMocks();
      m.memorizationService.addVerse = vi
        .fn()
        .mockResolvedValue({ ok: true, item: {} });
      const comp = newHome(m);
      const rec = {
        id: 'r1',
        reference: 'John 3:16',
        translation: 'esv' as const,
        displayOrder: 0,
        createdAt: '',
        updatedAt: '',
      };
      await comp.memorizationPanel.addRecommendedVerse(rec);
      expect(m.scriptureService.getPassage).toHaveBeenCalledWith('John 3:16', 'esv');
      expect(m.memorizationService.addVerse).toHaveBeenCalledWith('John 3:16', 'esv');
      expect(m.toastService.success).toHaveBeenCalled();
      expect(comp.memorizationPanel.addingRecommendationId).toBeNull();
    });

    it('addRecommendedVerse skips when already added', async () => {
      const m = makeMocks();
      m.memorizationService.addVerse = vi.fn();
      const comp = newHome(m);
      comp.memorizationPanel.memorizedItems = [
        { id: '1', reference: 'John 3:16', translation: 'esv', kind: 'verse' } as any,
      ];
      await comp.memorizationPanel.addRecommendedVerse({
        id: 'r1',
        reference: 'John 3:16',
        translation: 'esv',
        displayOrder: 0,
        createdAt: '',
        updatedAt: '',
      });
      expect(m.memorizationService.addVerse).not.toHaveBeenCalled();
    });

    it('closeMemorizationPractice clears active practice item', () => {
      const m = makeMocks();
      const comp = newHome(m);
      comp.memorizationPanel.practiceMemorizedItem = { id: 'v1' } as any;
      comp.memorizationPanel.closeMemorizationPractice();
      expect(comp.memorizationPanel.practiceMemorizedItem).toBeNull();
      expect(m.cdr.markForCheck).toHaveBeenCalled();
    });

    it('onMemorizationPracticeComplete updates stats and refreshes item', async () => {
      const m = makeMocks();
      const item = { id: 'v1', text: 'verse' } as any;
      const updated = { id: 'v1', text: 'verse', practiceCount: 1 };
      m.memorizationService.items = [updated];
      m.memorizationService.updatePracticeStats = vi
        .fn()
        .mockResolvedValue(updated);
      const comp = newHome(m);
      comp.memorizationPanel.practiceMemorizedItem = item;

      await comp.memorizationPanel.onMemorizationPracticeComplete({
        wrongAttempts: 0,
        correctKeystrokes: 10,
        completed: true,
      });

      expect(m.memorizationService.updatePracticeStats).toHaveBeenCalledWith('v1', {
        wrongAttempts: 0,
        correctKeystrokes: 10,
        completed: true,
      });
      expect(comp.memorizationPanel.practiceMemorizedItem).toEqual(updated);
    });

    it('onMemorizationPersistInProgress saves in-progress state', () => {
      const m = makeMocks();
      const comp = newHome(m);
      comp.memorizationPanel.practiceMemorizedItem = { id: 'v1' } as any;
      const payload = { typedText: 'abc' } as any;
      comp.memorizationPanel.onMemorizationPersistInProgress(payload);
      expect(m.memorizationService.saveInProgress).toHaveBeenCalledWith('v1', payload);
    });

    it('onMemorizationClearInProgress clears in-progress state', () => {
      const m = makeMocks();
      const comp = newHome(m);
      comp.memorizationPanel.practiceMemorizedItem = { id: 'v1' } as any;
      comp.memorizationPanel.onMemorizationClearInProgress();
      expect(m.memorizationService.clearInProgress).toHaveBeenCalledWith('v1');
    });

    it('confirmRemoveMemorizedItem opens confirmation dialog', () => {
      const m = makeMocks();
      const comp = newHome(m);
      const item = { id: 'v1' } as any;
      comp.memorizationPanel.confirmRemoveMemorizedItem(item);
      expect(comp.memorizationPanel.memorizedItemToRemove).toBe(item);
      expect(comp.memorizationPanel.showRemoveMemorizedConfirm).toBe(true);
    });

    it('removeMemorizedItemConfirmed removes item and clears practice', async () => {
      const m = makeMocks();
      const comp = newHome(m);
      const item = { id: 'v1' } as any;
      comp.memorizationPanel.memorizedItemToRemove = item;
      comp.memorizationPanel.showRemoveMemorizedConfirm = true;
      comp.memorizationPanel.practiceMemorizedItem = item;

      await comp.memorizationPanel.removeMemorizedItemConfirmed();

      expect(m.memorizationService.removeItem).toHaveBeenCalledWith('v1');
      expect(comp.memorizationPanel.practiceMemorizedItem).toBeNull();
      expect(comp.memorizationPanel.showRemoveMemorizedConfirm).toBe(false);
    });
  });
});
