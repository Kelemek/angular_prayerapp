import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { LoginMfaCoordinator } from "./login-mfa.coordinator";
import { LoginAuthCoordinator } from "./login-auth.coordinator";
import type { LoginPageBindings } from "./login-page-bindings";

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
  returnUrl: "/",
  isAdmin: false,
  markForCheck: vi.fn(),
  focusMfaInput: vi.fn(),
});

const makeCoordinator = () => {
  const adminAuthService = {
    sendMfaCode: vi.fn(async () => ({ success: true })),
    verifyMfaCode: vi.fn(async () => ({ success: true, isAdmin: false })),
  };
  const loginAuth = {
    resolvePostVerificationFlow: vi.fn(async () => ({
      kind: "navigate" as const,
      destination: "/",
    })),
  };
  const router = { navigate: vi.fn(async () => true) };
  const coordinator = new LoginMfaCoordinator(
    adminAuthService as any,
    loginAuth as unknown as LoginAuthCoordinator,
    router as any
  );
  const host = makeHost();
  coordinator.bindHost(host);
  return { coordinator, host, adminAuthService, loginAuth, router };
};

describe("LoginMfaCoordinator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("restorePendingSession returns false when session keys are missing", () => {
    const { coordinator } = makeCoordinator();
    expect(coordinator.restorePendingSession()).toBe(false);
  });

  it("restorePendingSession restores MFA phase from sessionStorage", () => {
    const { coordinator, host } = makeCoordinator();
    sessionStorage.setItem("mfa_email_sent", "true");
    sessionStorage.setItem("mfa_email", "user@example.com");

    expect(coordinator.restorePendingSession()).toBe(true);
    expect(host.phase).toEqual({ kind: "mfa" });
    expect(host.email).toBe("user@example.com");
    expect(host.markForCheck).toHaveBeenCalled();
  });

  it("resetToEmail clears session and form state", () => {
    const { coordinator, host } = makeCoordinator();
    sessionStorage.setItem("mfa_email_sent", "true");
    sessionStorage.setItem("mfa_email", "a@b.com");
    host.phase = { kind: "mfa" };
    host.email = "a@b.com";
    host.mfaCodeInput = "1234";
    host.error = "err";

    coordinator.resetToEmail();

    expect(sessionStorage.getItem("mfa_email_sent")).toBeNull();
    expect(host.phase).toEqual({ kind: "email" });
    expect(host.email).toBe("");
    expect(host.mfaCodeInput).toBe("");
    expect(host.error).toBe("");
  });

  it("sanitizeCodeInput strips non-digits and caps length", () => {
    const { coordinator, host } = makeCoordinator();
    host.codeLength = 4;
    host.mfaCodeInput = "12ab3456";

    coordinator.sanitizeCodeInput();

    expect(host.mfaCodeInput).toBe("1234");
  });

  it("sendVerificationCode stores session and moves to MFA phase on success", async () => {
    const { coordinator, host, adminAuthService } = makeCoordinator();
    host.email = "user@example.com";

    await coordinator.sendVerificationCode();

    expect(adminAuthService.sendMfaCode).toHaveBeenCalledWith("user@example.com");
    expect(host.phase).toEqual({ kind: "mfa" });
    expect(sessionStorage.getItem("mfa_email_sent")).toBe("true");
    expect(sessionStorage.getItem("mfa_email")).toBe("user@example.com");
    expect(host.loading).toBe(false);
  });

  it("sendVerificationCode sets error when send fails", async () => {
    const { coordinator, host, adminAuthService } = makeCoordinator();
    adminAuthService.sendMfaCode = vi.fn(async () => ({
      success: false,
      error: "smtp down",
    }));
    host.email = "user@example.com";

    await coordinator.sendVerificationCode();

    expect(host.error).toBe("smtp down");
    expect(host.phase).toEqual({ kind: "email" });
  });

  it("verifyCode rejects incomplete codes without calling admin auth", async () => {
    const { coordinator, host, adminAuthService } = makeCoordinator();
    host.mfaCodeInput = "12";
    host.codeLength = 4;

    await coordinator.verifyCode();

    expect(adminAuthService.verifyMfaCode).not.toHaveBeenCalled();
    expect(host.error).toContain("complete code");
  });

  it("verifyCode navigates after successful verification", async () => {
    vi.useFakeTimers();
    const { coordinator, host, router, loginAuth } = makeCoordinator();
    host.email = "user@example.com";
    host.mfaCodeInput = "1234";
    host.codeLength = 4;
    sessionStorage.setItem("mfa_email_sent", "true");
    sessionStorage.setItem("mfa_email", "user@example.com");

    const verifyPromise = coordinator.verifyCode();
    await vi.advanceTimersByTimeAsync(1000);
    await verifyPromise;

    expect(sessionStorage.getItem("mfa_email_sent")).toBeNull();
    expect(loginAuth.resolvePostVerificationFlow).toHaveBeenCalledWith(
      "user@example.com",
      "/"
    );
    expect(router.navigate).toHaveBeenCalledWith(["/"]);
  });

  it("verifyCode shows registration phase from post-verify flow", async () => {
    vi.useFakeTimers();
    const { coordinator, host, loginAuth } = makeCoordinator();
    loginAuth.resolvePostVerificationFlow = vi.fn(async () => ({
      kind: "show_registration",
      requiresApproval: true,
    }));
    host.email = "new@example.com";
    host.mfaCodeInput = "1234";
    host.codeLength = 4;

    const verifyPromise = coordinator.verifyCode();
    await vi.advanceTimersByTimeAsync(1000);
    await verifyPromise;

    expect(host.phase).toEqual({
      kind: "registration",
      requiresApproval: true,
    });
    expect(host.loading).toBe(false);
  });

  it("applyBlockedOrError sets blocked phase when message includes blocked", () => {
    const { coordinator, host } = makeCoordinator();
    host.loading = true;

    coordinator.applyBlockedOrError(new Error("User is blocked"));

    expect(host.phase).toEqual({ kind: "blocked" });
    expect(host.loading).toBe(false);
  });

  it("onCodeInput triggers verify when code is complete and not loading", async () => {
    vi.useFakeTimers();
    const { coordinator, host } = makeCoordinator();
    const verifySpy = vi.spyOn(coordinator, "verifyCode").mockResolvedValue();
    host.mfaCodeInput = "1234";
    host.codeLength = 4;

    coordinator.onCodeInput(() => coordinator.verifyCode());
    await vi.advanceTimersByTimeAsync(0);

    expect(verifySpy).toHaveBeenCalled();
  });

  it("onCodeInput does not verify while loading", async () => {
    const { coordinator, host } = makeCoordinator();
    const verifySpy = vi.spyOn(coordinator, "verifyCode").mockResolvedValue();
    host.mfaCodeInput = "1234";
    host.codeLength = 4;
    host.loading = true;

    coordinator.onCodeInput(() => coordinator.verifyCode());

    expect(verifySpy).not.toHaveBeenCalled();
  });

  it("verifyCode handles verification failure and refocuses input", async () => {
    const { coordinator, host, adminAuthService } = makeCoordinator();
    adminAuthService.verifyMfaCode = vi.fn(async () => ({
      success: false,
      error: "invalid",
    }));
    host.mfaCodeInput = "1234";
    host.codeLength = 4;

    await coordinator.verifyCode();

    expect(host.error).toContain("invalid");
    expect(host.focusMfaInput).toHaveBeenCalled();
    expect(host.loading).toBe(false);
  });

  it("verifyCode catches verify exceptions", async () => {
    const { coordinator, host, adminAuthService } = makeCoordinator();
    adminAuthService.verifyMfaCode = vi.fn(async () => {
      throw new Error("exception");
    });
    host.mfaCodeInput = "1234";
    host.codeLength = 4;

    await coordinator.verifyCode();

    expect(host.error).toContain("exception");
    expect(host.loading).toBe(false);
  });

  it("applyBlockedOrError uses Access denied for non-Error values", () => {
    const { coordinator, host } = makeCoordinator();
    coordinator.applyBlockedOrError("string error");
    expect(host.error).toBe("Access denied");
  });

  it("resendCode clears code and refocuses on success", async () => {
    const { coordinator, host } = makeCoordinator();
    host.email = "user@example.com";
    host.mfaCodeInput = "1234";

    await coordinator.resendCode();

    expect(host.mfaCodeInput).toBe("");
    expect(host.focusMfaInput).toHaveBeenCalled();
    expect(host.resendLoading).toBe(false);
  });

  it("resendCode surfaces send failures", async () => {
    const { coordinator, host, adminAuthService } = makeCoordinator();
    adminAuthService.sendMfaCode = vi.fn(async () => ({
      success: false,
      error: "Failed",
    }));
    host.email = "test@x.com";

    await coordinator.resendCode();

    expect(host.error).toContain("Failed");
    expect(host.resendLoading).toBe(false);
  });

  it("resendCode catches exceptions", async () => {
    const { coordinator, host, adminAuthService } = makeCoordinator();
    adminAuthService.sendMfaCode = vi.fn(async () => {
      throw new Error("network");
    });
    host.email = "test@x.com";

    await coordinator.resendCode();

    expect(host.error).toContain("network");
  });
});
