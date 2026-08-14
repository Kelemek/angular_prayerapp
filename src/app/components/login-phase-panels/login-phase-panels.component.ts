import { Component, Input, ViewChild } from "@angular/core";
import { LoginMfaPanelComponent } from "../login-mfa-panel/login-mfa-panel.component";
import { LoginRegistrationFormComponent } from "../login-registration-form/login-registration-form.component";
import { LoginAccountStatusComponent } from "../login-account-status/login-account-status.component";
import { LoginEmailFormComponent } from "../login-email-form/login-email-form.component";
import type { LoginPhase } from "../../lib/login-phase";
import type { LoginPageShell } from "../../lib/login-page-shell";

@Component({
  selector: "app-login-phase-panels",
  standalone: true,
  imports: [
    LoginMfaPanelComponent,
    LoginRegistrationFormComponent,
    LoginAccountStatusComponent,
    LoginEmailFormComponent,
  ],
  templateUrl: "./login-phase-panels.component.html",
})
export class LoginPhasePanelsComponent {
  @ViewChild(LoginMfaPanelComponent) mfaPanel?: LoginMfaPanelComponent;

  @Input({ required: true }) phase!: LoginPhase;
  @Input({ required: true }) shell!: LoginPageShell;
  @Input() email = "";
  @Input() mfaCodeInput = "";
  @Input() codeLength = 4;
  @Input() loading = false;
  @Input() resendLoading = false;
  @Input() error = "";
  @Input() firstName = "";
  @Input() lastName = "";
  @Input() affiliationReason = "";

  focusMfaInput(): void {
    this.mfaPanel?.focusCodeInput();
  }
}
