import type { LoginPhase } from "../lib/login-phase";

export interface LoginPageBindings {
  phase: LoginPhase;
  email: string;
  mfaCodeInput: string;
  codeLength: number;
  error: string;
  loading: boolean;
  resendLoading: boolean;
  requireSiteLogin: boolean;
  useLogo: boolean;
  logoUrl: string;
  firstName: string;
  lastName: string;
  affiliationReason: string;
  returnUrl: string;
  isAdmin: boolean;
  markForCheck(): void;
  focusMfaInput(): void;
}
