import { Component, Input } from "@angular/core";

export type LoginAccountStatus = "pending_approval" | "blocked";

@Component({
  selector: "app-login-account-status",
  standalone: true,
  templateUrl: "./login-account-status.component.html",
})
export class LoginAccountStatusComponent {
  @Input({ required: true }) status!: LoginAccountStatus;
}
