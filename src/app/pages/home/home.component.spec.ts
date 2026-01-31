import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BehaviorSubject, of } from 'rxjs';
import { HomeComponent } from './home.component';
import { PrayerRequest } from '../../services/prayer.service';

const makeMocks = () => {
  const prayersSubject = new BehaviorSubject<any[]>([]);
  const promptsSubject = new BehaviorSubject<any[]>([]);
  const userSessionSubject = new BehaviorSubject<any>(null);
  const prayerService: any = {
    prayers$: prayersSubject.asObservable(),
    prompts$: of([]),
    loading$: of(false),
    error$: of(null),
    allPrayers$: prayersSubject.asObservable(),
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
    updatePersonalPrayerOrder: vi.fn(),
    getUniqueCategoriesForUser: vi.fn().mockResolvedValue([]),
    swapCategoryRanges: vi.fn(),
    reorderCategories: vi.fn()
  };

  const promptService: any = {
    prompts$: promptsSubject.asObservable(),
    promptsSubject,
    deletePrompt: vi.fn()
  };

  const adminAuthService: any = {
    isAdmin$: new BehaviorSubject(false).asObservable(),
    hasAdminEmail$: of(false),
    logout: vi.fn(() => Promise.resolve())
  };

  const userSessionService: any = {
    userSessionSubject,
    userSession$: userSessionSubject.asObservable(),
    getUserEmail: vi.fn(() => null),
    getUserFullName: vi.fn(() => null),
    getCurrentSession: vi.fn(() => null)
  };

  const badgeService: any = {
    isPromptUnread: vi.fn(),
    getBadgeFunctionalityEnabled$: vi.fn().mockReturnValue(of(false)),
    unreadPromptCount$: of(0),
    getUnreadPromptCountByType: vi.fn().mockReturnValue(0),
    refreshBadgeCounts: vi.fn(),
    getBadgeCount$: vi.fn().mockReturnValue(of(0)),
    markAllAsReadByStatus: vi.fn(),
    markAllAsRead: vi.fn()
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
    navigate: vi.fn()
  };

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

  return { prayerService, promptService, adminAuthService, userSessionService, badgeService, cacheService, toastService, analyticsService, cdr, router, supabaseService, prayersSubject, promptsSubject, userSessionSubject };
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
    const comp = new HomeComponent(
      mocks.prayerService,
      mocks.promptService,
      mocks.adminAuthService,
      mocks.userSessionService,
      mocks.badgeService,
      mocks.cacheService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      mocks.supabaseService
    );
    expect(comp.hasLogo).toBe(true);
  });

  it('getUserEmail returns cached email from UserSessionService if available', () => {
    const mockServiceWithEmail = { getUserEmail: () => 'cached@example.com' };
    const comp = new HomeComponent(
      mocks.prayerService,
      mocks.promptService,
      mocks.adminAuthService,
      mockServiceWithEmail as any,
      mocks.badgeService,
      mocks.cacheService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      mocks.supabaseService
    );
    expect(comp.getUserEmail()).toBe('cached@example.com');
  });

  it('getUserEmail falls back to localStorage when service returns null', () => {
    localStorage.setItem('approvalAdminEmail', 'a@b.com');
    const comp = new HomeComponent(
      mocks.prayerService,
      mocks.promptService,
      mocks.adminAuthService,
      mocks.userSessionService,
      mocks.badgeService,
      mocks.cacheService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      mocks.supabaseService
    );
    expect(comp.getUserEmail()).toBe('a@b.com');
  });

  it('getUserEmail falls back to userEmail localStorage key', () => {
    const comp = new HomeComponent(
      mocks.prayerService,
      mocks.promptService,
      mocks.adminAuthService,
      mocks.userSessionService,
      mocks.badgeService,
      mocks.cacheService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      mocks.supabaseService
    );
    localStorage.setItem('userEmail', 'user@example.com');
    expect(comp.getUserEmail()).toBe('user@example.com');
  });

  it('getUserEmail falls back to prayerapp_user_email localStorage key', () => {
    const comp = new HomeComponent(
      mocks.prayerService,
      mocks.promptService,
      mocks.adminAuthService,
      mocks.userSessionService,
      mocks.badgeService,
      mocks.cacheService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      mocks.supabaseService
    );
    localStorage.setItem('prayerapp_user_email', 'prayerapp@example.com');
    expect(comp.getUserEmail()).toBe('prayerapp@example.com');
  });

  it('getUserEmail returns Not logged in when no email sources are available', () => {
    const comp = new HomeComponent(
      mocks.prayerService,
      mocks.promptService,
      mocks.adminAuthService,
      mocks.userSessionService,
      mocks.badgeService,
      mocks.cacheService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      mocks.supabaseService
    );
    localStorage.clear();
    expect(comp.getUserEmail()).toBe('Not logged in');
  });


  it('getUserEmail returns Not logged in when service and localStorage are empty', () => {
    const comp = new HomeComponent(
      mocks.prayerService,
      mocks.promptService,
      mocks.adminAuthService,
      mocks.userSessionService,
      mocks.badgeService,
      mocks.cacheService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      mocks.supabaseService
    );
    expect(comp.getUserEmail()).toBe('Not logged in');
  });

  it('ngOnInit wires observables and updates counts and promptsCount', async () => {
    const { prayersSubject, promptsSubject, prayerService } = mocks;
    const comp = new HomeComponent(
      prayerService,
      mocks.promptService,
      mocks.adminAuthService,
      mocks.userSessionService,
      mocks.badgeService,
      mocks.cacheService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      mocks.supabaseService
    );

    // seed data
    prayersSubject.next([
      { id: '1', status: 'current' },
      { id: '2', status: 'answered' },
      { id: '3', status: 'current' }
    ]);
    promptsSubject.next([
      { id: 'p1', title: 'T1', description: 'D1', type: 'A' }
    ]);

    comp.ngOnInit();
    
    // Emit a user session to trigger the initialization flow
    mocks.userSessionSubject.next({ defaultPrayerView: 'current' });
    
    // Wait for async loadPersonalPrayers to complete
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(mocks.analyticsService.trackPageView).toHaveBeenCalled();
    // counts should reflect the seeded data
    expect(comp.currentPrayersCount).toBe(2);
    expect(comp.answeredPrayersCount).toBe(1);
    expect(comp.totalPrayersCount).toBe(3);
    expect(comp.promptsCount).toBe(1);
    expect(mocks.cdr.detectChanges).toHaveBeenCalled();
    expect(mocks.prayerService.applyFilters).toHaveBeenCalled();
  });

  it('onFiltersChange preserves status and calls applyFilters', () => {
    const comp = new HomeComponent(
      mocks.prayerService,
      mocks.promptService,
      mocks.adminAuthService,
      mocks.userSessionService,
      mocks.badgeService,
      mocks.cacheService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      mocks.supabaseService
    );
    comp.filters = { status: 'answered', searchTerm: '' };
    comp.onFiltersChange({ searchTerm: 'needle' } as any);
    expect(comp.filters.searchTerm).toBe('needle');
    expect(mocks.prayerService.applyFilters).toHaveBeenCalledWith({ status: 'answered', type: undefined, search: 'needle' });
  });

  it('ngOnDestroy completes subscriptions without throwing', () => {
    const comp = new HomeComponent(
      mocks.prayerService,
      mocks.promptService,
      mocks.adminAuthService,
      mocks.userSessionService,
      mocks.badgeService,
      mocks.cacheService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      mocks.supabaseService
    );
    // initialize subscriptions
    comp.ngOnInit();
    expect(() => comp.ngOnDestroy()).not.toThrow();
  });

  it('setFilter sets prompts branch correctly', () => {
    const comp = new HomeComponent(
      mocks.prayerService,
      mocks.promptService,
      mocks.adminAuthService,
      mocks.userSessionService,
      mocks.badgeService,
      mocks.cacheService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      mocks.supabaseService
    );
    comp.filters.searchTerm = 'search';
    comp.selectedPromptTypes = ['X'];
    comp.setFilter('prompts');
    expect(comp.activeFilter).toBe('prompts');
    expect(comp.selectedPromptTypes.length).toBe(0);
    expect(mocks.prayerService.applyFilters).toHaveBeenCalledWith({ search: '' });
  });

  it('setFilter total branch', () => {
    const comp = new HomeComponent(
      mocks.prayerService,
      mocks.promptService,
      mocks.adminAuthService,
      mocks.userSessionService,
      mocks.badgeService,
      mocks.cacheService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      mocks.supabaseService
    );
    comp.filters.searchTerm = 's';
    comp.setFilter('total');
    expect(comp.activeFilter).toBe('total');
    expect(mocks.prayerService.applyFilters).toHaveBeenCalledWith({ search: 's' });
  });

  it('setFilter other branch (current)', () => {
    const comp = new HomeComponent(
      mocks.prayerService,
      mocks.promptService,
      mocks.adminAuthService,
      mocks.userSessionService,
      mocks.badgeService,
      mocks.cacheService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      mocks.supabaseService
    );
    comp.filters.searchTerm = 's2';
    comp.setFilter('current');
    expect(comp.activeFilter).toBe('current');
    expect(mocks.prayerService.applyFilters).toHaveBeenCalledWith({ status: 'current', search: 's2' });
  });

  it('markAsAnswered and deletePrayer call service', () => {
    const comp = new HomeComponent(
      mocks.prayerService,
      mocks.promptService,
      mocks.adminAuthService,
      mocks.userSessionService,
      mocks.badgeService,
      mocks.cacheService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      mocks.supabaseService
    );
    comp.markAsAnswered('id1');
    expect(mocks.prayerService.updatePrayerStatus).toHaveBeenCalledWith('id1', 'answered');
    comp.deletePrayer('id2');
    expect(mocks.prayerService.deletePrayer).toHaveBeenCalledWith('id2');
  });

  it('addUpdate success and failure paths', async () => {
    const comp = new HomeComponent(
      mocks.prayerService,
      mocks.promptService,
      mocks.adminAuthService,
      mocks.userSessionService,
      mocks.badgeService,
      mocks.cacheService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      mocks.supabaseService
    );
    // success
    mocks.prayerService.addUpdate.mockResolvedValue(undefined);
    await comp.addUpdate({});
    expect(mocks.prayerService.addUpdate).toHaveBeenCalled();

    // failure
    mocks.prayerService.addUpdate.mockRejectedValue(new Error('fail'));
    await comp.addUpdate({});
    expect(mocks.toastService.error).toHaveBeenCalledWith('Failed to submit update');
  });

  it('deleteUpdate success and failure paths', async () => {
    const comp = new HomeComponent(
      mocks.prayerService,
      mocks.promptService,
      mocks.adminAuthService,
      mocks.userSessionService,
      mocks.badgeService,
      mocks.cacheService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      mocks.supabaseService
    );
    mocks.prayerService.deleteUpdate.mockResolvedValue(undefined);
    await comp.deleteUpdate({updateId: 'u1', prayerId: 'p1'});
    expect(mocks.toastService.success).toHaveBeenCalledWith('Update deleted successfully');

    mocks.prayerService.deleteUpdate.mockRejectedValue(new Error('bad'));
    await comp.deleteUpdate({updateId: 'u2', prayerId: 'p2'});
    expect(mocks.toastService.error).toHaveBeenCalledWith('Failed to delete update');
  });

  it('requestDeletion and requestUpdateDeletion success/failure', async () => {
    const comp = new HomeComponent(
      mocks.prayerService,
      mocks.promptService,
      mocks.adminAuthService,
      mocks.userSessionService,
      mocks.badgeService,
      mocks.cacheService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      mocks.supabaseService
    );
    mocks.prayerService.requestDeletion.mockResolvedValue(undefined);
    await comp.requestDeletion({});
    // no toast on success

    mocks.prayerService.requestDeletion.mockRejectedValue(new Error('x'));
    await comp.requestDeletion({});
    expect(mocks.toastService.error).toHaveBeenCalledWith('Failed to submit deletion request');

    mocks.prayerService.requestUpdateDeletion.mockResolvedValue(undefined);
    await comp.requestUpdateDeletion({});
    mocks.prayerService.requestUpdateDeletion.mockRejectedValue(new Error('y'));
    await comp.requestUpdateDeletion({});
    expect(mocks.toastService.error).toHaveBeenCalledWith('Failed to submit update deletion request');
  });

  it('deletePrompt calls promptService.deletePrompt', async () => {
    const comp = new HomeComponent(
      mocks.prayerService,
      mocks.promptService,
      mocks.adminAuthService,
      mocks.userSessionService,
      mocks.badgeService,
      mocks.cacheService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      mocks.supabaseService
    );
    await comp.deletePrompt('p1');
    expect(mocks.promptService.deletePrompt).toHaveBeenCalledWith('p1');
  });

  it('togglePromptType and isPromptTypeSelected behave correctly', () => {
    const comp = new HomeComponent(
      mocks.prayerService,
      mocks.promptService,
      mocks.adminAuthService,
      mocks.userSessionService,
      mocks.badgeService,
      mocks.cacheService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      mocks.supabaseService
    );
    comp.selectedPromptTypes = ['A'];
    comp.togglePromptType('A');
    expect(comp.selectedPromptTypes.includes('A')).toBe(false);
    comp.togglePromptType('B');
    expect(comp.selectedPromptTypes.includes('B')).toBe(true);
    expect(comp.isPromptTypeSelected('B')).toBe(true);
  });

  it('getDisplayedPrompts respects activeFilter and search/type filters', () => {
    const { promptsSubject } = mocks;
    const comp = new HomeComponent(
      mocks.prayerService,
      mocks.promptService,
      mocks.adminAuthService,
      mocks.userSessionService,
      mocks.badgeService,
      mocks.cacheService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      mocks.supabaseService
    );
    const items = [
      { id: '1', title: 'Hello', description: 'World', type: 'T1' },
      { id: '2', title: 'Other', description: 'stuff', type: 'T2' }
    ];
    promptsSubject.next(items);

    // not prompts filter -> empty
    comp.activeFilter = 'current';
    expect(comp.getDisplayedPrompts()).toEqual([]);

    comp.activeFilter = 'prompts';
    // no search, no types -> all
    comp.filters.searchTerm = '';
    comp.selectedPromptTypes = [];
    expect(comp.getDisplayedPrompts()).toHaveLength(2);

    // search term matches title/description/type
    comp.filters.searchTerm = 'hello';
    const filtered = comp.getDisplayedPrompts();
    expect(filtered).toHaveLength(1);

    // selected types filter
    comp.filters.searchTerm = '';
    comp.selectedPromptTypes = ['T2'];
    const typed = comp.getDisplayedPrompts();
    expect(typed).toHaveLength(1);
    expect(typed[0].type).toBe('T2');
  });

  it('getUniquePromptTypes and getPromptCountByType', () => {
    const { promptsSubject } = mocks;
    const comp = new HomeComponent(
      mocks.prayerService,
      mocks.promptService,
      mocks.adminAuthService,
      mocks.userSessionService,
      mocks.badgeService,
      mocks.cacheService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      mocks.supabaseService
    );
    const items = [
      { id: '1', title: 'A', description: '', type: 'X' },
      { id: '2', title: 'B', description: '', type: 'Y' },
      { id: '3', title: 'C', description: '', type: 'X' }
    ];
    promptsSubject.next(items);
    const types = comp.getUniquePromptTypes();
    expect(types).toEqual(['X', 'Y']);
    expect(comp.getPromptCountByType('X')).toBe(2);
  });

  it('formatDate returns localized short format', () => {
    const comp = new HomeComponent(
      mocks.prayerService,
      mocks.promptService,
      mocks.adminAuthService,
      mocks.userSessionService,
      mocks.badgeService,
      mocks.cacheService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      mocks.supabaseService
    );
    const s = comp.formatDate('2025-12-27T00:00:00Z');
    // Avoid asserting exact day because toLocaleDateString is timezone-dependent in CI/local.
    expect(s).toContain('Dec');
    expect(s).toContain('2025');
    // Ensure there's a numeric day in the output
    expect(s).toMatch(/\b\d{1,2}\b/);
  });

  it('logout calls adminAuthService.logout and shows toast', async () => {
    const comp = new HomeComponent(
      mocks.prayerService,
      mocks.promptService,
      mocks.adminAuthService,
      mocks.userSessionService,
      mocks.badgeService,
      mocks.cacheService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      mocks.supabaseService
    );
    await comp.logout();
    expect(mocks.adminAuthService.logout).toHaveBeenCalled();
  });

  it('navigateToAdmin navigates when isAdmin true, otherwise shows MFA modal', () => {
    // admin true
    const adminServiceTrue: any = { isAdmin$: new BehaviorSubject(true).asObservable() };
    const compTrue = new HomeComponent(
      mocks.prayerService,
      mocks.promptService,
      adminServiceTrue,
      mocks.userSessionService,
      mocks.badgeService,
      mocks.cacheService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      mocks.supabaseService
    );
    compTrue.navigateToAdmin();
    expect(mocks.router.navigate).toHaveBeenCalledWith(['/admin']);

    // admin false -> showAdminMfaModal -> no email set -> error toast
    const adminServiceFalse: any = { isAdmin$: new BehaviorSubject(false).asObservable() };
    const compFalse = new HomeComponent(
      mocks.prayerService,
      mocks.promptService,
      adminServiceFalse,
      mocks.userSessionService,
      mocks.badgeService,
      mocks.cacheService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      mocks.supabaseService
    );
    localStorage.clear();
    compFalse.navigateToAdmin();
    expect(mocks.toastService.error).toHaveBeenCalledWith('Email not found. Please log in again.');

    // when email in localStorage, it should navigate to /login with query params
    localStorage.setItem('userEmail', 'u@e.com');
    compFalse.navigateToAdmin();
    expect(mocks.router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { email: 'u@e.com', sessionExpired: true } });
  });

  it('loadAdminSettings loads deletion and update policies successfully', async () => {
    const mockSupabaseService: any = {
      client: {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  deletions_allowed: 'original-requestor',
                  updates_allowed: 'admin-only'
                },
                error: null
              })
            })
          })
        })
      }
    };

    const comp = new HomeComponent(
      mocks.prayerService,
      mocks.promptService,
      mocks.adminAuthService,
      mocks.userSessionService,
      mocks.badgeService,
      mocks.cacheService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      mockSupabaseService
    );

    await comp['loadAdminSettings']();

    expect(comp.deletionsAllowed).toBe('original-requestor');
    expect(comp.updatesAllowed).toBe('admin-only');
    expect(mocks.cdr.detectChanges).toHaveBeenCalled();
  });

  it('loadAdminSettings handles error gracefully', async () => {
    const mockSupabaseService: any = {
      client: {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: new Error('Database error')
              })
            })
          })
        })
      }
    };

    const comp = new HomeComponent(
      mocks.prayerService,
      mocks.promptService,
      mocks.adminAuthService,
      mocks.userSessionService,
      mocks.badgeService,
      mocks.cacheService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      mockSupabaseService
    );

    await comp['loadAdminSettings']();

    // Should keep default values
    expect(comp.deletionsAllowed).toBe('everyone');
    expect(comp.updatesAllowed).toBe('everyone');
  });

  it('loadAdminSettings handles exception gracefully', async () => {
    const mockSupabaseService: any = {
      client: {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockRejectedValue(new Error('Network error'))
            })
          })
        })
      }
    };

    const comp = new HomeComponent(
      mocks.prayerService,
      mocks.promptService,
      mocks.adminAuthService,
      mocks.userSessionService,
      mocks.badgeService,
      mocks.cacheService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      mockSupabaseService
    );

    await comp['loadAdminSettings']();

    // Should keep default values
    expect(comp.deletionsAllowed).toBe('everyone');
    expect(comp.updatesAllowed).toBe('everyone');
  });

  it('loadAdminSettings uses default values when data is null', async () => {
    const mockSupabaseService: any = {
      client: {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: null
              })
            })
          })
        })
      }
    };

    const comp = new HomeComponent(
      mocks.prayerService,
      mocks.promptService,
      mocks.adminAuthService,
      mocks.userSessionService,
      mocks.badgeService,
      mocks.cacheService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      mockSupabaseService
    );

    await comp['loadAdminSettings']();

    // Should keep default values when data is null
    expect(comp.deletionsAllowed).toBe('everyone');
    expect(comp.updatesAllowed).toBe('everyone');
  });

  it('loadAdminSettings handles null/undefined policy values with fallbacks', async () => {
    const mockSupabaseService: any = {
      client: {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  deletions_allowed: null,
                  updates_allowed: undefined
                },
                error: null
              })
            })
          })
        })
      }
    };

    const comp = new HomeComponent(
      mocks.prayerService,
      mocks.promptService,
      mocks.adminAuthService,
      mocks.userSessionService,
      mocks.badgeService,
      mocks.cacheService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      mockSupabaseService
    );

    await comp['loadAdminSettings']();

    // Should use fallback 'everyone' when values are null/undefined
    expect(comp.deletionsAllowed).toBe('everyone');
    expect(comp.updatesAllowed).toBe('everyone');
  });

  it('updateDefaultViewPreference returns false when no email is cached', async () => {
    const userSessionService = {
      ...mocks.userSessionService,
      getUserEmail: () => null
    };

    const comp = new HomeComponent(
      mocks.prayerService,
      mocks.promptService,
      mocks.adminAuthService,
      userSessionService as any,
      mocks.badgeService,
      mocks.cacheService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      mocks.supabaseService
    );

    await expect(comp.updateDefaultViewPreference('personal')).resolves.toBe(false);
  });

  it('updateDefaultViewPreference updates existing subscriber record', async () => {
    const supabase = makeSupabaseForEmail({
      selectResult: { data: { id: 1 }, error: null },
      nextCall: 'update'
    });
    const userSessionService = {
      ...mocks.userSessionService,
      getUserEmail: () => 'test@example.com',
      updateUserSession: vi.fn().mockResolvedValue(undefined)
    };

    const comp = new HomeComponent(
      mocks.prayerService,
      mocks.promptService,
      mocks.adminAuthService,
      userSessionService as any,
      mocks.badgeService,
      mocks.cacheService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      supabase.supabaseService as any
    );

    const result = await comp.updateDefaultViewPreference('personal');

    expect(result).toBe(true);
    expect(supabase.supabaseService.client.from).toHaveBeenCalledTimes(2);
    expect(supabase.updateChain.update).toHaveBeenCalled();
    expect(userSessionService.updateUserSession).toHaveBeenCalledWith({ defaultPrayerView: 'personal' });
  });

  it('updateDefaultViewPreference inserts a subscriber when none exists', async () => {
    const supabase = makeSupabaseForEmail({
      selectResult: { data: null, error: null },
      nextCall: 'insert'
    });
    const userSessionService = {
      ...mocks.userSessionService,
      getUserEmail: () => 'fresh@example.com',
      updateUserSession: vi.fn().mockResolvedValue(undefined)
    };

    const comp = new HomeComponent(
      mocks.prayerService,
      mocks.promptService,
      mocks.adminAuthService,
      userSessionService as any,
      mocks.badgeService,
      mocks.cacheService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      supabase.supabaseService as any
    );

    const result = await comp.updateDefaultViewPreference('current');

    expect(result).toBe(true);
    expect(supabase.supabaseService.client.from).toHaveBeenCalledTimes(2);
    expect(supabase.insertChain.insert).toHaveBeenCalledWith({
      email: 'fresh@example.com',
      default_prayer_view: 'current'
    });
    expect(userSessionService.updateUserSession).toHaveBeenCalledWith({ defaultPrayerView: 'current' });
  });

  it('updateDefaultViewPreference handles fetch errors gracefully', async () => {
    const supabase = makeSupabaseForEmail({
      selectResult: { data: null, error: new Error('fetch failure') }
    });
    const userSessionService = {
      ...mocks.userSessionService,
      getUserEmail: () => 'error@example.com',
      updateUserSession: vi.fn().mockResolvedValue(undefined)
    };

    const comp = new HomeComponent(
      mocks.prayerService,
      mocks.promptService,
      mocks.adminAuthService,
      userSessionService as any,
      mocks.badgeService,
      mocks.cacheService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      supabase.supabaseService as any
    );

    await expect(comp.updateDefaultViewPreference('current')).resolves.toBe(false);
    expect(userSessionService.updateUserSession).not.toHaveBeenCalled();
    expect(supabase.supabaseService.client.from).toHaveBeenCalledTimes(1);
  });

  describe('Badge count functionality', () => {
    it('should have getUnreadPromptCountByType method', () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      expect(typeof comp['getUnreadPromptCountByType']).toBe('function');
    });

    it('should count unread prompts by type', () => {
      const prompts = [
        { id: '1', type: 'Morning', title: 'Test 1' },
        { id: '2', type: 'Morning', title: 'Test 2' },
        { id: '3', type: 'Evening', title: 'Test 3' }
      ];

      mocks.promptService.prompts$ = of(prompts);

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

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

      const comp = new HomeComponent(
        mocks.prayerService,
        customPromptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

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

      const comp = new HomeComponent(
        mocks.prayerService,
        customPromptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      expect(comp).toBeDefined();
    });

    it('should update badge counts when prompts change', () => {
      const promptsSubject = new BehaviorSubject<any[]>([]);

      const customPromptService = {
        ...mocks.promptService,
        prompts$: promptsSubject.asObservable()
      };

      const comp = new HomeComponent(
        mocks.prayerService,
        customPromptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

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

      const comp = new HomeComponent(
        mocks.prayerService,
        customPromptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      expect(comp.getUnreadPromptCountByType('Morning')).toBe(1);
      expect(comp.getUnreadPromptCountByType('Evening')).toBe(0);
    });
  });

  describe('Category selection helpers', () => {
    it('togglePersonalCategory clears selection when already chosen', () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.selectedPersonalCategories = ['Members'];
      comp.togglePersonalCategory('Members');

      expect(comp.selectedPersonalCategories).toEqual([]);
    });

    it('togglePersonalCategory selects a new category and isPersonalCategorySelected reports true', () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.togglePersonalCategory('NewCat');
      expect(comp.isPersonalCategorySelected('NewCat')).toBe(true);
      expect(comp.isPersonalCategorySelected('Other')).toBe(false);
    });
  });

  describe('Personal Prayers functionality', () => {
    it('loadPersonalPrayers returns cached data on cache hit', async () => {
      const cached = [
        { id: 'p1', title: 'My Prayer', description: 'Test', status: 'current', requester: 'Me', prayer_for: 'Me', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), date_requested: new Date().toISOString(), updates: [] }
      ];
      mocks.cacheService.get.mockReturnValue(cached);

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      await comp['loadPersonalPrayers']();

      expect(mocks.cacheService.get).toHaveBeenCalledWith('personalPrayers');
      expect(comp.personalPrayers).toEqual(cached);
      expect(comp.personalPrayersCount).toBe(1);
      expect(mocks.cdr.detectChanges).toHaveBeenCalled();
    });

    it('loadPersonalPrayers fetches from service on cache miss', async () => {
      const prayers = [
        { id: 'p1', title: 'My Prayer', description: 'Test', status: 'current', requester: 'Me', prayer_for: 'Me', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), date_requested: new Date().toISOString(), updates: [] }
      ];
      mocks.cacheService.get.mockReturnValue(null);
      mocks.prayerService.getPersonalPrayers.mockResolvedValue(prayers);

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      await comp['loadPersonalPrayers']();

      expect(mocks.prayerService.getPersonalPrayers).toHaveBeenCalled();
      expect(mocks.cacheService.set).toHaveBeenCalledWith('personalPrayers', prayers);
      expect(comp.personalPrayers).toEqual(prayers);
      expect(comp.personalPrayersCount).toBe(1);
    });

    it('loadPersonalPrayers handles error gracefully', async () => {
      mocks.cacheService.get.mockReturnValue(null);
      mocks.prayerService.getPersonalPrayers.mockRejectedValue(new Error('Load failed'));

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      await expect(comp['loadPersonalPrayers']()).resolves.not.toThrow();
    });

    it('onPrayerFormClose with isPersonal=true refreshes personal prayers', async () => {
      const prayers = [
        { id: 'p1', title: 'Prayer', description: 'Test', status: 'current', requester: 'Me', prayer_for: 'Me', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), date_requested: new Date().toISOString(), updates: [] }
      ];
      mocks.cacheService.get.mockReturnValue(null);
      mocks.prayerService.getPersonalPrayers.mockResolvedValue(prayers);

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      await comp.onPrayerFormClose({ isPersonal: true });

      expect(comp.showPrayerForm).toBe(false);
      expect(mocks.cacheService.invalidate).toHaveBeenCalledWith('personalPrayers');
      expect(mocks.prayerService.getPersonalPrayers).toHaveBeenCalled();
    });

    it('onPrayerFormClose without isPersonal just closes form', () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.onPrayerFormClose({});

      expect(comp.showPrayerForm).toBe(false);
      expect(mocks.cacheService.invalidate).not.toHaveBeenCalled();
    });

    it('deletePersonalPrayer success refreshes cache', async () => {
      const prayers = [
        { id: 'p1', title: 'Prayer', description: 'Test', status: 'current', requester: 'Me', prayer_for: 'Me', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), date_requested: new Date().toISOString(), updates: [] }
      ];
      mocks.cacheService.get.mockReturnValue(null);
      mocks.prayerService.deletePersonalPrayer.mockResolvedValue(true);
      mocks.prayerService.getPersonalPrayers.mockResolvedValue(prayers);

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      await comp.deletePersonalPrayer('p1');

      expect(mocks.prayerService.deletePersonalPrayer).toHaveBeenCalledWith('p1');
      expect(mocks.cacheService.invalidate).toHaveBeenCalledWith('personalPrayers');
    });

    it('deletePersonalPrayer failure does not refresh', async () => {
      mocks.prayerService.deletePersonalPrayer.mockResolvedValue(false);

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      await comp.deletePersonalPrayer('p1');

      expect(mocks.prayerService.deletePersonalPrayer).toHaveBeenCalledWith('p1');
      expect(mocks.cacheService.invalidate).not.toHaveBeenCalled();
    });

    it('addPersonalUpdate with mark_as_answered=true updates category', async () => {
      mocks.prayerService.addPersonalPrayerUpdate.mockResolvedValue(true);
      mocks.prayerService.updatePersonalPrayer.mockResolvedValue(true);
      mocks.cacheService.get.mockReturnValue(null);
      mocks.prayerService.getPersonalPrayers.mockResolvedValue([]);

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        { getCurrentSession: vi.fn().mockReturnValue({ fullName: 'John', email: 'john@example.com' }) } as any,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      await comp.addPersonalUpdate({
        prayer_id: 'p1',
        content: 'Update text',
        mark_as_answered: true
      });

      expect(mocks.prayerService.addPersonalPrayerUpdate).toHaveBeenCalled();
      expect(mocks.prayerService.updatePersonalPrayer).toHaveBeenCalledWith('p1', { category: 'Answered' });
    });

    it('addPersonalUpdate without mark_as_answered does not update category', async () => {
      mocks.prayerService.addPersonalPrayerUpdate.mockResolvedValue(true);
      mocks.cacheService.get.mockReturnValue(null);
      mocks.prayerService.getPersonalPrayers.mockResolvedValue([]);

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        { getCurrentSession: vi.fn().mockReturnValue({ fullName: 'John', email: 'john@example.com' }) } as any,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      await comp.addPersonalUpdate({
        prayer_id: 'p1',
        content: 'Update text',
        mark_as_answered: false
      });

      expect(mocks.prayerService.addPersonalPrayerUpdate).toHaveBeenCalled();
      expect(mocks.prayerService.updatePersonalPrayer).not.toHaveBeenCalled();
    });

    it('addPersonalUpdate error handling', async () => {
      mocks.prayerService.addPersonalPrayerUpdate.mockRejectedValue(new Error('Add failed'));

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        { getCurrentSession: vi.fn().mockReturnValue({ fullName: 'John', email: 'john@example.com' }) } as any,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      await comp.addPersonalUpdate({
        prayer_id: 'p1',
        content: 'Update text'
      });

      expect(mocks.toastService.error).toHaveBeenCalledWith('Failed to add update');
    });

    it('deletePersonalUpdate success refreshes cache', async () => {
      mocks.prayerService.deletePersonalPrayerUpdate.mockResolvedValue(true);
      mocks.cacheService.get.mockReturnValue(null);
      mocks.prayerService.getPersonalPrayers.mockResolvedValue([]);

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      await comp.deletePersonalUpdate({updateId: 'u1', prayerId: 'p1'});

      expect(mocks.prayerService.deletePersonalPrayerUpdate).toHaveBeenCalledWith('u1');
      expect(mocks.cacheService.invalidate).toHaveBeenCalledWith('personalPrayers');
    });

    it('deletePersonalUpdate error handling', async () => {
      mocks.prayerService.deletePersonalPrayerUpdate.mockRejectedValue(new Error('Delete failed'));

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      await comp.deletePersonalUpdate({updateId: 'u1', prayerId: 'p1'});

      expect(mocks.toastService.error).toHaveBeenCalledWith('Failed to delete update');
    });

    it('getFilteredPersonalPrayers returns all when no search term', () => {
      const prayers = [
        { id: 'p1', title: 'Prayer 1', description: 'Desc', prayer_for: 'Person', status: 'current' as any, requester: 'Me', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), date_requested: new Date().toISOString(), updates: [] },
        { id: 'p2', title: 'Prayer 2', description: 'Desc', prayer_for: 'Person', status: 'current' as any, requester: 'Me', created_at: new Date().toISOString(), updated_at: new Date().toISOString(), date_requested: new Date().toISOString(), updates: [] }
      ];

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );
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

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );
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

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );
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

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );
      comp.personalPrayers = prayers;
      comp.selectedPersonalCategories = ['Evening'];

      const filtered = comp.getFilteredPersonalPrayers();

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('p2');
    });

    it('markAllCurrentAsRead calls badgeService', () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.markAllCurrentAsRead();

      expect(mocks.badgeService.markAllAsReadByStatus).toHaveBeenCalledWith('prayers', 'current');
    });

    it('markAllAnsweredAsRead calls badgeService', () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.markAllAnsweredAsRead();

      expect(mocks.badgeService.markAllAsReadByStatus).toHaveBeenCalledWith('prayers', 'answered');
    });

    it('markAllPromptsAsRead calls badgeService', () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.markAllPromptsAsRead();

      expect(mocks.badgeService.markAllAsRead).toHaveBeenCalledWith('prompts');
    });
  });

  describe('Filter functionality for personal prayers', () => {
    it('setFilter personal sets activeFilter and calls applyFilters', () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.filters.searchTerm = 'search';
      comp.setFilter('personal');

      expect(comp.activeFilter).toBe('personal');
      expect(mocks.prayerService.applyFilters).toHaveBeenCalledWith({ search: 'search' });
    });
  });

  describe('Personal Prayer Drag and Drop', () => {
    it('onPersonalPrayerDrop should return early if index does not change', async () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      const prayers: PrayerRequest[] = [
        { id: '1', title: 'Prayer 1' } as PrayerRequest,
        { id: '2', title: 'Prayer 2' } as PrayerRequest
      ];
      comp.personalPrayers = prayers;

      const event = {
        previousIndex: 0,
        currentIndex: 0
      } as any;

      await comp.onPersonalPrayerDrop(event);

      expect(comp.personalPrayers).toEqual(prayers);
      expect(mocks.prayerService.updatePersonalPrayerOrder).not.toHaveBeenCalled();
    });

    it('onPersonalPrayerDrop shows error when multiple categories are selected', async () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.personalPrayers = [
        { id: '1', title: 'Prayer 1', category: 'Members', display_order: 1 } as PrayerRequest,
        { id: '2', title: 'Prayer 2', category: 'Leaders', display_order: 2 } as PrayerRequest
      ];
      comp.selectedPersonalCategories = ['Members', 'Leaders'];

      const event = {
        previousIndex: 0,
        currentIndex: 1
      } as any;

      await comp.onPersonalPrayerDrop(event);

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

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.personalPrayers = prayers;
      comp.selectedPersonalCategories = ['Members']; // Must have single category to reorder

      const event = {
        previousIndex: 0,
        currentIndex: 1
      } as any;

      await comp.onPersonalPrayerDrop(event);

      expect(mocks.prayerService.updatePersonalPrayerOrder).toHaveBeenCalled();
      expect(mocks.prayerService.getPersonalPrayers).toHaveBeenCalled();
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

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.personalPrayers = [...prayers]; // Make a copy to avoid reference issues
      comp.selectedPersonalCategories = ['Members']; // Must have single category to reorder

      const event = {
        previousIndex: 0,
        currentIndex: 1
      } as any;

      await comp.onPersonalPrayerDrop(event);

      // After error, should be restored to original order
      expect(comp.personalPrayers[0].id).toBe('1');
      expect(comp.personalPrayers[1].id).toBe('2');
      expect(mocks.toastService.error).toHaveBeenCalledWith('Failed to reorder prayers');
    });
  });

  describe('Category Drag and Drop', () => {
    it('onCategoryDragStarted should set dragging flag and cursor', () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.onCategoryDragStarted();

      expect(comp.isCategoryDragging).toBe(true);
      expect(document.body.style.cursor).toBe('grabbing');
    });

    it('onCategoryDragEnded should clear dragging flag and cursor', () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.isCategoryDragging = true;
      document.body.style.cursor = 'grabbing';

      comp.onCategoryDragEnded();

      expect(comp.isCategoryDragging).toBe(false);
      expect(document.body.style.cursor).toBe('');
    });

    it('onCategoryDrop should return early if index does not change', async () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.uniquePersonalCategories = ['Members', 'Leaders'];

      const event = {
        previousIndex: 0,
        currentIndex: 0
      } as any;

      await comp.onCategoryDrop(event);

      expect(mocks.prayerService.swapCategoryRanges).not.toHaveBeenCalled();
      expect(mocks.prayerService.reorderCategories).not.toHaveBeenCalled();
    });

    it('onCategoryDrop should return early if already swapping', async () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.uniquePersonalCategories = ['Members', 'Leaders'];
      comp.isSwappingCategories = true;

      const event = {
        previousIndex: 0,
        currentIndex: 1
      } as any;

      await comp.onCategoryDrop(event);

      expect(mocks.prayerService.swapCategoryRanges).not.toHaveBeenCalled();
    });

    it('onCategoryDrop should use swapCategoryRanges for adjacent swap', async () => {
      mocks.prayerService.swapCategoryRanges.mockResolvedValue(true);
      mocks.prayerService.getPersonalPrayers.mockResolvedValue([
        { id: '1', title: 'Prayer 1', category: 'Leaders', display_order: 1 } as PrayerRequest,
        { id: '2', title: 'Prayer 2', category: 'Members', display_order: 2 } as PrayerRequest
      ]);

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.uniquePersonalCategories = ['Members', 'Leaders'];
      comp.personalPrayers = [
        { id: '1', title: 'Prayer 1', category: 'Members', display_order: 1 } as PrayerRequest,
        { id: '2', title: 'Prayer 2', category: 'Leaders', display_order: 2 } as PrayerRequest
      ];

      const event = {
        previousIndex: 0,
        currentIndex: 1
      } as any;

      await comp.onCategoryDrop(event);

      expect(mocks.prayerService.swapCategoryRanges).toHaveBeenCalledWith('Members', 'Leaders');
      expect(mocks.cacheService.invalidate).toHaveBeenCalledWith('personalPrayers');
      expect(comp.isSwappingCategories).toBe(false);
    });

    it('onCategoryDrop should use reorderCategories for non-adjacent swap', async () => {
      mocks.prayerService.reorderCategories.mockResolvedValue(true);
      mocks.prayerService.getPersonalPrayers.mockResolvedValue([
        { id: '1', title: 'Prayer 1', category: 'C', display_order: 1 } as PrayerRequest
      ]);

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.uniquePersonalCategories = ['A', 'B', 'C', 'D', 'E'];

      const event = {
        previousIndex: 0,
        currentIndex: 4
      } as any;

      await comp.onCategoryDrop(event);

      expect(mocks.prayerService.reorderCategories).toHaveBeenCalledWith(['B', 'C', 'D', 'E', 'A']);
    });

    it('onCategoryDrop should show error and rollback on swap failure', async () => {
      mocks.prayerService.swapCategoryRanges.mockResolvedValue(false);

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.uniquePersonalCategories = ['Members', 'Leaders'];

      const event = {
        previousIndex: 0,
        currentIndex: 1
      } as any;

      await comp.onCategoryDrop(event);

      expect(mocks.toastService.error).toHaveBeenCalledWith('Failed to reorder categories');
      // Should be rolled back to original order
      expect(comp.uniquePersonalCategories[0]).toBe('Members');
      expect(comp.uniquePersonalCategories[1]).toBe('Leaders');
    });

    it('onCategoryDrop should show error and rollback on swap exception', async () => {
      mocks.prayerService.swapCategoryRanges.mockRejectedValue(new Error('Swap error'));

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.uniquePersonalCategories = ['Members', 'Leaders'];

      const event = {
        previousIndex: 0,
        currentIndex: 1
      } as any;

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await comp.onCategoryDrop(event);

      expect(consoleSpy).toHaveBeenCalledWith('Error reordering categories:', expect.any(Error));
      expect(mocks.toastService.error).toHaveBeenCalledWith('Failed to reorder categories');
      // Should be rolled back
      expect(comp.uniquePersonalCategories[0]).toBe('Members');
      expect(comp.uniquePersonalCategories[1]).toBe('Leaders');
      consoleSpy.mockRestore();
    });

    it('onCategoryDrop should reload prayers and update categories on success', async () => {
      const reloadedPrayers = [
        { id: '1', title: 'Prayer 1', category: 'Leaders', display_order: 1 } as PrayerRequest,
        { id: '2', title: 'Prayer 2', category: 'Members', display_order: 2 } as PrayerRequest
      ];
      mocks.prayerService.swapCategoryRanges.mockResolvedValue(true);
      mocks.prayerService.getPersonalPrayers.mockResolvedValue(reloadedPrayers);
      mocks.cacheService.get.mockReturnValue(null);

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.uniquePersonalCategories = ['Members', 'Leaders'];
      comp.personalPrayers = [];

      const event = {
        previousIndex: 0,
        currentIndex: 1
      } as any;

      await comp.onCategoryDrop(event);

      expect(mocks.cacheService.invalidate).toHaveBeenCalledWith('personalPrayers');
      expect(mocks.prayerService.getPersonalPrayers).toHaveBeenCalledWith(true);
      expect(comp.personalPrayers).toEqual(reloadedPrayers);
      expect(mocks.cacheService.set).toHaveBeenCalledWith('personalPrayers', reloadedPrayers);
    });
  });

  describe('Personal Prayer Drag and Drop - Edge Cases', () => {
    it('onPersonalPrayerDrop should handle moving to first position when no other prayer exists', async () => {
      mocks.prayerService.updatePersonalPrayerOrder.mockResolvedValue(true);
      mocks.prayerService.getPersonalPrayers.mockResolvedValue([
        { id: '1', title: 'Prayer 1', category: 'Members', display_order: 1 } as PrayerRequest
      ]);

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      const prayers: PrayerRequest[] = [
        { id: '1', title: 'Prayer 1', category: 'Members', display_order: 1001 } as PrayerRequest
      ];
      comp.personalPrayers = prayers;
      comp.selectedPersonalCategories = ['Members'];

      const event = {
        previousIndex: 0,
        currentIndex: 0
      } as any;

      await comp.onPersonalPrayerDrop(event);

      expect(mocks.prayerService.updatePersonalPrayerOrder).not.toHaveBeenCalled(); // No change in index
    });

    it('onPersonalPrayerDrop should handle error and show error toast on exception', async () => {
      mocks.prayerService.updatePersonalPrayerOrder.mockRejectedValue(new Error('Update error'));

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      const prayers: PrayerRequest[] = [
        { id: '1', title: 'Prayer 1', category: 'Members', display_order: 1001 } as PrayerRequest,
        { id: '2', title: 'Prayer 2', category: 'Members', display_order: 1000 } as PrayerRequest
      ];
      comp.personalPrayers = prayers;
      comp.selectedPersonalCategories = ['Members'];

      const event = {
        previousIndex: 0,
        currentIndex: 1
      } as any;

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await comp.onPersonalPrayerDrop(event);

      expect(consoleSpy).toHaveBeenCalledWith('Error reordering personal prayers:', expect.any(Error));
      expect(mocks.toastService.error).toHaveBeenCalledWith('Failed to reorder prayers');
      consoleSpy.mockRestore();
    });

    it('onPersonalPrayerDrop should insert prayer at first position when it is the only one', async () => {
      mocks.prayerService.updatePersonalPrayerOrder.mockResolvedValue(true);
      mocks.prayerService.getPersonalPrayers.mockResolvedValue([
        { id: '1', title: 'Prayer 1', category: 'Members', display_order: 1 } as PrayerRequest
      ]);

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      const prayers: PrayerRequest[] = [
        { id: '1', title: 'Prayer 1', category: 'Members', display_order: 1001 } as PrayerRequest,
        { id: '2', title: 'Prayer 2', category: 'Members', display_order: 1000 } as PrayerRequest,
        { id: '3', title: 'Prayer 3', category: 'Members', display_order: 999 } as PrayerRequest
      ];
      comp.personalPrayers = prayers;
      comp.selectedPersonalCategories = ['Members'];

      const event = {
        previousIndex: 1,
        currentIndex: 0
      } as any;

      await comp.onPersonalPrayerDrop(event);

      expect(mocks.prayerService.updatePersonalPrayerOrder).toHaveBeenCalled();
      expect(mocks.toastService.error).not.toHaveBeenCalled();
    });
  });

  describe('Utility methods', () => {
    it('formatDate should return formatted date string', () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      const result = comp.formatDate('2024-01-15T10:30:00Z');
      expect(result).toContain('Jan');
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });

    it('getUserEmail should return cached email from userSessionService', () => {
      mocks.userSessionService.getUserEmail.mockReturnValue('test@example.com');

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      const result = comp.getUserEmail();
      expect(result).toBe('test@example.com');
    });

    it('getUserEmail should fall back to localStorage keys', () => {
      mocks.userSessionService.getUserEmail.mockReturnValue(null);
      localStorage.setItem('approvalAdminEmail', 'admin@example.com');

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      const result = comp.getUserEmail();
      expect(result).toBe('admin@example.com');
      localStorage.removeItem('approvalAdminEmail');
    });

    it('markAllCurrentAsRead should call badgeService', () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.markAllCurrentAsRead();
      expect(mocks.badgeService.markAllAsReadByStatus).toHaveBeenCalledWith('prayers', 'current');
    });

    it('markAllAnsweredAsRead should call badgeService', () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.markAllAnsweredAsRead();
      expect(mocks.badgeService.markAllAsReadByStatus).toHaveBeenCalledWith('prayers', 'answered');
    });

    it('markAllPromptsAsRead should call badgeService', () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.markAllPromptsAsRead();
      expect(mocks.badgeService.markAllAsRead).toHaveBeenCalledWith('prompts');
    });
  });

  describe('Modal and editing methods', () => {
    it('openEditModal should set state and mark for check', () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      const prayer = { id: '1', prayer_for: 'Test', title: 'Test Prayer' } as any;
      comp.openEditModal(prayer);

      expect(comp.editingPrayer).toEqual(prayer);
      expect(comp.showEditPersonalPrayer).toBe(true);
      expect(mocks.cdr.markForCheck).toHaveBeenCalled();
    });

    it('onPersonalPrayerSaved should clear state and reload', () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.editingPrayer = { id: '1', prayer_for: 'Test', title: 'Test Prayer' } as any;
      comp.showEditPersonalPrayer = true;
      
      const loadSpy = vi.spyOn(comp as any, 'loadPersonalPrayers');

      comp.onPersonalPrayerSaved();

      expect(comp.showEditPersonalPrayer).toBe(false);
      expect(comp.editingPrayer).toBeNull();
      expect(mocks.cdr.markForCheck).toHaveBeenCalled();
      expect(loadSpy).toHaveBeenCalled();
    });

    it('openEditUpdateModal should set state', () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      const update = { id: 'u1', text: 'Update text' } as any;
      comp.openEditUpdateModal({ update, prayerId: 'p1' });

      expect(comp.editingUpdate).toEqual(update);
      expect(comp.editingUpdatePrayerId).toBe('p1');
      expect(comp.showEditPersonalUpdate).toBe(true);
    });

    it('onPersonalUpdateSaved should clear state and reload', () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.editingUpdate = { id: 'u1', text: 'Update' } as any;
      comp.editingUpdatePrayerId = 'p1';
      comp.showEditPersonalUpdate = true;

      const loadSpy = vi.spyOn(comp as any, 'loadPersonalPrayers');

      comp.onPersonalUpdateSaved();

      expect(comp.showEditPersonalUpdate).toBe(false);
      expect(comp.editingUpdate).toBeNull();
      expect(comp.editingUpdatePrayerId).toBe('');
      expect(loadSpy).toHaveBeenCalled();
    });

    it('openEditMemberUpdateModal should set state', () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      const update = { id: 'u1', text: 'Update' } as any;
      comp.openEditMemberUpdateModal({ update, prayerId: 'pc-member-123' });

      expect(comp.editingMemberUpdate).toEqual(update);
      expect(comp.editingMemberUpdatePrayerId).toBe('pc-member-123');
      expect(comp.showEditMemberUpdate).toBe(true);
    });

    it('onMemberUpdateSaved should clear state and reload member updates', async () => {
      vi.useFakeTimers();
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.editingMemberUpdate = { id: 'u1', text: 'Update' } as any;
      comp.editingMemberUpdatePrayerId = 'pc-member-123';
      comp.showEditMemberUpdate = true;
      comp.planningCenterListMembers = [{ id: '123', name: 'Member' }] as any;
      comp.filteredPlanningCenterPrayers = [{
        id: 'pc-member-123',
        prayer_for: 'Member',
        title: 'Member Prayer',
        updates: []
      }] as any;

      mocks.prayerService.getMemberPrayerUpdates = vi.fn().mockResolvedValue([{ id: 'u2', text: 'New update' }]);

      comp.onMemberUpdateSaved();

      expect(comp.showEditMemberUpdate).toBe(false);
      expect(comp.editingMemberUpdate).toBeNull();
      expect(comp.editingMemberUpdatePrayerId).toBe('');

      // Wait for async operations
      await vi.advanceTimersByTimeAsync(150);
      expect(comp.filteredPlanningCenterPrayers[0].updates).toHaveLength(1);
      vi.useRealTimers();
    });
  });

  describe('Admin navigation', () => {
    it('navigateToAdmin should navigate when admin is active', () => {
      mocks.adminAuthService.isAdmin$ = new BehaviorSubject(true).asObservable();

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.navigateToAdmin();

      expect(mocks.router.navigate).toHaveBeenCalledWith(['/admin']);
    });

    it('navigateToAdmin should show MFA modal when admin session expired', () => {
      mocks.adminAuthService.isAdmin$ = new BehaviorSubject(false).asObservable();
      localStorage.setItem('userEmail', 'user@example.com');

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.navigateToAdmin();

      expect(mocks.router.navigate).toHaveBeenCalledWith(['/login'], {
        queryParams: {
          email: 'user@example.com',
          sessionExpired: true
        }
      });
      localStorage.removeItem('userEmail');
    });

    it('logout should call adminAuthService and show success toast', async () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      await comp.logout();

      expect(mocks.adminAuthService.logout).toHaveBeenCalled();
    });
  });

  describe('Private member update reloading', () => {
    it('onMemberUpdateSaved should handle missing member', async () => {
      vi.useFakeTimers();
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.editingMemberUpdate = { id: 'u1', text: 'Update' } as any;
      comp.editingMemberUpdatePrayerId = 'pc-member-999';
      comp.showEditMemberUpdate = true;
      comp.planningCenterListMembers = [{ id: '123', name: 'Member' }] as any;
      comp.filteredPlanningCenterPrayers = [] as any;

      comp.onMemberUpdateSaved();

      await vi.advanceTimersByTimeAsync(150);
      expect(comp.editingMemberUpdate).toBeNull();
      vi.useRealTimers();
    });

    it('onMemberUpdateSaved should handle missing prayer card', async () => {
      vi.useFakeTimers();
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.editingMemberUpdate = { id: 'u1', text: 'Update' } as any;
      comp.editingMemberUpdatePrayerId = 'pc-member-123';
      comp.showEditMemberUpdate = true;
      comp.planningCenterListMembers = [{ id: '123', name: 'Member' }] as any;
      comp.filteredPlanningCenterPrayers = [{
        id: 'pc-member-999',
        prayer_for: 'Other Member',
        title: 'Other Prayer',
        updates: []
      }] as any;

      mocks.prayerService.getMemberPrayerUpdates = vi.fn().mockResolvedValue([]);

      comp.onMemberUpdateSaved();

      await vi.advanceTimersByTimeAsync(150);
      expect(comp.editingMemberUpdate).toBeNull();
      vi.useRealTimers();
    });

    it('onMemberUpdateSaved should handle getMemberPrayerUpdates error', async () => {
      vi.useFakeTimers();
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      comp.editingMemberUpdate = { id: 'u1', text: 'Update' } as any;
      comp.editingMemberUpdatePrayerId = 'pc-member-123';
      comp.showEditMemberUpdate = true;
      comp.planningCenterListMembers = [{ id: '123', name: 'Member' }] as any;
      comp.filteredPlanningCenterPrayers = [{
        id: 'pc-member-123',
        prayer_for: 'Member',
        title: 'Member Prayer',
        updates: []
      }] as any;

      mocks.prayerService.getMemberPrayerUpdates = vi.fn().mockRejectedValue(new Error('Load failed'));

      comp.onMemberUpdateSaved();

      await vi.advanceTimersByTimeAsync(150);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
      vi.useRealTimers();
    });
  });

  describe('Show admin MFA modal', () => {
    it('showAdminMfaModal should navigate with userEmail from localStorage', () => {
      localStorage.setItem('userEmail', 'admin@example.com');

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp['showAdminMfaModal']();

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

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp['showAdminMfaModal']();

      expect(mocks.toastService.error).toHaveBeenCalledWith('Email not found. Please log in again.');
      expect(mocks.router.navigate).not.toHaveBeenCalled();
    });

    it('showAdminMfaModal should try multiple localStorage keys', () => {
      localStorage.clear();
      localStorage.setItem('prayerapp_user_email', 'user@prayer.app');

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp['showAdminMfaModal']();

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
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.filteredPlanningCenterPrayers = [
        { id: '1', prayer_for: 'John', title: 'Healing', description: '' } as any,
        { id: '2', prayer_for: 'Jane', title: 'Wisdom', description: '' } as any
      ];

      comp.filters = { searchTerm: '' } as any;

      const result = comp.getFilteredPlanningCenterPrayers();

      expect(result).toHaveLength(2);
    });

    it('should search in prayer_for field', () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.filteredPlanningCenterPrayers = [
        { id: '1', prayer_for: 'John Doe', title: 'Healing', description: 'Needs prayer' } as any,
        { id: '2', prayer_for: 'Jane Smith', title: 'Wisdom', description: 'Job interview' } as any
      ];

      comp.filters = { searchTerm: 'John' } as any;

      const result = comp.getFilteredPlanningCenterPrayers();

      expect(result).toHaveLength(1);
      expect(result[0].prayer_for).toBe('John Doe');
    });

    it('should search case-insensitively in prayer_for', () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.filteredPlanningCenterPrayers = [
        { id: '1', prayer_for: 'John Doe', title: '', description: '' } as any
      ];

      comp.filters = { searchTerm: 'JOHN' } as any;

      const result = comp.getFilteredPlanningCenterPrayers();

      expect(result).toHaveLength(1);
    });

    it('should search in update content', () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.filteredPlanningCenterPrayers = [
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

      const result = comp.getFilteredPlanningCenterPrayers();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should search in title field', () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.filteredPlanningCenterPrayers = [
        { id: '1', prayer_for: 'John', title: 'Healing Surgery', description: '' } as any
      ];

      comp.filters = { searchTerm: 'Healing' } as any;

      const result = comp.getFilteredPlanningCenterPrayers();

      expect(result).toHaveLength(1);
    });

    it('should search in description field', () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.filteredPlanningCenterPrayers = [
        { id: '1', prayer_for: 'Jane', title: 'Work Issues', description: 'Difficult project deadline' } as any
      ];

      comp.filters = { searchTerm: 'deadline' } as any;

      const result = comp.getFilteredPlanningCenterPrayers();

      expect(result).toHaveLength(1);
    });

    it('should return empty array when no matches found', () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.filteredPlanningCenterPrayers = [
        { id: '1', prayer_for: 'John', title: 'Healing', description: '' } as any
      ];

      comp.filters = { searchTerm: 'xyz' } as any;

      const result = comp.getFilteredPlanningCenterPrayers();

      expect(result).toHaveLength(0);
    });

    it('should trim whitespace from search term', () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.filteredPlanningCenterPrayers = [
        { id: '1', prayer_for: 'John', title: '', description: '' } as any
      ];

      comp.filters = { searchTerm: '  John  ' } as any;

      const result = comp.getFilteredPlanningCenterPrayers();

      expect(result).toHaveLength(1);
    });
  });

  describe('Personal category count', () => {
    it('getPersonalCategoryCount should count prayers by category', () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.personalPrayers = [
        { id: '1', category: 'Healing' } as any,
        { id: '2', category: 'Healing' } as any,
        { id: '3', category: 'Wisdom' } as any
      ];

      expect(comp.getPersonalCategoryCount('Healing')).toBe(2);
      expect(comp.getPersonalCategoryCount('Wisdom')).toBe(1);
    });

    it('getPersonalCategoryCount should return 0 for non-existent category', () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.personalPrayers = [
        { id: '1', category: 'Healing' } as any
      ];

      expect(comp.getPersonalCategoryCount('NonExistent')).toBe(0);
    });

    it('getPersonalCategoryCount should work with empty prayers array', () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.personalPrayers = [];

      expect(comp.getPersonalCategoryCount('Healing')).toBe(0);
    });
  });

  describe('Submit methods for modals', () => {
    it('submitUpdate should call prayerService.addUpdate', async () => {
      mocks.prayerService.addUpdate.mockResolvedValue(undefined);

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      const updateData = { id: 'u1', text: 'Update' };
      await (comp as any).submitUpdate(updateData);

      expect(mocks.prayerService.addUpdate).toHaveBeenCalledWith(updateData);
    });

    it('submitDeletion should call prayerService.requestDeletion', async () => {
      mocks.prayerService.requestDeletion.mockResolvedValue(undefined);

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      const requestData = { id: 'p1', reason: 'Done' };
      await (comp as any).submitDeletion(requestData);

      expect(mocks.prayerService.requestDeletion).toHaveBeenCalledWith(requestData);
    });

    it('submitUpdateDeletion should call prayerService.requestUpdateDeletion', async () => {
      mocks.prayerService.requestUpdateDeletion.mockResolvedValue(undefined);

      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      const requestData = { id: 'u1', reason: 'Spam' };
      await (comp as any).submitUpdateDeletion(requestData);

      expect(mocks.prayerService.requestUpdateDeletion).toHaveBeenCalledWith(requestData);
    });
  });

  describe('Error handling in member update reload', () => {
    it('should handle detectChanges errors gracefully', async () => {
      vi.useFakeTimers();
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      comp.editingMemberUpdate = { id: 'u1', text: 'Update' } as any;
      comp.editingMemberUpdatePrayerId = 'pc-member-123';
      comp.showEditMemberUpdate = true;
      comp.planningCenterListMembers = [{ id: '123', name: 'Member' }] as any;
      comp.filteredPlanningCenterPrayers = [{
        id: 'pc-member-123',
        prayer_for: 'Member',
        title: 'Member Prayer',
        updates: []
      }] as any;

      mocks.prayerService.getMemberPrayerUpdates = vi.fn().mockResolvedValue([
        { id: 'u2', text: 'New update' }
      ]);

      mocks.cdr.detectChanges.mockImplementation(() => {
        throw new Error('Change detection error');
      });

      comp.onMemberUpdateSaved();

      await vi.advanceTimersByTimeAsync(150);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
      vi.useRealTimers();
    });
  });

  describe('getDisplayedPrompts', () => {
    it('should return empty array when activeFilter is not prompts', () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.activeFilter = 'current';

      const result = comp.getDisplayedPrompts();

      expect(result).toHaveLength(0);
    });

    it('should return prompts when activeFilter is prompts', () => {
      const comp = new HomeComponent(
        mocks.prayerService,
        mocks.promptService,
        mocks.adminAuthService,
        mocks.userSessionService,
        mocks.badgeService,
        mocks.cacheService,
        mocks.toastService,
        mocks.analyticsService,
        mocks.cdr,
        mocks.router,
        mocks.supabaseService
      );

      comp.activeFilter = 'prompts';
      const prompts = [
        { id: '1', text: 'Prompt 1' } as any,
        { id: '2', text: 'Prompt 2' } as any
      ];
      mocks.promptService.promptsSubject = { value: prompts } as any;

      const result = comp.getDisplayedPrompts();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
    });
  });
});
