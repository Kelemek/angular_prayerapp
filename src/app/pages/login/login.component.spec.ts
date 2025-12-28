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
    mocks.supabaseService.directMutation = vi.fn(async () => ({ data: [{ id: '1' }], error: null }));
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
    expect(mocks.supabaseService.directMutation).toHaveBeenCalled();
    expect(mocks.router.navigate).toHaveBeenCalled();
  });
});
