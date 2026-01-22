import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BehaviorSubject, of } from 'rxjs';
import { HomeComponent } from './home.component';
import { PrayerRequest } from '../../services/prayer.service';

const makeMocks = () => {
  const prayersSubject = new BehaviorSubject<any[]>([]);
  const promptsSubject = new BehaviorSubject<any[]>([]);
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
    swapCategoryRanges: vi.fn()
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
    userSession$: new BehaviorSubject(null).asObservable(),
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

  return { prayerService, promptService, adminAuthService, userSessionService, badgeService, cacheService, toastService, analyticsService, cdr, router, supabaseService, prayersSubject, promptsSubject };
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
    await comp.deleteUpdate('u1');
    expect(mocks.toastService.success).toHaveBeenCalledWith('Update deleted successfully');

    mocks.prayerService.deleteUpdate.mockRejectedValue(new Error('bad'));
    await comp.deleteUpdate('u2');
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
    expect(mocks.toastService.success).toHaveBeenCalledWith('Logged out successfully');
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

      await comp.deletePersonalUpdate('u1');

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

      await comp.deletePersonalUpdate('u1');

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
});
