import type { ActivatedRoute, Router } from "@angular/router";
import type { LoginPageBindings } from "./login-page-bindings";
import { LoginAuthCoordinator } from "./login-auth.coordinator";
import { LoginMfaCoordinator } from "./login-mfa.coordinator";
import { LoginLifecycleCoordinator } from "./login-lifecycle.coordinator";
import {
  createLoginPageShell,
  type LoginPageShell,
} from "../lib/login-page-shell";

export interface WiredLoginCoordinators {
  loginAuth: LoginAuthCoordinator;
  mfa: LoginMfaCoordinator;
  lifecycle: LoginLifecycleCoordinator;
  shell: LoginPageShell;
}

export function bindLoginPageCoordinators(deps: {
  page: LoginPageBindings;
  loginAuth: LoginAuthCoordinator;
  mfa: LoginMfaCoordinator;
  lifecycle: LoginLifecycleCoordinator;
  router: Router;
}): LoginPageShell {
  deps.mfa.bindHost(deps.page);
  deps.lifecycle.bindHost(deps.page);
  return createLoginPageShell({
    page: deps.page,
    mfa: deps.mfa,
    loginAuth: deps.loginAuth,
    router: deps.router,
  });
}

/** Test / manual construction when Angular DI is not used. */
export function createLoginCoordinators(deps: {
  page: LoginPageBindings;
  adminAuthService: ConstructorParameters<typeof LoginMfaCoordinator>[0];
  supabaseService: ConstructorParameters<typeof LoginAuthCoordinator>[0];
  emailNotificationService: ConstructorParameters<typeof LoginAuthCoordinator>[1];
  userSessionService: ConstructorParameters<typeof LoginAuthCoordinator>[3];
  brandingService: ConstructorParameters<typeof LoginLifecycleCoordinator>[0];
  router: Router;
  route: ActivatedRoute;
}): WiredLoginCoordinators {
  const loginAuth = new LoginAuthCoordinator(
    deps.supabaseService,
    deps.emailNotificationService,
    deps.adminAuthService,
    deps.userSessionService
  );
  const mfa = new LoginMfaCoordinator(
    deps.adminAuthService,
    loginAuth,
    deps.router
  );
  const lifecycle = new LoginLifecycleCoordinator(
    deps.brandingService,
    deps.adminAuthService,
    deps.supabaseService,
    deps.userSessionService,
    loginAuth,
    deps.router,
    deps.route
  );
  const shell = bindLoginPageCoordinators({
    page: deps.page,
    loginAuth,
    mfa,
    lifecycle,
    router: deps.router,
  });
  return { loginAuth, mfa, lifecycle, shell };
}
