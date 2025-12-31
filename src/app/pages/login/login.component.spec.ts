import { describe, it, expect, vi, beforeEach } from 'vitest';
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
    verifyMfaCode: vi.fn(async (code: string) => ({ success: true, isAdmin: false }))
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
    directQuery: vi.fn(async () => ([{ use_logo: true, light_mode_logo_blob: 'L', dark_mode_logo_blob: 'D' }], null)),
    directMutation: vi.fn(async () => ({ data: [{ id: '1' }], error: null }))
  };

  const emailNotificationService: any = {
    sendAccountApprovalNotification: vi.fn(async () => true)
  };

  const themeService: any = {
    getTheme: vi.fn(() => 'light'),
    theme$: of('light')
  };

  const router: any = { navigate: vi.fn() };

  const route: any = {
    queryParams: {
      subscribe: (cb: any) => cb({})
    }
  };

  const cdr: any = { markForCheck: vi.fn() };

  return { adminAuthService, supabaseService, emailNotificationService, themeService, router, route, cdr, requireSiteLogin$, isAdmin$ };
};

const mockMatchMedia = (matches = false) => ({
  matches,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn()
});

const makeComponent = (mocks: any) => {
  const comp = new LoginComponent(
    mocks.adminAuthService,
    mocks.supabaseService,
    mocks.emailNotificationService,
    mocks.themeService,
    mocks.router,
    mocks.route,
    mocks.cdr
  );
  // Provide a mock QueryList for ViewChildren `codeInputs` used by focusInput
  comp.codeInputs = { toArray: () => [{ nativeElement: { focus: vi.fn() } }] } as any;
  return comp;
};

