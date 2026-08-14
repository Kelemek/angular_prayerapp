import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { take } from "rxjs";
import { AdminAuthService } from "./admin-auth.service";
import { ToastService } from "./toast.service";
import { UserSessionService } from "./user-session.service";

@Injectable()
export class HomeAdminNavigationController {
  constructor(
    private readonly adminAuthService: AdminAuthService,
    private readonly router: Router,
    private readonly toastService: ToastService,
    private readonly userSessionService: UserSessionService
  ) {}

  navigateToAdmin(): void {
    this.adminAuthService.isAdmin$.pipe(take(1)).subscribe((isAdmin) => {
      if (isAdmin) {
        this.router.navigate(["/admin"]);
        return;
      }
      this.showAdminMfaModal();
    });
  }

  getUserEmail(): string {
    const cachedEmail = this.userSessionService.getUserEmail();
    if (cachedEmail) return cachedEmail;

    const approvalEmail = localStorage.getItem("approvalAdminEmail");
    if (approvalEmail) return approvalEmail;

    const userEmail = localStorage.getItem("userEmail");
    if (userEmail) return userEmail;

    const prayerappEmail = localStorage.getItem("prayerapp_user_email");
    if (prayerappEmail) return prayerappEmail;

    return "Not logged in";
  }

  private showAdminMfaModal(): void {
    let userEmail = localStorage.getItem("userEmail");
    if (!userEmail) {
      userEmail = localStorage.getItem("prayerapp_user_email");
    }
    if (!userEmail) {
      userEmail = localStorage.getItem("approvalAdminEmail");
    }

    if (!userEmail) {
      this.toastService.error("Email not found. Please log in again.");
      return;
    }

    this.router.navigate(["/login"], {
      queryParams: {
        email: userEmail,
        sessionExpired: true,
      },
    });
  }
}
