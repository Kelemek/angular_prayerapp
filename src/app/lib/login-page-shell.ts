import type { LoginPageBindings } from "../services/login-page-bindings";
import type { LoginMfaCoordinator } from "../services/login-mfa.coordinator";
import type { LoginAuthCoordinator } from "../services/login-auth.coordinator";
import { loginRequiresApproval } from "./login-phase";
import type { Router } from "@angular/router";

export interface LoginPageShellHandlers {
  submitEmail(event: Event): Promise<void>;
  verifyMfa(): Promise<void>;
  resendMfa(): Promise<void>;
  resetLogin(): void;
  onMfaCodeInput(): void;
  sanitizeMfaCode(): void;
  saveRegistration(): Promise<boolean>;
  setEmail(email: string): void;
  setFirstName(firstName: string): void;
  setLastName(lastName: string): void;
  setAffiliationReason(reason: string): void;
  setMfaCodeInput(code: string): void;
}

export interface LoginPageShell {
  handlers: LoginPageShellHandlers;
  registrationRequiresApproval(): boolean;
  isValidEmail(): boolean;
}

export function createLoginPageShell(deps: {
  page: LoginPageBindings;
  mfa: LoginMfaCoordinator;
  loginAuth: LoginAuthCoordinator;
  router: Router;
}): LoginPageShell {
  const { page, mfa, loginAuth, router } = deps;

  return {
    handlers: {
      submitEmail: async (event) => {
        event.preventDefault();
        if (page.phase.kind === "mfa") {
          await mfa.verifyCode();
          return;
        }
        await mfa.sendVerificationCode();
      },
      verifyMfa: () => mfa.verifyCode(),
      resendMfa: () => mfa.resendCode(),
      resetLogin: () => mfa.resetToEmail(),
      onMfaCodeInput: () => mfa.onCodeInput(() => mfa.verifyCode()),
      sanitizeMfaCode: () => mfa.sanitizeCodeInput(),
      saveRegistration: async () => {
        page.loading = true;
        page.markForCheck();

        try {
          const result = await loginAuth.saveNewSubscriber({
            email: page.email,
            firstName: page.firstName,
            lastName: page.lastName,
            affiliationReason: page.affiliationReason,
            requiresApproval: loginRequiresApproval(page.phase),
            returnUrl: page.returnUrl,
          });

          switch (result.kind) {
            case "error":
              page.error = result.message;
              page.loading = false;
              page.markForCheck();
              return false;
            case "pending_approval":
              page.phase = { kind: "pending_approval" };
              page.loading = false;
              page.markForCheck();
              return true;
            case "navigate":
              page.phase = { kind: "email" };
              page.firstName = "";
              page.lastName = "";
              page.affiliationReason = "";
              page.loading = false;
              await router.navigate([result.destination]);
              return true;
            default: {
              const _exhaustive: never = result;
              return _exhaustive;
            }
          }
        } catch (err) {
          console.error("[AdminLogin] Exception saving subscriber:", err);
          page.error =
            err instanceof Error
              ? err.message
              : "An error occurred. Please try again.";
          page.loading = false;
          page.markForCheck();
          return false;
        }
      },
      setEmail: (email) => {
        page.email = email;
      },
      setFirstName: (firstName) => {
        page.firstName = firstName;
      },
      setLastName: (lastName) => {
        page.lastName = lastName;
      },
      setAffiliationReason: (reason) => {
        page.affiliationReason = reason;
      },
      setMfaCodeInput: (code) => {
        page.mfaCodeInput = code;
      },
    },
    registrationRequiresApproval: () => loginRequiresApproval(page.phase),
    isValidEmail: () => {
      if (!page.email || page.email.trim() === "") {
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(page.email.trim());
    },
  };
}