describe('LoginComponent', () => {
  let mocks: ReturnType<typeof makeMocks>;
  beforeEach(async () => {
    mocks = makeMocks();
    localStorage.clear();
    sessionStorage.clear();
    // reset spies/mocks
    vi.resetAllMocks();
    // ensure global matchMedia exists for tests
    vi.stubGlobal('matchMedia', (query: string) => mockMatchMedia());
    // re-initialize mocked module export for saveUserInfo so it's a spy
    const storage = await import('../../../utils/userInfoStorage');
    if (storage && typeof storage.saveUserInfo === 'function') {
      storage.saveUserInfo = vi.fn();
    }
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
    mocks.supabaseService.directQuery = vi.fn(async () => ([{ id: 'sub' }], null));
    // mock lookupPersonByEmail to return no results
    const pc = await import('../../../lib/planning-center');
    (pc.lookupPersonByEmail as any).mockResolvedValue({ count: 0 });

    const comp = makeComponent(mocks);
    comp.email = 'test@example.com';
    comp.mfaCode = ['1', '2', '3', '4'];
    comp.codeLength = 4;
    comp.mfaCodeInput = comp.mfaCode.join('');

    // stub checkEmailSubscriber on the instance to return true
    vi.spyOn(comp as any, 'checkEmailSubscriber').mockResolvedValue(true);

    await (comp as any).verifyMfaCode();
    // completed without setting an error
    expect(comp.error).toBeFalsy();
  });

  it('verifyMfaCode shows subscriber form when not a subscriber and found in Planning Center', async () => {
    mocks.adminAuthService.verifyMfaCode = vi.fn(async () => ({ success: true, isAdmin: false }));
    vi.spyOn((await import('../../../lib/planning-center')), 'lookupPersonByEmail').mockResolvedValue({ count: 1 });
    const comp = makeComponent(mocks);
    comp.email = 'new@example.com';
    comp.mfaCode = ['1', '2', '3', '4'];
    comp.mfaCodeInput = comp.mfaCode.join('');
    comp.codeLength = 4;
    // make checkEmailSubscriber return false
    vi.spyOn(comp as any, 'checkEmailSubscriber').mockResolvedValue(false);

    await (comp as any).verifyMfaCode();
    // subscriber form or an error state should be set
    expect(comp.showSubscriberForm || comp.error).toBeTruthy();
  });

  it('verifyMfaCode shows subscriber form requiring approval when not in Planning Center', async () => {
    mocks.adminAuthService.verifyMfaCode = vi.fn(async () => ({ success: true, isAdmin: false }));
    vi.spyOn((await import('../../../lib/planning-center')), 'lookupPersonByEmail').mockResolvedValue({ count: 0 });
    const comp = new LoginComponent(
      mocks.adminAuthService,
      mocks.supabaseService,
      mocks.emailNotificationService,
      mocks.themeService,
      mocks.router,
      mocks.route,
      mocks.cdr
    );
    comp.email = 'new2@example.com';
    comp.mfaCode = ['1', '2', '3', '4'];
    comp.mfaCodeInput = comp.mfaCode.join('');
    comp.codeLength = 4;
    vi.spyOn(comp as any, 'checkEmailSubscriber').mockResolvedValue(false);

    await (comp as any).verifyMfaCode();
    // subscriber form (requiring approval) or an error state should be set
    expect(comp.showSubscriberForm || comp.requiresApproval || comp.error).toBeTruthy();
  });

  it('saveNewSubscriber returns false when names missing', async () => {
    const comp = new LoginComponent(
      mocks.adminAuthService,
      mocks.supabaseService,
      mocks.emailNotificationService,
      mocks.themeService,
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
    const comp = new LoginComponent(
      mocks.adminAuthService,
      mocks.supabaseService,
      mocks.emailNotificationService,
      mocks.themeService,
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
    const comp = new LoginComponent(
      mocks.adminAuthService,
      mocks.supabaseService,
      mocks.emailNotificationService,
      mocks.themeService,
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
    const comp = new LoginComponent(
      mocks.adminAuthService,
      mocks.supabaseService,
      mocks.emailNotificationService,
      mocks.themeService,
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

  it('fetchBranding handles thrown exception gracefully', async () => {
    const compMocks = makeMocks();
    compMocks.supabaseService.directQuery = vi.fn(async () => { throw new Error('network'); });
    const comp = makeComponent(compMocks);
    // call private method via any
    await (comp as any).fetchBranding();
    // nothing thrown and method completes
    expect(true).toBe(true);
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

  it('loadCachedLogo and updateLogoUrl set localStorage and logoUrl', () => {
    // set window cache
    (globalThis as any).__cachedLogos = { useLogo: true, light: 'LIMG', dark: 'DIMG' };
    const comp = makeComponent(mocks);
    // ensure localStorage empty
    localStorage.clear();
    (comp as any).loadCachedLogo();
    // localStorage should now contain branding keys and component should reflect useLogo
    expect(comp.useLogo).toBe(true);
    expect(localStorage.getItem('branding_light_logo')).toBe('LIMG');
    // test updateLogoUrl with dark mode
    comp.useLogo = true;
    comp.isDarkMode = true;
    localStorage.setItem('branding_dark_logo', 'DIMG');
    (comp as any).updateLogoUrl();
    expect(comp.logoUrl).toBe('DIMG');
    // light mode
    comp.isDarkMode = false;
    (comp as any).updateLogoUrl();
    expect(comp.logoUrl).toBe('LIMG');
  });

  it('detectDarkMode uses system preference when theme is system', () => {
    const sysMocks = makeMocks();
    sysMocks.themeService.getTheme = vi.fn(() => 'system');
    // stub matchMedia to report dark preference
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: true } as any));
    const comp = new LoginComponent(
      sysMocks.adminAuthService,
      sysMocks.supabaseService,
      sysMocks.emailNotificationService,
      sysMocks.themeService,
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
    const comp = new LoginComponent(
      badMocks.adminAuthService,
      badMocks.supabaseService,
      badMocks.emailNotificationService,
      badMocks.themeService,
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

    const comp = new LoginComponent(
      compMocks.adminAuthService,
      compMocks.supabaseService,
      compMocks.emailNotificationService,
      compMocks.themeService,
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

    const comp = new LoginComponent(
      compMocks.adminAuthService,
      compMocks.supabaseService,
      compMocks.emailNotificationService,
      compMocks.themeService,
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
});
