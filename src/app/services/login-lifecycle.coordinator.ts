import { Injectable } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Subject, takeUntil } from "rxjs";
import type { LoginPhase } from "../lib/login-phase";
import { AdminAuthService } from "./admin-auth.service";
import { BrandingService } from "./branding.service";
import { LoginAuthCoordinator } from "./login-auth.coordinator";
import type { LoginPageBindings } from "./login-page-bindings";
import type { LoginMfaCoordinator } from "./login-mfa.coordinator";
import { SupabaseService } from "./supabase.service";
import { UserSessionService } from "./user-session.service";

@Injectable()
export class LoginLifecycleCoordinator {
  private host: LoginPageBindings | null = null;

  constructor(
    private readonly brandingService: BrandingService,
    private readonly adminAuthService: AdminAuthService,
    private readonly supabaseService: SupabaseService,
    private readonly userSessionService: UserSessionService,
    private readonly loginAuth: LoginAuthCoordinator,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  bindHost(host: LoginPageBindings): void {
    this.host = host;
  }

  async initialize(
    destroy$: Subject<void>,
    mfa: LoginMfaCoordinator,
    focusMfa: () => void
  ): Promise<void> {
    const host = this.requireHost();

    await this.brandingService.initialize();
    this.brandingService.branding$
      .pipe(takeUntil(destroy$))
      .subscribe((branding) => {
        host.useLogo = branding.useLogo;
        host.logoUrl = this.brandingService.getImageUrl(branding);
        host.markForCheck();
      });

    this.route.queryParams.pipe(takeUntil(destroy$)).subscribe((params) => {
      host.returnUrl = params["returnUrl"] || "/";

      if (params["email"]) {
        host.email = params["email"];
      }

      if (params["sessionExpired"] === "true") {
        host.error =
          "Your admin session has expired. Please re-authenticate with MFA.";
      }

      if (params["blocked"] === "true") {
        host.phase = { kind: "blocked" };
      }
    });

    this.adminAuthService.requireSiteLogin$
      .pipe(takeUntil(destroy$))
      .subscribe((requireSiteLogin) => {
        host.requireSiteLogin = requireSiteLogin;
        host.markForCheck();
      });

    host.codeLength = await this.loginAuth.fetchVerificationCodeLength();

    if (mfa.restorePendingSession()) {
      setTimeout(() => focusMfa(), 100);
    }

    this.adminAuthService.isAdmin$
      .pipe(takeUntil(destroy$))
      .subscribe(async (isAdmin) => {
        if (!isAdmin) {
          return;
        }

        try {
          const {
            data: { session },
          } = await this.supabaseService.client.auth.getSession();
          const email = session?.user?.email;
          if (email) {
            await this.userSessionService.loadUserSession(email);
          }
        } catch (sessionError) {
          console.warn("[AdminLogin] Failed to load user session:", sessionError);
        }
        await this.router.navigate(["/"]);
      });
  }

  private requireHost(): LoginPageBindings {
    if (!this.host) {
      throw new Error("LoginLifecycleCoordinator host is not bound");
    }
    return this.host;
  }
}
