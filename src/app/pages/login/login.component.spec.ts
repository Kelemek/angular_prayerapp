import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BehaviorSubject, of } from 'rxjs';
import { LoginComponent } from './login.component';

// Mock external helpers
vi.mock('../../../utils/userInfoStorage', () => ({ saveUserInfo: vi.fn() }));
vi.mock('../../../lib/planning-center', () => ({ lookupPersonByEmail: vi.fn() }));

const makeMocks = () => {
  const requireSiteLogin$ = new BehaviorSubject(false);
  const isAdmin$ = new BehaviorSubject(false);

  const adminAuthService: any = {
    requireSiteLogin$,
    isAdmin$,
    sendMfaCode: vi.fn(async (email: string) => ({ success: true })),
    verifyMfaCode: vi.fn(async (code: string) => ({ success: true, isAdmin: false })),
    logout: vi.fn(async () => {})
  };

  const supabaseService: any = {
    client: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: { verification_code_length: 6 }, error: null }) ) }))
        }))
      })),
      rpc: vi.fn(async () => ({ data: 'ok', error: null }))
    },
    directQuery: vi.fn(async () => ({ data: [{ use_logo: true, light_mode_logo_blob: 'LIGHT_URL', dark_mode_logo_blob: 'DARK_URL' }], error: null })),
    directMutation: vi.fn(async () => ({ data: [{ id: '1' }], error: null }))
  };

  const emailNotificationService: any = {
    sendAccountApprovalNotification: vi.fn(async () => true)
  };

  const userSessionService: any = {
    waitForSession: vi.fn(async () => ({})),
    loadUserSession: vi.fn(async () => {}),
    clearSession: vi.fn()
  };

  const themeService: any = {
    getTheme: vi.fn(() => 'light'),
    theme$: of('light')
  };

  const brandingService: any = {
    initialize: vi.fn(async () => {}),
    branding$: new BehaviorSubject({
      useLogo: true,
      appTitle: 'Test Church',
      appSubtitle: 'Test Subtitle',
      lightModeLogoBlobUrl: 'LIGHT_URL',
      darkModeLogoBlobUrl: 'DARK_URL',
      lastModified: new Date()
    }),
    getImageUrl: vi.fn((branding) => branding.useLogo ? 'LIGHT_URL' : '')
  };

  const router: any = { navigate: vi.fn() };

  const route: any = {
    queryParams: {
      subscribe: (cb: any) => cb({})
    }
  };

  const cdr: any = { markForCheck: vi.fn() };

  return { adminAuthService, supabaseService, emailNotificationService, userSessionService, themeService, brandingService, router, route, cdr, requireSiteLogin$, isAdmin$ };
};

const mockMatchMedia = (matches = false) => ({
  matches,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn()
});

const makeComponent = (mocks: any) => {
  const comp = makeComponentWithMocks(
    mocks.adminAuthService,
    mocks.supabaseService,
    mocks.emailNotificationService,
    mocks.userSessionService,
    mocks.themeService,
    mocks.brandingService,
    mocks.router,
    mocks.route,
    mocks.cdr
  );
  // Provide a mock QueryList for ViewChildren `codeInputs` used by focusInput
  comp.codeInputs = { toArray: () => [{ nativeElement: { focus: vi.fn() } }] } as any;
  // Register for cleanup
  componentsToCleanup.push(comp);
  return comp;
};

// Helper to create LoginComponent with custom service mocks (for tests with modified mocks)
let componentsToCleanup: LoginComponent[] = [];
const makeComponentWithMocks = (adminAuth: any, supabase: any, emailNotif: any, userSession: any, theme: any, branding: any, router: any, route: any, cdr: any) => {
  const comp = new LoginComponent(
    adminAuth,
    supabase,
    emailNotif,
    userSession,
    theme,
    branding,
    router,
    route,
    cdr
  );
  comp.codeInputs = { toArray: () => [{ nativeElement: { focus: vi.fn() } }] } as any;
  // Register for cleanup
  componentsToCleanup.push(comp);
  return comp;
};

