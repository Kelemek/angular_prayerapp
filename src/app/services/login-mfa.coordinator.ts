import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import type { LoginPhase } from "../lib/login-phase";
import { AdminAuthService } from "./admin-auth.service";
import { LoginAuthCoordinator } from "./login-auth.coordinator";
import type { LoginPageBindings } from "./login-page-bindings";

const MFA_SESSION_SENT_KEY = "mfa_email_sent";
const MFA_SESSION_EMAIL_KEY = "mfa_email";

@Injectable()
export class LoginMfaCoordinator {
  private host: LoginPageBindings | null = null;

  constructor(
    private readonly adminAuthService: AdminAuthService,
    private readonly loginAuth: LoginAuthCoordinator,
    private readonly router: Router
  ) {}

  bindHost(host: LoginPageBindings): void {
    this.host = host;
  }

  restorePendingSession(): boolean {
    const host = this.requireHost();
    const mfaSent = sessionStorage.getItem(MFA_SESSION_SENT_KEY);
    const savedEmail = sessionStorage.getItem(MFA_SESSION_EMAIL_KEY);
    if (mfaSent !== "true" || !savedEmail) {
      return false;
    }

    host.phase = { kind: "mfa" };
    host.email = savedEmail;
    host.markForCheck();
    return true;
  }

  resetToEmail(): void {
    const host = this.requireHost();
    sessionStorage.removeItem(MFA_SESSION_SENT_KEY);
    sessionStorage.removeItem(MFA_SESSION_EMAIL_KEY);
    host.phase = { kind: "email" };
    host.email = "";
    host.mfaCodeInput = "";
    host.error = "";
    host.firstName = "";
    host.lastName = "";
    host.affiliationReason = "";
    host.markForCheck();
  }

  sanitizeCodeInput(): void {
    const host = this.requireHost();
    host.mfaCodeInput = host.mfaCodeInput
      .replace(/\D/g, "")
      .slice(0, host.codeLength);
    host.markForCheck();
  }

  isCodeComplete(): boolean {
    const host = this.requireHost();
    return host.mfaCodeInput.length === host.codeLength;
  }

  async sendVerificationCode(): Promise<void> {
    const host = this.requireHost();
    host.error = "";
    host.loading = true;
    host.markForCheck();

    try {
      const timeoutId = setTimeout(() => {
        console.warn("[AdminLogin] MFA code request timed out");
        host.loading = false;
        host.error = "Request timed out. Please try again.";
        host.markForCheck();
      }, 15000);

      const result = await this.adminAuthService.sendMfaCode(host.email);
      clearTimeout(timeoutId);

      if (result.success) {
        host.phase = { kind: "mfa" };
        sessionStorage.setItem(MFA_SESSION_SENT_KEY, "true");
        sessionStorage.setItem(MFA_SESSION_EMAIL_KEY, host.email);
      } else {
        host.error =
          result.error || "Failed to send MFA code. Please try again.";
      }
    } catch (err) {
      console.error("[AdminLogin] Exception sending MFA code:", err);
      host.error =
        err instanceof Error
          ? err.message
          : "An error occurred. Please try again.";
    } finally {
      host.loading = false;
      host.markForCheck();
    }
  }

  async verifyCode(): Promise<void> {
    const host = this.requireHost();
    if (host.loading) {
      return;
    }

    host.loading = true;
    host.error = "";
    host.markForCheck();

    try {
      this.sanitizeCodeInput();

      if (!this.isCodeComplete()) {
        host.error = "Please enter the complete code from your email";
        host.loading = false;
        host.markForCheck();
        return;
      }

      const result = await this.adminAuthService.verifyMfaCode(host.mfaCodeInput);

      if (!result.success) {
        host.loading = false;
        host.error = result.error || "Invalid code. Please try again.";
        host.mfaCodeInput = "";
        host.focusMfaInput();
        host.markForCheck();
        return;
      }

      host.isAdmin = result.isAdmin || false;
      const userEmail = host.email;
      sessionStorage.removeItem(MFA_SESSION_SENT_KEY);
      sessionStorage.removeItem(MFA_SESSION_EMAIL_KEY);

      setTimeout(async () => {
        try {
          await this.applyPostVerificationFlow(userEmail);
        } catch (navError) {
          console.error("[AdminLogin] Navigation error:", navError);
          this.applyBlockedOrError(navError);
        }
      }, 1000);
    } catch (err) {
      host.loading = false;
      console.error("[AdminLogin] Exception in verifyMfaCode:", err);
      host.error =
        err instanceof Error
          ? err.message
          : "An error occurred. Please try again.";
      host.markForCheck();
    }
  }

  async resendCode(): Promise<void> {
    const host = this.requireHost();
    host.resendLoading = true;
    host.error = "";
    host.markForCheck();

    try {
      const result = await this.adminAuthService.sendMfaCode(host.email);

      if (result.success) {
        host.mfaCodeInput = "";
        host.error = "";
        host.focusMfaInput();
      } else {
        host.error = result.error || "Failed to resend code. Please try again.";
      }
    } catch (err) {
      console.error("[AdminLogin] Exception in handleResendCode:", err);
      host.error =
        err instanceof Error
          ? err.message
          : "An error occurred. Please try again.";
    } finally {
      host.resendLoading = false;
      host.markForCheck();
    }
  }

  onCodeInput(verify: () => Promise<void>): void {
    this.sanitizeCodeInput();
    const host = this.requireHost();
    if (this.isCodeComplete() && !host.loading) {
      setTimeout(() => {
        void verify();
      }, 0);
    }
  }

  private async applyPostVerificationFlow(userEmail: string): Promise<void> {
    const host = this.requireHost();
    const result = await this.loginAuth.resolvePostVerificationFlow(
      userEmail,
      host.returnUrl
    );

    switch (result.kind) {
      case "pending_approval":
        host.phase = { kind: "pending_approval" };
        host.loading = false;
        host.markForCheck();
        return;
      case "show_registration":
        host.phase = {
          kind: "registration",
          requiresApproval: result.requiresApproval,
        };
        host.loading = false;
        host.markForCheck();
        return;
      case "navigate":
        console.log(
          "[AdminLogin] Routing to:",
          result.destination,
          "(returnUrl:",
          host.returnUrl,
          ")"
        );
        await this.router.navigate([result.destination]);
        return;
      default: {
        const _exhaustive: never = result;
        return _exhaustive;
      }
    }
  }

  applyBlockedOrError(error: unknown): void {
    const host = this.requireHost();
    const errorMsg =
      error instanceof Error ? error.message : "Access denied";
    if (errorMsg.includes("blocked")) {
      host.phase = { kind: "blocked" };
    } else {
      host.error = errorMsg;
    }
    host.loading = false;
    host.markForCheck();
  }

  private requireHost(): LoginPageBindings {
    if (!this.host) {
      throw new Error("LoginMfaCoordinator host is not bound");
    }
    return this.host;
  }
}
