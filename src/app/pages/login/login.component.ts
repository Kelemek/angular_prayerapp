import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ViewChild,
  ChangeDetectionStrategy,
} from "@angular/core";
import { Router, ActivatedRoute } from "@angular/router";
import { AdminAuthService } from "../../services/admin-auth.service";
import { SupabaseService } from "../../services/supabase.service";
import { UserSessionService } from "../../services/user-session.service";
import { BrandingService } from "../../services/branding.service";
import { LoginAuthCoordinator } from "../../services/login-auth.coordinator";
import { LoginMfaCoordinator } from "../../services/login-mfa.coordinator";
import { LoginLifecycleCoordinator } from "../../services/login-lifecycle.coordinator";
import { LoginPageLayoutComponent } from "../../components/login-page-layout/login-page-layout.component";
import { LoginHeaderComponent } from "../../components/login-header/login-header.component";
import { LoginPhasePanelsComponent } from "../../components/login-phase-panels/login-phase-panels.component";
import type { LoginPhase } from "../../lib/login-phase";
import type { LoginPageShell } from "../../lib/login-page-shell";
import { bindLoginPageCoordinators } from "../../services/login-coordinator-wiring";
import { Subject } from "rxjs";

@Component({
  selector: "app-login",
  standalone: true,
  imports: [LoginPageLayoutComponent, LoginHeaderComponent, LoginPhasePanelsComponent],
  providers: [
    LoginAuthCoordinator,
    LoginMfaCoordinator,
    LoginLifecycleCoordinator,
  ],
  templateUrl: "./login.component.html",
  styleUrl: "./login.component.css",
  changeDetection: ChangeDetectionStrategy.Eager,
})
export class LoginComponent implements OnInit, OnDestroy {
  @ViewChild(LoginPhasePanelsComponent) phasePanels?: LoginPhasePanelsComponent;

  phase: LoginPhase = { kind: "email" };
  email = "";
  mfaCodeInput = "";
  codeLength = 4;
  error = "";
  loading = false;
  resendLoading = false;
  requireSiteLogin = false;
  useLogo = false;
  logoUrl = "";
  firstName = "";
  lastName = "";
  affiliationReason = "";
  isAdmin = false;
  returnUrl = "/";

  readonly shell: LoginPageShell;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private adminAuthService: AdminAuthService,
    private supabaseService: SupabaseService,
    private userSessionService: UserSessionService,
    private brandingService: BrandingService,
    private readonly loginAuth: LoginAuthCoordinator,
    private readonly mfa: LoginMfaCoordinator,
    private readonly lifecycle: LoginLifecycleCoordinator,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {
    this.shell = bindLoginPageCoordinators({
      page: this,
      loginAuth: this.loginAuth,
      mfa: this.mfa,
      lifecycle: this.lifecycle,
      router: this.router,
    });
  }

  async ngOnInit(): Promise<void> {
    await this.lifecycle.initialize(
      this.destroy$,
      this.mfa,
      () => this.focusMfaInput()
    );
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  markForCheck(): void {
    this.cdr.markForCheck();
  }

  focusMfaInput(): void {
    this.phasePanels?.focusMfaInput();
  }
}
