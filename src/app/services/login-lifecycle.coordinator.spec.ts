import { describe, it, expect, vi, beforeEach } from "vitest";
import { BehaviorSubject, Subject } from "rxjs";
import { LoginLifecycleCoordinator } from "./login-lifecycle.coordinator";
import { LoginAuthCoordinator } from "./login-auth.coordinator";
import type { LoginPageBindings } from "./login-page-bindings";
import type { LoginMfaCoordinator } from "./login-mfa.coordinator";

const makeHost = (): LoginPageBindings & { markForCheck: ReturnType<typeof vi.fn> } => ({
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

describe("LoginLifecycleCoordinator", () => {
  let host: ReturnType<typeof makeHost>;
  let brandingService: {
    initialize: ReturnType<typeof vi.fn>;
    branding$: BehaviorSubject<{
      useLogo: boolean;
      appTitle: string;
      appSubtitle: string;
      lightModeLogoBlobUrl: string;
      darkModeLogoBlobUrl: string;
      churchWebsiteUrl: null;
      lastModified: Date;
    }>;
    getImageUrl: ReturnType<typeof vi.fn>;
  };
  let adminAuthService: {
    requireSiteLogin$: BehaviorSubject<boolean>;
    isAdmin$: BehaviorSubject<boolean>;
  };
  let supabaseService: {
    client: {
      auth: {
        getSession: ReturnType<typeof vi.fn>;
      };
    };
  };
  let userSessionService: {
    loadUserSession: ReturnType<typeof vi.fn>;
  };
  let loginAuth: {
    fetchVerificationCodeLength: ReturnType<typeof vi.fn>;
  };
  let router: { navigate: ReturnType<typeof vi.fn> };
  let route: { queryParams: BehaviorSubject<Record<string, string | undefined>> };
  let lifecycle: LoginLifecycleCoordinator;
  let destroy$: Subject<void>;
  let mfa: { restorePendingSession: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    host = makeHost();
    brandingService = {
      initialize: vi.fn(async () => {}),
      branding$: new BehaviorSubject({
        useLogo: true,
        appTitle: "Test",
        appSubtitle: "Subtitle",
        lightModeLogoBlobUrl: "light",
        darkModeLogoBlobUrl: "dark",
        churchWebsiteUrl: null,
        lastModified: new Date(),
      }),
      getImageUrl: vi.fn(() => "logo-url"),
    };
    adminAuthService = {
      requireSiteLogin$: new BehaviorSubject(false),
      isAdmin$: new BehaviorSubject(false),
    };
    supabaseService = {
      client: {
        auth: {
          getSession: vi.fn(async () => ({
            data: { session: { user: { email: "admin@test.com" } } },
          })),
        },
      },
    };
    userSessionService = {
      loadUserSession: vi.fn(async () => {}),
    };
    loginAuth = {
      fetchVerificationCodeLength: vi.fn(async () => 6),
    };
    router = { navigate: vi.fn() };
    route = {
      queryParams: new BehaviorSubject<Record<string, string | undefined>>({}),
    };
    lifecycle = new LoginLifecycleCoordinator(
      brandingService as never,
      adminAuthService as never,
      supabaseService as never,
      userSessionService as never,
      loginAuth as unknown as LoginAuthCoordinator,
      router as never,
      route as never
    );
    lifecycle.bindHost(host);
    destroy$ = new Subject<void>();
    mfa = { restorePendingSession: vi.fn(() => false) };
  });

  it("throws when host is not bound", async () => {
    const unbound = new LoginLifecycleCoordinator(
      brandingService as never,
      adminAuthService as never,
      supabaseService as never,
      userSessionService as never,
      loginAuth as unknown as LoginAuthCoordinator,
      router as never,
      route as never
    );
    await expect(
      unbound.initialize(destroy$, mfa as unknown as LoginMfaCoordinator, vi.fn())
    ).rejects.toThrow("LoginLifecycleCoordinator host is not bound");
  });

  it("initializes branding and verification code length", async () => {
    await lifecycle.initialize(destroy$, mfa as unknown as LoginMfaCoordinator, vi.fn());

    expect(brandingService.initialize).toHaveBeenCalled();
    expect(host.codeLength).toBe(6);
    expect(host.useLogo).toBe(true);
    expect(host.logoUrl).toBe("logo-url");
    expect(host.markForCheck).toHaveBeenCalled();
  });

  it("applies query params for returnUrl, email, sessionExpired, and blocked", async () => {
    route.queryParams.next({
      returnUrl: "/admin",
      email: "user@test.com",
      sessionExpired: "true",
      blocked: "true",
    });

    await lifecycle.initialize(destroy$, mfa as unknown as LoginMfaCoordinator, vi.fn());

    expect(host.returnUrl).toBe("/admin");
    expect(host.email).toBe("user@test.com");
    expect(host.error).toContain("expired");
    expect(host.phase).toEqual({ kind: "blocked" });
  });

  it("redirects admins after loading session", async () => {
    adminAuthService.isAdmin$.next(true);

    await lifecycle.initialize(destroy$, mfa as unknown as LoginMfaCoordinator, vi.fn());
    await vi.waitFor(() => {
      expect(userSessionService.loadUserSession).toHaveBeenCalledWith("admin@test.com");
      expect(router.navigate).toHaveBeenCalledWith(["/"]);
    });
  });

  it("focuses MFA input when a pending session is restored", async () => {
    vi.useFakeTimers();
    mfa.restorePendingSession.mockReturnValue(true);
    const focusMfa = vi.fn();

    await lifecycle.initialize(destroy$, mfa as unknown as LoginMfaCoordinator, focusMfa);
    vi.advanceTimersByTime(100);

    expect(focusMfa).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("updates requireSiteLogin when observable emits", async () => {
    await lifecycle.initialize(destroy$, mfa as unknown as LoginMfaCoordinator, vi.fn());
    expect(host.requireSiteLogin).toBe(false);
    adminAuthService.requireSiteLogin$.next(true);
    expect(host.requireSiteLogin).toBe(true);
    expect(host.markForCheck).toHaveBeenCalled();
  });

  it("defaults code length to 4 when admin settings are missing", async () => {
    loginAuth.fetchVerificationCodeLength = vi.fn(async () => 4);
    await lifecycle.initialize(destroy$, mfa as unknown as LoginMfaCoordinator, vi.fn());
    expect(host.codeLength).toBe(4);
  });
});
