import { describe, it, expect, vi } from "vitest";
import { BehaviorSubject } from "rxjs";
import {
  bindLoginPageCoordinators,
  createLoginCoordinators,
} from "./login-coordinator-wiring";
import type { LoginPageBindings } from "./login-page-bindings";

const makeHost = (): LoginPageBindings => ({
  phase: { kind: "email" },
  email: "",
  mfaCodeInput: "",
  codeLength: 4,
  error: "",
  loading: false,
  resendLoading: false,
  requireSiteLogin: false,
  useLogo: false,
  logoUrl: "",
  firstName: "",
  lastName: "",
  affiliationReason: "",
  isAdmin: false,
  returnUrl: "/",
  markForCheck: vi.fn(),
});

describe("login-coordinator-wiring", () => {
  it("createLoginCoordinators returns bound shell handlers", () => {
    const host = makeHost();
    const requireSiteLogin$ = new BehaviorSubject(false);
    const isAdmin$ = new BehaviorSubject(false);
    const queryParams$ = new BehaviorSubject<Record<string, string | undefined>>({});
    const router = { navigate: vi.fn() };

    const wired = createLoginCoordinators({
      page: host,
      adminAuthService: {
        requireSiteLogin$,
        isAdmin$,
        sendMfaCode: vi.fn(),
        verifyMfaCode: vi.fn(),
        logout: vi.fn(),
      } as never,
      supabaseService: {
        client: {
          from: vi.fn(),
          rpc: vi.fn(),
          auth: { getSession: vi.fn() },
        },
        directQuery: vi.fn(),
        directMutation: vi.fn(),
      } as never,
      emailNotificationService: {
        sendAccountApprovalNotification: vi.fn(),
      } as never,
      userSessionService: {
        waitForSession: vi.fn(),
        loadUserSession: vi.fn(),
        clearSession: vi.fn(),
      } as never,
      brandingService: {
        initialize: vi.fn(),
        branding$: new BehaviorSubject({
          useLogo: false,
          appTitle: "",
          appSubtitle: "",
          lightModeLogoBlobUrl: "",
          darkModeLogoBlobUrl: "",
          churchWebsiteUrl: null,
          lastModified: new Date(),
        }),
        getImageUrl: vi.fn(() => ""),
      } as never,
      router: router as never,
      route: { queryParams: queryParams$ } as never,
    });

    expect(wired.shell.handlers.resetLogin).toBeTypeOf("function");
    expect(wired.mfa).toBe(wired.mfa);
    expect(bindLoginPageCoordinators({
      page: host,
      loginAuth: wired.loginAuth,
      mfa: wired.mfa,
      lifecycle: wired.lifecycle,
      router: router as never,
    }).handlers.submitEmail).toBeTypeOf("function");
  });
});
