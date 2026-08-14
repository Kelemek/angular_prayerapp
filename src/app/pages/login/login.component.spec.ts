import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  authFor,
  cleanupLoginComponents,
  makeComponent,
  makeMocks,
  mockMatchMedia,
  resetLoginComponentCleanup,
} from './login.component.spec-helpers';

vi.mock('../../../utils/userInfoStorage', () => ({ saveUserInfo: vi.fn() }));
vi.mock('../../../lib/planning-center', () => ({ lookupPersonByEmail: vi.fn() }));

describe('LoginComponent', () => {
  let mocks: ReturnType<typeof makeMocks>;

  beforeEach(() => {
    vi.resetAllMocks();
    mocks = makeMocks();
    localStorage.clear();
    sessionStorage.clear();
    vi.stubGlobal('matchMedia', () => mockMatchMedia());
    resetLoginComponentCleanup();
  });

  afterEach(() => {
    cleanupLoginComponents();
  });

  it('ngOnInit initializes branding and verification code length', async () => {
    const comp = makeComponent(mocks);
    await comp.ngOnInit();
    expect(mocks.brandingService.initialize).toHaveBeenCalled();
    expect(comp.codeLength).toBe(6);
  });

  it('shell isValidEmail validates email input', () => {
    const comp = makeComponent(mocks);
    comp.email = '';
    expect(comp.shell.isValidEmail()).toBe(false);
    comp.email = 'not-an-email';
    expect(comp.shell.isValidEmail()).toBe(false);
    comp.email = 'test@example.com';
    expect(comp.shell.isValidEmail()).toBe(true);
  });

  it('shell handlers submitEmail stores MFA session on success', async () => {
    const comp = makeComponent(mocks);
    comp.email = 'u@e.com';
    await comp.shell.handlers.submitEmail(new Event('submit'));
    expect(sessionStorage.getItem('mfa_email_sent')).toBe('true');
    expect(sessionStorage.getItem('mfa_email')).toBe('u@e.com');
    expect(comp.phase.kind).toBe('mfa');
  });

  it('shell handlers sanitizeMfaCode strips non-digits', () => {
    const comp = makeComponent(mocks);
    comp.codeLength = 4;
    comp.mfaCodeInput = 'a1b2c3';
    comp.shell.handlers.sanitizeMfaCode();
    expect(comp.mfaCodeInput).toBe('123');
  });

  it('shell handlers resetLogin clears MFA session and form state', () => {
    const comp = makeComponent(mocks);
    sessionStorage.setItem('mfa_email_sent', 'true');
    sessionStorage.setItem('mfa_email', 'a@b.com');
    comp.phase = { kind: 'mfa' };
    comp.email = 'a@b.com';
    comp.error = 'err';
    comp.shell.handlers.resetLogin();
    expect(sessionStorage.getItem('mfa_email_sent')).toBeNull();
    expect(comp.phase.kind).toBe('email');
    expect(comp.email).toBe('');
    expect(comp.error).toBe('');
  });

  it('shell saveRegistration maps pending approval result to phase', async () => {
    const comp = makeComponent(mocks);
    comp.email = 'x@y.com';
    comp.firstName = 'A';
    comp.lastName = 'B';
    comp.phase = { kind: 'registration', requiresApproval: true };
    vi.spyOn(authFor(comp), 'saveNewSubscriber').mockResolvedValue({
      kind: 'pending_approval',
    });

    const result = await comp.shell.handlers.saveRegistration();

    expect(result).toBe(true);
    expect(comp.phase.kind).toBe('pending_approval');
  });

  it('shell saveRegistration maps coordinator errors to page error', async () => {
    const comp = makeComponent(mocks);
    comp.email = 'x@y.com';
    comp.firstName = 'A';
    comp.lastName = 'B';
    comp.phase = { kind: 'registration', requiresApproval: true };
    vi.spyOn(authFor(comp), 'saveNewSubscriber').mockResolvedValue({
      kind: 'error',
      message: 'Failed to save subscriber: Insert failed',
    });

    const result = await comp.shell.handlers.saveRegistration();

    expect(result).toBe(false);
    expect(comp.error).toContain('Failed to save subscriber');
  });

  it('ngOnDestroy completes destroy$', () => {
    const comp = makeComponent(mocks);
    const nextSpy = vi.spyOn((comp as unknown as { destroy$: { next: () => void } }).destroy$, 'next');
    const completeSpy = vi.spyOn(
      (comp as unknown as { destroy$: { complete: () => void } }).destroy$,
      'complete'
    );
    comp.ngOnDestroy();
    expect(nextSpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });
});
