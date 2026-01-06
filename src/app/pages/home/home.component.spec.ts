import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BehaviorSubject, of } from 'rxjs';
import { HomeComponent } from './home.component';

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
    requestUpdateDeletion: vi.fn()
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
    getUserFullName: vi.fn(() => null)
  };

  const toastService: any = {
    success: vi.fn(),
    error: vi.fn()
  };

  const analyticsService: any = {
    trackPageView: vi.fn()
  };

  const cdr: any = {
    markForCheck: vi.fn()
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

  return { prayerService, promptService, adminAuthService, userSessionService, toastService, analyticsService, cdr, router, supabaseService, prayersSubject, promptsSubject };
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
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router
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
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router
    );
    expect(comp.getUserEmail()).toBe('Not logged in');
  });

  it('ngOnInit wires observables and updates counts and promptsCount', () => {
    const { prayersSubject, promptsSubject, prayerService } = mocks;
    const comp = new HomeComponent(
      prayerService,
      mocks.promptService,
      mocks.adminAuthService,
      mocks.userSessionService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router
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

    expect(mocks.analyticsService.trackPageView).toHaveBeenCalled();
    // counts should reflect the seeded data
    expect(comp.currentPrayersCount).toBe(2);
    expect(comp.answeredPrayersCount).toBe(1);
    expect(comp.totalPrayersCount).toBe(3);
    expect(comp.promptsCount).toBe(1);
    expect(mocks.cdr.markForCheck).toHaveBeenCalled();
    expect(mocks.prayerService.applyFilters).toHaveBeenCalled();
  });

  it('onFiltersChange preserves status and calls applyFilters', () => {
    const comp = new HomeComponent(
      mocks.prayerService,
      mocks.promptService,
      mocks.adminAuthService,
      mocks.userSessionService,
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router
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
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router
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
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router
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
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router
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
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router
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
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router
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
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router
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
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router
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
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router
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
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router
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
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router
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
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router
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
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router
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
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router
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
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router
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
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router
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
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router
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
      mocks.toastService,
      mocks.analyticsService,
      mocks.cdr,
      mocks.router,
      mockSupabaseService
    );

    await comp['loadAdminSettings']();

    expect(comp.deletionsAllowed).toBe('original-requestor');
    expect(comp.updatesAllowed).toBe('admin-only');
    expect(mocks.cdr.markForCheck).toHaveBeenCalled();
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
});
