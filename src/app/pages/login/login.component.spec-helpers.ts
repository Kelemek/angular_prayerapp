import { vi } from "vitest";
import { BehaviorSubject } from "rxjs";
import { LoginComponent } from "./login.component";
import { LoginAuthCoordinator } from "../../services/login-auth.coordinator";
import { LoginMfaCoordinator } from "../../services/login-mfa.coordinator";
import { LoginLifecycleCoordinator } from "../../services/login-lifecycle.coordinator";
import { createLoginCoordinators } from "../../services/login-coordinator-wiring";
import type { LoginPageBindings } from "../../services/login-page-bindings";

export const makeMocks = () => {
  const requireSiteLogin$ = new BehaviorSubject(false);
  const isAdmin$ = new BehaviorSubject(false);

  const adminAuthService: any = {
    requireSiteLogin$,
    isAdmin$,
    sendMfaCode: vi.fn(async () => ({ success: true })),
    verifyMfaCode: vi.fn(async () => ({ success: true, isAdmin: false })),
    logout: vi.fn(async () => {}),
  };

  const supabaseService: any = {
    client: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({
              data: { verification_code_length: 6 },
              error: null,
            })),
          })),
        })),
      })),
      rpc: vi.fn(async () => ({ data: "ok", error: null })),
    },
    directQuery: vi.fn(async () => ({
      data: [
        {
          use_logo: true,
          light_mode_logo_blob: "LIGHT_URL",
          dark_mode_logo_blob: "DARK_URL",
        },
      ],
      error: null,
    })),
    directMutation: vi.fn(async () => ({ data: [{ id: "1" }], error: null })),
  };

  const emailNotificationService: any = {
    sendAccountApprovalNotification: vi.fn(async () => true),
  };

  const userSessionService: any = {
    waitForSession: vi.fn(async () => ({})),
    loadUserSession: vi.fn(async () => {}),
    clearSession: vi.fn(),
  };

  const brandingService: any = {
    initialize: vi.fn(async () => {}),
    branding$: new BehaviorSubject({
      useLogo: true,
      appTitle: "Test Church",
      appSubtitle: "Test Subtitle",
      lightModeLogoBlobUrl: "LIGHT_URL",
      darkModeLogoBlobUrl: "DARK_URL",
      churchWebsiteUrl: null,
      lastModified: new Date(),
    }),
    getImageUrl: vi.fn((branding) => (branding.useLogo ? "LIGHT_URL" : "")),
  };

  const queryParams$ = new BehaviorSubject<Record<string, string | undefined>>(
    {}
  );
  const router: any = { navigate: vi.fn() };
  const route: any = { queryParams: queryParams$ };
  const cdr: any = { markForCheck: vi.fn() };

  return {
    adminAuthService,
    supabaseService,
    emailNotificationService,
    userSessionService,
    brandingService,
    router,
    route,
    cdr,
    requireSiteLogin$,
    isAdmin$,
    queryParams$,
  };
};

export type LoginTestMocks = ReturnType<typeof makeMocks>;

export const mockMatchMedia = (matches = false) => ({
  matches,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
});

export const mockPhasePanels = (focusMfaInput = vi.fn()) =>
  ({ focusMfaInput }) as unknown as LoginComponent["phasePanels"];

let componentsToCleanup: LoginComponent[] = [];

export const resetLoginComponentCleanup = () => {
  componentsToCleanup = [];
};

export const cleanupLoginComponents = () => {
  for (const comp of componentsToCleanup) {
    try {
      (comp as { ngOnDestroy?: () => void }).ngOnDestroy?.();
    } catch {
      // Ignore errors during cleanup
    }
  }
  componentsToCleanup = [];
};

export const authFor = (comp: LoginComponent) =>
  (comp as unknown as { loginAuth: LoginAuthCoordinator }).loginAuth;

export const mfaFor = (comp: LoginComponent) =>
  (comp as unknown as { mfa: LoginMfaCoordinator }).mfa;

export const lifecycleFor = (comp: LoginComponent) =>
  (comp as unknown as { lifecycle: LoginLifecycleCoordinator }).lifecycle;

export const makeComponentWithMocks = (
  adminAuth: LoginTestMocks["adminAuthService"],
  supabase: LoginTestMocks["supabaseService"],
  emailNotif: LoginTestMocks["emailNotificationService"],
  userSession: LoginTestMocks["userSessionService"],
  branding: LoginTestMocks["brandingService"],
  router: LoginTestMocks["router"],
  route: LoginTestMocks["route"],
  cdr: LoginTestMocks["cdr"]
) => {
  const pageStub = {} as LoginPageBindings;
  const { loginAuth, mfa, lifecycle } = createLoginCoordinators({
    page: pageStub,
    adminAuthService: adminAuth,
    supabaseService: supabase,
    emailNotificationService: emailNotif,
    userSessionService: userSession,
    brandingService: branding,
    router,
    route,
  });
  const comp = new LoginComponent(
    adminAuth,
    supabase,
    userSession,
    branding,
    loginAuth,
    mfa,
    lifecycle,
    router,
    route,
    cdr
  );
  comp.phasePanels = mockPhasePanels();
  componentsToCleanup.push(comp);
  return comp;
};

export const makeComponent = (mocks: LoginTestMocks) =>
  makeComponentWithMocks(
    mocks.adminAuthService,
    mocks.supabaseService,
    mocks.emailNotificationService,
    mocks.userSessionService,
    mocks.brandingService,
    mocks.router,
    mocks.route,
    mocks.cdr
  );