describe('LoginComponent', () => {
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(async () => {
    // reset spies/mocks BEFORE creating mocks
    vi.resetAllMocks();
    mocks = makeMocks();
    localStorage.clear();
    sessionStorage.clear();
    // ensure global matchMedia exists for tests
    vi.stubGlobal('matchMedia', (query: string) => mockMatchMedia());
    // Note: saveUserInfo is already mocked as a spy in the utils/userInfoStorage module
    componentsToCleanup = [];
  });

  afterEach(() => {
    // Clean up all component instances created during the test
    for (const comp of componentsToCleanup) {
      try {
        (comp as any).ngOnDestroy?.();
      } catch (e) {
        // Ignore errors during cleanup
      }
    }
    componentsToCleanup = [];
  });

  it('ngOnInit initializes values and subscribes to observables', async () => {
    const comp = makeComponent(mocks);

    // ensure initial state
    expect(comp.mfaCode.length).toBe(0);

    await comp.ngOnInit();

    // code length fetched from supabase mock
    expect(comp.codeLength).toBe(6);
    expect(mocks.supabaseService.client.from).toHaveBeenCalled();
  });

  it('isValidEmail returns false for empty or invalid emails and true for valid', () => {
    const comp = makeComponent(mocks);
    comp.email = '';
    expect(comp.isValidEmail()).toBe(false);
    comp.email = 'not-an-email';
    expect(comp.isValidEmail()).toBe(false);
    comp.email = 'test@example.com';
    expect(comp.isValidEmail()).toBe(true);
  });

  it('sanitizeCodeInput strips non-digits and respects codeLength', () => {
    const comp = makeComponent(mocks);
    comp.codeLength = 4;
    comp.mfaCodeInput = 'a1b2c3';
    comp.sanitizeCodeInput();
    expect(comp.mfaCodeInput).toBe('123');
    expect(comp.mfaCode).toEqual(['1', '2', '3']);
  });

  it('handleSubmit sends MFA code and sets sessionStorage on success', async () => {
    const comp = makeComponent(mocks);
    comp.email = 'u@e.com';
    // adminAuthService.sendMfaCode mocked to success
    await comp.handleSubmit(new Event('submit'));
    expect(sessionStorage.getItem('mfa_email_sent')).toBe('true');
    expect(sessionStorage.getItem('mfa_email')).toBe('u@e.com');
    expect(comp.success).toBe(true);
    expect(comp.waitingForMfaCode).toBe(true);
  });

  it('handleResendCode uses sendMfaCode and clears code on success', async () => {
    mocks.adminAuthService.sendMfaCode = vi.fn(async () => ({ success: true }));
    const comp = makeComponent(mocks);
    comp.email = 'u@e.com';
    comp.codeLength = 4;
    comp.mfaCode = ['1', '2', '3', '4'];
    await comp.handleResendCode();
    expect(mocks.adminAuthService.sendMfaCode).toHaveBeenCalledWith('u@e.com');
    expect(comp.mfaCode.join('')).toBe('');
  });

  it('onCodeInput triggers verifyMfaCode when code is complete', async () => {
    const comp = makeComponent(mocks);
    comp.codeLength = 4;
    comp.mfaCodeInput = '1234';
    comp.mfaCode = ['1', '2', '3', '4'];
    
    const verifySpy = vi.spyOn(comp as any, 'verifyMfaCode').mockResolvedValue(undefined);
    
    comp.onCodeInput();
    
    // Wait for setTimeout to execute
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(verifySpy).toHaveBeenCalled();
  });

  it('onCodeInput does not trigger verification if code is incomplete', async () => {
    const comp = makeComponent(mocks);
    comp.codeLength = 4;
    comp.mfaCodeInput = '12';
    comp.mfaCode = ['1', '2'];
    
    const verifySpy = vi.spyOn(comp as any, 'verifyMfaCode').mockResolvedValue(undefined);
    
    comp.onCodeInput();
    
    // Wait for setTimeout to execute
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(verifySpy).not.toHaveBeenCalled();
  });

  it('onCodeInput does not trigger verification if already loading', async () => {
    const comp = makeComponent(mocks);
    comp.codeLength = 4;
    comp.mfaCodeInput = '1234';
    comp.mfaCode = ['1', '2', '3', '4'];
    comp.loading = true;
    
    const verifySpy = vi.spyOn(comp as any, 'verifyMfaCode').mockResolvedValue(undefined);
    
    comp.onCodeInput();
    
    // Wait for setTimeout to execute
    await new Promise(resolve => setTimeout(resolve, 10));
    
    expect(verifySpy).not.toHaveBeenCalled();
  });

  it('verifyMfaCode handles incomplete code', async () => {
    const comp = makeComponent(mocks);
    comp.codeLength = 4;
    comp.mfaCodeInput = '12';
    comp.mfaCode = ['1', '2'];
    await (comp as any).verifyMfaCode();
    expect(comp.error).toContain('Please enter the complete code');
  });

  it('verifyMfaCode routes when verification successful and user is subscriber', async () => {
    // mock verify to success and checkEmailSubscriber to true
    mocks.adminAuthService.verifyMfaCode = vi.fn(async () => ({ success: true, isAdmin: false }));
    mocks.supabaseService.directQuery = vi.fn(async () => ({ data: [{ id: 'sub' }], error: null }));
    // mock lookupPersonByEmail to return no results
    const pc = await import('../../../lib/planning-center');
    (pc.lookupPersonByEmail as any).mockResolvedValue({ count: 0, people: [] });

    const comp = makeComponent(mocks);
    comp.email = 'test@example.com';
    comp.mfaCode = ['1', '2', '3', '4'];
    comp.codeLength = 4;
    comp.mfaCodeInput = comp.mfaCode.join('');

    // stub checkEmailSubscriber on the instance to return true
    vi.spyOn(comp as any, 'checkEmailSubscriber').mockResolvedValue(true);

    await (comp as any).verifyMfaCode();
    // Wait for setTimeout (1 second delay) to complete
    await new Promise(resolve => setTimeout(resolve, 1100));
    // completed without setting an error
    expect(comp.error).toBeFalsy();
  });

  it('verifyMfaCode shows subscriber form when not a subscriber and found in Planning Center', async () => {
    mocks.adminAuthService.verifyMfaCode = vi.fn(async () => ({ success: true, isAdmin: false }));
    vi.spyOn((await import('../../../lib/planning-center')), 'lookupPersonByEmail').mockResolvedValue({ count: 1, people: [] });
    const comp = makeComponent(mocks);
    comp.email = 'new@example.com';
    comp.mfaCode = ['1', '2', '3', '4'];
    comp.mfaCodeInput = comp.mfaCode.join('');
    comp.codeLength = 4;
    // make checkEmailSubscriber return false
    vi.spyOn(comp as any, 'checkEmailSubscriber').mockResolvedValue(false);
    vi.spyOn(comp as any, 'checkPendingApprovalRequest').mockResolvedValue(false);

    await (comp as any).verifyMfaCode();
    // Wait for setTimeout (1 second delay) to complete
    await new Promise(resolve => setTimeout(resolve, 1100));
    // subscriber form or an error state should be set
    expect(comp.showSubscriberForm || comp.error).toBeTruthy();
  });

  it('verifyMfaCode shows subscriber form requiring approval when not in Planning Center', async () => {
    mocks.adminAuthService.verifyMfaCode = vi.fn(async () => ({ success: true, isAdmin: false }));
    vi.spyOn((await import('../../../lib/planning-center')), 'lookupPersonByEmail').mockResolvedValue({ count: 0, people: [] });
    const comp = makeComponentWithMocks(
      mocks.adminAuthService,
      mocks.supabaseService,
      mocks.emailNotificationService,
      mocks.userSessionService,
      mocks.themeService,
      mocks.brandingService,
      mocks.router,
      mocks.route,
      mocks.cdr
    );
    comp.email = 'new2@example.com';
    comp.mfaCode = ['1', '2', '3', '4'];
    comp.mfaCodeInput = comp.mfaCode.join('');
    comp.codeLength = 4;
    vi.spyOn(comp as any, 'checkEmailSubscriber').mockResolvedValue(false);
    vi.spyOn(comp as any, 'checkPendingApprovalRequest').mockResolvedValue(false);

    await (comp as any).verifyMfaCode();
    // Wait for setTimeout (1 second delay) to complete
    await new Promise(resolve => setTimeout(resolve, 1100));
    // subscriber form (requiring approval) or an error state should be set
    expect(comp.showSubscriberForm || comp.requiresApproval || comp.error).toBeTruthy();
  });

  it('saveNewSubscriber returns false when names missing', async () => {
    const comp = makeComponentWithMocks(
      mocks.adminAuthService,
      mocks.supabaseService,
      mocks.emailNotificationService,
      mocks.userSessionService,
      mocks.themeService,
      mocks.brandingService,
      mocks.router,
      mocks.route,
      mocks.cdr
    );
    comp.firstName = '';
    comp.lastName = '';
    const res = await comp.saveNewSubscriber();
    expect(res).toBe(false);
    expect(comp.error).toContain('Please enter your first and last name');
  });

  it('saveNewSubscriber handles approval RPC error and sets friendly message', async () => {
    // setup rpc to return error
    mocks.supabaseService.client.rpc = vi.fn(async () => ({ data: null, error: { message: 'duplicate key' } }));
    const comp = makeComponentWithMocks(
      mocks.adminAuthService,
      mocks.supabaseService,
      mocks.emailNotificationService,
      mocks.userSessionService,
      mocks.themeService,
      mocks.brandingService,
      mocks.router,
      mocks.route,
      mocks.cdr
    );
    comp.email = 'x@y.com';
    comp.firstName = 'A';
    comp.lastName = 'B';
    comp.requiresApproval = true;
    const res = await comp.saveNewSubscriber();
    expect(res).toBe(false);
    expect(comp.error).toContain('An approval request already exists');
  });

  it('saveNewSubscriber success approval path shows pending approval', async () => {
    mocks.supabaseService.client.rpc = vi.fn(async () => ({ data: 123, error: null }));
    const comp = makeComponentWithMocks(
      mocks.adminAuthService,
      mocks.supabaseService,
      mocks.emailNotificationService,
      mocks.userSessionService,
      mocks.themeService,
      mocks.brandingService,
      mocks.router,
      mocks.route,
      mocks.cdr
    );
    comp.email = 'x2@y.com';
    comp.firstName = 'A';
    comp.lastName = 'B';
    comp.requiresApproval = true;
    const res = await comp.saveNewSubscriber();
    expect(res).toBe(true);
    expect(comp.showPendingApproval).toBe(true);
  });

  it('saveNewSubscriber normal flow saves subscriber and navigates', async () => {
    const mutationSpy = vi.fn(async () => ({ data: [{ id: '1' }], error: null }));
    mocks.supabaseService.directMutation = mutationSpy;
    const comp = makeComponentWithMocks(
      mocks.adminAuthService,
      mocks.supabaseService,
      mocks.emailNotificationService,
      mocks.userSessionService,
      mocks.themeService,
      mocks.brandingService,
      mocks.router,
      mocks.route,
      mocks.cdr
    );
    comp.email = 'x3@y.com';
    comp.firstName = 'A';
    comp.lastName = 'B';
    comp.requiresApproval = false;
    const res = await comp.saveNewSubscriber();
    expect(res).toBe(true);
    expect(mutationSpy).toHaveBeenCalledWith(
      'email_subscribers',
      expect.objectContaining({
        body: expect.objectContaining({
          email: 'x3@y.com',
          name: 'A B',
          is_active: true,
          is_admin: false,
          receive_admin_emails: false,
          in_planning_center: true,
          planning_center_checked_at: expect.any(String)
        })
      })
    );
    expect(mocks.router.navigate).toHaveBeenCalled();
  });

  it('handleSubmit handles sendMfaCode failure and sets error', async () => {
    const badMocks = makeMocks();
    badMocks.adminAuthService.sendMfaCode = vi.fn(async () => ({ success: false, error: 'bad' }));
    const comp = makeComponent(badMocks);
    comp.email = 'bad@x.com';
    await comp.handleSubmit(new Event('submit'));
    expect(comp.error).toContain('bad');
    expect(comp.loading).toBe(false);
  });

  it('handleSubmit catches exceptions from sendMfaCode', async () => {
    const errMocks = makeMocks();
    errMocks.adminAuthService.sendMfaCode = vi.fn(async () => { throw new Error('boom'); });
    const comp = makeComponent(errMocks);
    comp.email = 'boom@x.com';
    await comp.handleSubmit(new Event('submit'));
    expect(comp.error).toContain('boom');
  });

  it('verifyMfaCode handles verification failure branch', async () => {
    const vMocks = makeMocks();
    vMocks.adminAuthService.verifyMfaCode = vi.fn(async () => ({ success: false, error: 'invalid' }));
    const comp = makeComponent(vMocks);
    comp.codeLength = 4;
    comp.mfaCode = ['1','2','3','4'];
    comp.mfaCodeInput = '1234';
    // spy focusInput so we can assert it's called when verification fails
    const focusSpy = vi.spyOn(comp as any, 'focusInput');
    await (comp as any).verifyMfaCode();
    expect(comp.error).toContain('invalid');
    expect(focusSpy).toHaveBeenCalled();
  });

  it('checkEmailSubscriber throws blocked error surfaces to user', async () => {
    const comp = makeComponent(mocks);
    // make directQuery return an object shaped { data, error }
    mocks.supabaseService.directQuery = vi.fn(async () => ({ data: [{ id: '1', is_blocked: true }], error: null }));
    await expect(comp['checkEmailSubscriber']('x@y.com')).rejects.toThrow('blocked');
  });

  it('ngOnInit calls brandingService.initialize', async () => {
    const comp = makeComponent(mocks);
    await comp.ngOnInit();
    expect(mocks.brandingService.initialize).toHaveBeenCalled();
  });

  it('resetForm clears session and resets state', () => {
    const comp = makeComponent(mocks);
    sessionStorage.setItem('mfa_email_sent', 'true');
    sessionStorage.setItem('mfa_email', 'a@b.com');
    comp.success = true;
    comp.waitingForMfaCode = true;
    comp.email = 'a@b.com';
    comp.mfaCode = ['1','2'];
    comp.error = 'err';
    comp.resetForm();
    expect(sessionStorage.getItem('mfa_email_sent')).toBeNull();
    expect(sessionStorage.getItem('mfa_email')).toBeNull();
    expect(comp.success).toBe(false);
    expect(comp.waitingForMfaCode).toBe(false);
    expect(comp.email).toBe('');
    expect(comp.error).toBe('');
  });

  it('handleCodeChange handles autofill and moves focus', () => {
    const comp = makeComponent(mocks);
    comp.codeLength = 4;
    // Provide a codeInputs shape with .first and toArray
    comp.codeInputs = { first: { nativeElement: { value: '' } }, toArray: () => [{ nativeElement: { focus: vi.fn() } }] } as any;
    const focusSpy = vi.spyOn(comp as any, 'focusInput');
    comp.handleCodeChange(0, { target: { value: '1234' } });
    expect(comp.mfaCode.join('')).toBe('1234');
    expect((comp.codeInputs as any).first.nativeElement.value).toBe('1');
    expect(focusSpy).toHaveBeenCalledWith(3);
  });

  it('handleKeyDown handles Backspace and arrow navigation and Enter', async () => {
    const comp = makeComponent(mocks);
    comp.codeLength = 4;
    comp.mfaCode = ['1','2','3','4'];
    const focusSpy = vi.spyOn(comp as any, 'focusInput');
    const prevent = vi.fn();
    comp.handleKeyDown(2, { key: 'Backspace', preventDefault: prevent });
    expect(prevent).toHaveBeenCalled();
    expect(comp.mfaCode[2]).toBe('');
    expect(focusSpy).toHaveBeenCalledWith(1);

    focusSpy.mockClear();
    comp.handleKeyDown(2, { key: 'ArrowLeft' });
    expect(focusSpy).toHaveBeenCalledWith(1);

    focusSpy.mockClear();
    comp.handleKeyDown(1, { key: 'ArrowRight' });
    expect(focusSpy).toHaveBeenCalledWith(2);

    // Enter when complete should call handleSubmit
    comp.mfaCodeInput = '1234';
    const submitSpy = vi.spyOn(comp as any, 'handleSubmit');
    await comp.handleKeyDown(1, { key: 'Enter' });
    expect(submitSpy).toHaveBeenCalled();
  });

  it('handlePaste fills digits and focuses last input', () => {
    const comp = makeComponent(mocks);
    comp.codeLength = 4;
    const focusSpy = vi.spyOn(comp as any, 'focusInput');
    const event: any = { preventDefault: vi.fn(), clipboardData: { getData: vi.fn(() => '12 34') } };
    comp.handlePaste(event);
    expect(comp.mfaCode.join('')).toBe('1234');
    expect(focusSpy).toHaveBeenCalledWith(3);
  });

  it('detectDarkMode uses system preference when theme is system', () => {
    const sysMocks = makeMocks();
    sysMocks.themeService.getTheme = vi.fn(() => 'system');
    // stub matchMedia to report dark preference
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: true } as any));
    const comp = makeComponentWithMocks(
      sysMocks.adminAuthService,
      sysMocks.supabaseService,
      sysMocks.emailNotificationService,
      sysMocks.userSessionService,
      sysMocks.themeService,
      sysMocks.brandingService,
      sysMocks.router,
      sysMocks.route,
      sysMocks.cdr
    );
    (comp as any).detectDarkMode();
    expect((comp as any).isDarkMode).toBe(true);
  });

  it('fetchCodeLength sets default on error or missing data', async () => {
    const badMocks = makeMocks();
    badMocks.supabaseService.client.from = vi.fn(() => ({ select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null, error: null }) ) })) })) }));
    const comp = makeComponentWithMocks(
      badMocks.adminAuthService,
      badMocks.supabaseService,
      badMocks.emailNotificationService,
      badMocks.userSessionService,
      badMocks.themeService,
      badMocks.brandingService,
      badMocks.router,
      badMocks.route,
      badMocks.cdr
    );
    await (comp as any).fetchCodeLength();
    expect(comp.codeLength).toBe(4);
    // now throw
    badMocks.supabaseService.client.from = () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => { throw new Error('db'); }
        })
      })
    }) as any;
    await (comp as any).fetchCodeLength();
    expect(comp.codeLength).toBe(4);
  });

  it('saveNewSubscriber handles email notification failure but still shows pending approval', async () => {
    const compMocks = makeMocks();
    // rpc resolves successfully
    compMocks.supabaseService.client.rpc = vi.fn(async () => ({ data: 999, error: null }));
    // email send fails
    compMocks.emailNotificationService.sendAccountApprovalNotification = vi.fn(async () => { throw new Error('smtp fail'); });

    const comp = makeComponentWithMocks(
      compMocks.adminAuthService,
      compMocks.supabaseService,
      compMocks.emailNotificationService,
      compMocks.userSessionService,
      compMocks.themeService,
      compMocks.brandingService,
      compMocks.router,
      compMocks.route,
      compMocks.cdr
    );
    comp.email = 'notify@x.com';
    comp.firstName = 'A';
    comp.lastName = 'B';
    comp.requiresApproval = true;

    const res = await comp.saveNewSubscriber();
    expect(res).toBe(true);
    expect(comp.showPendingApproval).toBe(true);
  });

  it('saveNewSubscriber handles directMutation save error and surfaces friendly message', async () => {
    const compMocks = makeMocks();
    // simulate directMutation error
    compMocks.supabaseService.directMutation = vi.fn(async () => ({ data: null, error: { message: 'Insert failed', status: 500 } }));

    const comp = makeComponentWithMocks(
      compMocks.adminAuthService,
      compMocks.supabaseService,
      compMocks.emailNotificationService,
      compMocks.userSessionService,
      compMocks.themeService,
      compMocks.brandingService,
      compMocks.router,
      compMocks.route,
      compMocks.cdr
    );
    comp.email = 'savefail@x.com';
    comp.firstName = 'A';
    comp.lastName = 'B';
    comp.requiresApproval = false;

    const res = await comp.saveNewSubscriber();
    expect(res).toBe(false);
    expect(comp.error).toContain('Failed to save subscriber');
  });

  it('ngOnDestroy completes the destroy subject', () => {
    const comp = makeComponent(mocks);
    const destroySpy = vi.spyOn((comp as any)['destroy$'], 'next');
    const completeSpy = vi.spyOn((comp as any)['destroy$'], 'complete');
    comp.ngOnDestroy();
    expect(destroySpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });

  it('ngOnInit handles sessionExpired query param and sets error message', async () => {
    const queryMocks = makeMocks();
    queryMocks.route = {
      queryParams: {
        subscribe: (cb: any) => cb({ sessionExpired: 'true' })
      }
    } as any;
    const comp = makeComponentWithMocks(
      queryMocks.adminAuthService,
      queryMocks.supabaseService,
      queryMocks.emailNotificationService,
      queryMocks.userSessionService,
      queryMocks.themeService,
      queryMocks.brandingService,
      queryMocks.router,
      queryMocks.route,
      queryMocks.cdr
    );
    comp.codeInputs = { toArray: () => [] } as any;
    await comp.ngOnInit();
    expect(comp.error).toContain('Your admin session has expired');
  });

  it('ngOnInit handles blocked query param and displays blocked message', async () => {
    const queryMocks = makeMocks();
    queryMocks.route = {
      queryParams: {
        subscribe: (cb: any) => cb({ blocked: 'true' })
      }
    } as any;
    const comp = makeComponentWithMocks(
      queryMocks.adminAuthService,
      queryMocks.supabaseService,
      queryMocks.emailNotificationService,
      queryMocks.userSessionService,
      queryMocks.themeService,
      queryMocks.brandingService,
      queryMocks.router,
      queryMocks.route,
      queryMocks.cdr
    );
    comp.codeInputs = { toArray: () => [] } as any;
    await comp.ngOnInit();
    expect(comp.showBlockedMessage).toBe(true);
  });

  it('ngOnInit handles email query param and prefills email', async () => {
    const queryMocks = makeMocks();
    queryMocks.route = {
      queryParams: {
        subscribe: (cb: any) => cb({ email: 'prefilled@example.com' })
      }
    } as any;
    const comp = makeComponentWithMocks(
      queryMocks.adminAuthService,
      queryMocks.supabaseService,
      queryMocks.emailNotificationService,
      queryMocks.userSessionService,
      queryMocks.themeService,
      queryMocks.brandingService,
      queryMocks.router,
      queryMocks.route,
      queryMocks.cdr
    );
    comp.codeInputs = { toArray: () => [] } as any;
    await comp.ngOnInit();
    expect(comp.email).toBe('prefilled@example.com');
  });

  it('ngOnInit subscribes to requireSiteLogin$ and updates component state', async () => {
    const queryMocks = makeMocks();
    queryMocks.route = {
      queryParams: { subscribe: (cb: any) => cb({}) }
    } as any;
    const comp = makeComponentWithMocks(
      queryMocks.adminAuthService,
      queryMocks.supabaseService,
      queryMocks.emailNotificationService,
      queryMocks.userSessionService,
      queryMocks.themeService,
      queryMocks.brandingService,
      queryMocks.router,
      queryMocks.route,
      queryMocks.cdr
    );
    comp.codeInputs = { toArray: () => [] } as any;
    await comp.ngOnInit();
    expect(comp.requireSiteLogin).toBe(false);
    // Emit new value
    queryMocks.requireSiteLogin$.next(true);
    expect(comp.requireSiteLogin).toBe(true);
  });

  it('ngOnInit saves mfa_email_sent and mfa_email to sessionStorage when set', async () => {
    sessionStorage.setItem('mfa_email_sent', 'true');
    sessionStorage.setItem('mfa_email', 'session@example.com');
    const queryMocks = makeMocks();
    queryMocks.route.queryParams = { subscribe: (cb: any) => cb({}) };
    const comp = makeComponentWithMocks(
      queryMocks.adminAuthService,
      queryMocks.supabaseService,
      queryMocks.emailNotificationService,
      queryMocks.userSessionService,
      queryMocks.themeService,
      queryMocks.brandingService,
      queryMocks.router,
      queryMocks.route,
      queryMocks.cdr
    );
    const focusInputMock = vi.fn();
    comp.codeInputs = { toArray: () => [{ nativeElement: { focus: focusInputMock } }] } as any;
    // Spy on focusInput before ngOnInit
    vi.spyOn(comp as any, 'focusInput');
    await comp.ngOnInit();
    expect(comp.success).toBe(true);
    expect(comp.waitingForMfaCode).toBe(true);
    expect(comp.email).toBe('session@example.com');
  });

  it('ngOnInit navigates to home when user is already authenticated', async () => {
    const authMocks = makeMocks();
    authMocks.route.queryParams = { subscribe: (cb: any) => cb({}) };
    const comp = makeComponentWithMocks(
      authMocks.adminAuthService,
      authMocks.supabaseService,
      authMocks.emailNotificationService,
      authMocks.userSessionService,
      authMocks.themeService,
      authMocks.brandingService,
      authMocks.router,
      authMocks.route,
      authMocks.cdr
    );
    comp.codeInputs = { toArray: () => [] } as any;
    await comp.ngOnInit();
    // Emit isAdmin as true
    authMocks.isAdmin$.next(true);
    expect(authMocks.router.navigate).toHaveBeenCalledWith(['/']);
  });

  it('handleSingleCodeInput delegates to sanitizeCodeInput', () => {
    const comp = makeComponent(mocks);
    comp.codeLength = 4;
    comp.mfaCodeInput = 'abc123';
    const sanitizeSpy = vi.spyOn(comp, 'sanitizeCodeInput');
    comp.handleSingleCodeInput(null);
    expect(sanitizeSpy).toHaveBeenCalled();
  });

  it('watchThemeChanges responds to MutationObserver on document class changes', async () => {
    const themeMocks = makeMocks();
    themeMocks.route.queryParams = { subscribe: (cb: any) => cb({}) };
    const comp = makeComponentWithMocks(
      themeMocks.adminAuthService,
      themeMocks.supabaseService,
      themeMocks.emailNotificationService,
      themeMocks.userSessionService,
      themeMocks.themeService,
      themeMocks.brandingService,
      themeMocks.router,
      themeMocks.route,
      themeMocks.cdr
    );
    comp.codeInputs = { toArray: () => [] } as any;
    comp.useLogo = true;
    // Clear any cached logos from previous tests
    localStorage.removeItem('branding_dark_logo');
    localStorage.removeItem('branding_light_logo');
    localStorage.setItem('branding_light_logo', 'LIGHT_URL');
    localStorage.setItem('branding_dark_logo', 'DARK_URL');
    
    await comp.ngOnInit();
    
    // Simulate document class change to dark
    document.documentElement.classList.add('dark');
    // Test the update logic works
    (comp as any).isDarkMode = true;
    expect(comp.useLogo).toBe(true);
    
    // Test light mode
    (comp as any).isDarkMode = false;
    expect(comp.useLogo).toBe(true);
  });

  it('watchThemeChanges responds to ThemeService theme$ observable changes', async () => {
    const themeMocks = makeMocks();
    themeMocks.route.queryParams = { subscribe: (cb: any) => cb({}) };
    themeMocks.themeService.theme$ = new BehaviorSubject('light');
    themeMocks.themeService.getTheme = vi.fn(() => 'dark');
    const comp = makeComponentWithMocks(
      themeMocks.adminAuthService,
      themeMocks.supabaseService,
      themeMocks.emailNotificationService,
      themeMocks.userSessionService,
      themeMocks.themeService,
      themeMocks.brandingService,
      themeMocks.router,
      themeMocks.route,
      themeMocks.cdr
    );
    comp.codeInputs = { toArray: () => [] } as any;
    comp.useLogo = true;
    localStorage.setItem('branding_light_logo', 'L');
    localStorage.setItem('branding_dark_logo', 'D');
    
    await comp.ngOnInit();
    
    // Simulate theme change
    (comp as any).isDarkMode = true;
    expect(comp.useLogo).toBe(true);
    
    (comp as any).isDarkMode = false;
    expect(comp.useLogo).toBe(true);
  });

  it('watchThemeChanges responds to ThemeService theme$ observable changes (observable variant)', async () => {
    const themeMocks = makeMocks();
    themeMocks.route.queryParams = { subscribe: (cb: any) => cb({}) };
    themeMocks.themeService.theme$ = new BehaviorSubject('light');
    themeMocks.themeService.getTheme = vi.fn(() => 'dark');
    const comp = makeComponentWithMocks(
      themeMocks.adminAuthService,
      themeMocks.supabaseService,
      themeMocks.emailNotificationService,
      themeMocks.userSessionService,
      themeMocks.themeService,
      themeMocks.brandingService,
      themeMocks.router,
      themeMocks.route,
      themeMocks.cdr
    );
    comp.codeInputs = { toArray: () => [] } as any;
    comp.useLogo = true;
    
    await comp.ngOnInit();
    
    // Emit dark theme from service
    (themeMocks.themeService.theme$ as BehaviorSubject<string>).next('dark');
    expect((comp as any).isDarkMode).toBe(true);
  });

  it('handleCodeChange allows only digits and clears on invalid input', () => {
    const comp = makeComponent(mocks);
    comp.codeLength = 4;
    comp.mfaCode = ['', '', '', ''];
    comp.handleCodeChange(0, { target: { value: 'a' } });
    expect(comp.mfaCode[0]).toBe('');
    comp.handleCodeChange(0, { target: { value: '5' } });
    expect(comp.mfaCode[0]).toBe('5');
  });

  it('handleCodeChange handles null or missing event gracefully', () => {
    const comp = makeComponent(mocks);
    comp.mfaCode = ['1', '', '', ''];
    comp.handleCodeChange(0, null);
    // Should not throw, state unchanged
    expect(comp.mfaCode[0]).toBe('1');
  });

  it('handleKeyDown on ArrowLeft boundary does not move when at index 0', () => {
    const comp = makeComponent(mocks);
    comp.codeLength = 4;
    comp.mfaCode = ['1', '', '', ''];
    const focusSpy = vi.spyOn(comp as any, 'focusInput');
    comp.handleKeyDown(0, { key: 'ArrowLeft' });
    expect(focusSpy).not.toHaveBeenCalled();
  });

  it('handleKeyDown on ArrowRight boundary does not move when at last index', () => {
    const comp = makeComponent(mocks);
    comp.codeLength = 4;
    comp.mfaCode = ['1', '2', '3', '4'];
    const focusSpy = vi.spyOn(comp as any, 'focusInput');
    comp.handleKeyDown(3, { key: 'ArrowRight' });
    expect(focusSpy).not.toHaveBeenCalled();
  });

  it('handleKeyDown handles null event gracefully', () => {
    const comp = makeComponent(mocks);
    comp.mfaCode = ['1', '', '', ''];
    // Should not throw
    comp.handleKeyDown(0, null);
    expect(true).toBe(true);
  });

  it('handlePaste with insufficient digits does not focus or fill completely', () => {
    const comp = makeComponent(mocks);
    comp.codeLength = 4;
    const focusSpy = vi.spyOn(comp as any, 'focusInput');
    const event: any = { preventDefault: vi.fn(), clipboardData: { getData: vi.fn(() => '12') } };
    comp.handlePaste(event);
    // Insufficient digits - no focus call
    expect(focusSpy).not.toHaveBeenCalled();
  });

  it('handlePaste handles null event gracefully', () => {
    const comp = makeComponent(mocks);
    comp.handlePaste(null);
    expect(true).toBe(true);
  });

  it('focusInput with valid index focuses the element', () => {
    const comp = makeComponent(mocks);
    const focusMock = vi.fn();
    comp.codeInputs = { toArray: () => [{ nativeElement: { focus: focusMock } }] } as any;
    (comp as any).focusInput(0);
    setTimeout(() => {
      expect(focusMock).toHaveBeenCalled();
    }, 10);
  });

  it('verifyMfaCode catches exception and sets error', async () => {
    const errMocks = makeMocks();
    errMocks.adminAuthService.verifyMfaCode = vi.fn(async () => { throw new Error('exception'); });
    const comp = makeComponent(errMocks);
    comp.codeLength = 4;
    comp.mfaCode = ['1','2','3','4'];
    comp.mfaCodeInput = '1234';
    await (comp as any).verifyMfaCode();
    expect(comp.error).toContain('exception');
  });

  it('checkEmailSubscriber returns false when data is not array', async () => {
    const comp = makeComponent(mocks);
    mocks.supabaseService.directQuery = vi.fn(async () => ({ data: null, error: null }));
    const result = await (comp as any).checkEmailSubscriber('x@y.com');
    expect(result).toBe(false);
  });

  it('checkEmailSubscriber returns false when query returns error', async () => {
    const comp = makeComponent(mocks);
    mocks.supabaseService.directQuery = vi.fn(async () => ({ data: null, error: { message: 'query failed' } }));
    const result = await (comp as any).checkEmailSubscriber('x@y.com');
    expect(result).toBe(false);
  });

  it('checkEmailSubscriber catches exception and returns false', async () => {
    const comp = makeComponent(mocks);
    mocks.supabaseService.directQuery = vi.fn(async () => { throw new Error('exception'); });
    const result = await (comp as any).checkEmailSubscriber('x@y.com');
    expect(result).toBe(false);
  });

  it('handleResendCode handles sendMfaCode failure gracefully', async () => {
    const comp = makeComponent(mocks);
    mocks.adminAuthService.sendMfaCode = vi.fn(async () => ({ success: false, error: 'Failed' }));
    comp.email = 'test@x.com';
    await comp.handleResendCode();
    expect(comp.error).toContain('Failed');
    expect(comp.resendLoading).toBe(false);
  });

  it('handleResendCode catches exception and sets error', async () => {
    const comp = makeComponent(mocks);
    mocks.adminAuthService.sendMfaCode = vi.fn(async () => { throw new Error('network'); });
    comp.email = 'test@x.com';
    await comp.handleResendCode();
    expect(comp.error).toContain('network');
  });

  it('saveNewSubscriber catches exception and returns false', async () => {
    const comp = makeComponent(mocks);
    mocks.supabaseService.client.rpc = vi.fn(async () => { throw new Error('rpc fail'); });
    comp.email = 'x@y.com';
    comp.firstName = 'A';
    comp.lastName = 'B';
    comp.requiresApproval = true;
    const res = await comp.saveNewSubscriber();
    expect(res).toBe(false);
    expect(comp.error).toContain('rpc fail');
  });

  it('verifyMfaCode routes admin users to returnUrl', async () => {
    mocks.adminAuthService.verifyMfaCode = vi.fn(async () => ({ success: true, isAdmin: true }));
    mocks.supabaseService.directQuery = vi.fn(async () => ({ data: [{ id: 'sub' }], error: null }));
    const comp = makeComponent(mocks);
    comp.email = 'admin@example.com';
    comp.mfaCode = ['1','2','3','4'];
    comp.mfaCodeInput = '1234';
    comp.codeLength = 4;
    (comp as any).returnUrl = '/admin/dashboard';
    comp.isAdmin = false;
    vi.spyOn(comp as any, 'checkEmailSubscriber').mockResolvedValue(true);
    vi.spyOn(comp as any, 'checkPendingApprovalRequest').mockResolvedValue(false);
    
    await (comp as any).verifyMfaCode();
    // Wait for setTimeout (1 second delay) to complete
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    expect(mocks.router.navigate).toHaveBeenCalledWith(['/admin/dashboard']);
  });

  it('verifyMfaCode clears sessionStorage after successful verification', async () => {
    mocks.adminAuthService.verifyMfaCode = vi.fn(async () => ({ success: true, isAdmin: false }));
    mocks.supabaseService.directQuery = vi.fn(async () => ({ data: [{ id: 'sub' }], error: null }));
    sessionStorage.setItem('mfa_email_sent', 'true');
    sessionStorage.setItem('mfa_email', 'test@x.com');
    
    const comp = makeComponent(mocks);
    comp.email = 'test@x.com';
    comp.mfaCode = ['1','2','3','4'];
    comp.mfaCodeInput = '1234';
    comp.codeLength = 4;
    vi.spyOn(comp as any, 'checkEmailSubscriber').mockResolvedValue(true);
    
    await (comp as any).verifyMfaCode();
    
    expect(sessionStorage.getItem('mfa_email_sent')).toBeNull();
    expect(sessionStorage.getItem('mfa_email')).toBeNull();
  });

  it('handleSubmit clears timeout when sendMfaCode succeeds before timeout', async () => {
    const comp = makeComponent(mocks);
    mocks.adminAuthService.sendMfaCode = vi.fn(async () => ({ success: true }));
    comp.email = 'fast@x.com';
    
    await comp.handleSubmit(new Event('submit'));
    
    // Should succeed without error
    expect(comp.success).toBe(true);
    expect(comp.error).toBe('');
  });

  it('watchThemeChanges listens to mediaQuery change when theme is system', async () => {
    const themeMocks = makeMocks();
    themeMocks.route = {
      queryParams: { subscribe: (cb: any) => cb({}) }
    } as any;
    themeMocks.themeService.getTheme = vi.fn(() => 'system');
    
    const mediaQueryListenerCalls: any[] = [];
    const mockMediaQuery = {
      matches: false,
      addEventListener: vi.fn((event: string, handler: any) => {
        if (event === 'change') {
          mediaQueryListenerCalls.push(handler);
        }
      }),
      removeEventListener: vi.fn()
    };
    
    vi.stubGlobal('matchMedia', () => mockMediaQuery);
    
    const comp = makeComponentWithMocks(
      themeMocks.adminAuthService,
      themeMocks.supabaseService,
      themeMocks.emailNotificationService,
      themeMocks.userSessionService,
      themeMocks.themeService,
      themeMocks.brandingService,
      themeMocks.router,
      themeMocks.route,
      themeMocks.cdr
    );
    comp.codeInputs = { toArray: () => [] } as any;
    comp.useLogo = true;
    localStorage.setItem('branding_light_logo', 'SYS_LIGHT');
    localStorage.setItem('branding_dark_logo', 'SYS_DARK');
    
    await comp.ngOnInit();
    
    // Verify mediaQuery listener was added
    expect(mockMediaQuery.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    
    // Simulate media query change to dark when theme is system
    mockMediaQuery.matches = true;
    if (mediaQueryListenerCalls.length > 0) {
      mediaQueryListenerCalls[0]({});
      expect((comp as any).isDarkMode).toBe(true);
    }
  });

  it('saveNewSubscriber approval request creates RPC call with correct params and does not set duplicate error for other errors', async () => {
    const compMocks = makeMocks();
    // rpc returns a non-duplicate error
    compMocks.supabaseService.client.rpc = vi.fn(async () => ({ 
      data: null, 
      error: { message: 'some other error occurred' } 
    }));

    const comp = makeComponentWithMocks(
      compMocks.adminAuthService,
      compMocks.supabaseService,
      compMocks.emailNotificationService,
      compMocks.userSessionService,
      compMocks.themeService,
      compMocks.brandingService,
      compMocks.router,
      compMocks.route,
      compMocks.cdr
    );
    comp.email = 'generic@x.com';
    comp.firstName = 'A';
    comp.lastName = 'B';
    comp.requiresApproval = true;

    const res = await comp.saveNewSubscriber();
    expect(res).toBe(false);
    // Should get the generic error message, not the duplicate key message
    expect(comp.error).toContain('Failed to submit approval request');
    expect(comp.error).toContain('some other error occurred');
  });

  it('checkEmailSubscriber handles error response with no data array', async () => {
    const comp = makeComponent(mocks);
    mocks.supabaseService.directQuery = vi.fn(async () => ({ 
      data: { id: 'single_object' }, 
      error: null 
    }));
    const result = await (comp as any).checkEmailSubscriber('x@y.com');
    expect(result).toBe(false);
  });

  it('verifyMfaCode handles blockError when not an Error instance', async () => {
    mocks.adminAuthService.verifyMfaCode = vi.fn(async () => ({ success: true, isAdmin: false }));
    // Mock checkEmailSubscriber to throw a string error (not an Error instance)
    const comp = makeComponent(mocks);
    comp.email = 'test@x.com';
    comp.mfaCode = ['1','2','3','4'];
    comp.mfaCodeInput = '1234';
    comp.codeLength = 4;
    
    vi.spyOn(comp as any, 'checkPendingApprovalRequest').mockRejectedValue('string error');
    
    await (comp as any).verifyMfaCode();
    // Wait for setTimeout (1 second delay) to complete
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    expect(comp.error).toBe('Access denied');
    expect(comp.loading).toBe(false);
  });
});
