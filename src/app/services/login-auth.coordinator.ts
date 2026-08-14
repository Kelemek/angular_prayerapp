import { Injectable } from "@angular/core";
import { lookupPersonByEmail } from "../../lib/planning-center";
import { environment } from "../../environments/environment";
import { AdminAuthService } from "./admin-auth.service";
import { EmailNotificationService } from "./email-notification.service";
import { SupabaseService } from "./supabase.service";
import { UserSessionService } from "./user-session.service";

export type LoginPostVerificationResult =
  | { kind: "pending_approval" }
  | { kind: "show_registration"; requiresApproval: boolean }
  | { kind: "navigate"; destination: string };

export type LoginSaveSubscriberResult =
  | { kind: "pending_approval" }
  | { kind: "navigate"; destination: string }
  | { kind: "error"; message: string };

export interface LoginSaveSubscriberInput {
  email: string;
  firstName: string;
  lastName: string;
  affiliationReason: string;
  requiresApproval: boolean;
  returnUrl: string;
}

@Injectable()
export class LoginAuthCoordinator {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly emailNotificationService: EmailNotificationService,
    private readonly adminAuthService: AdminAuthService,
    private readonly userSessionService: UserSessionService
  ) {}

  async fetchVerificationCodeLength(): Promise<number> {
    try {
      const { data, error } = await this.supabaseService.client
        .from("admin_settings")
        .select("verification_code_length")
        .eq("id", 1)
        .maybeSingle();

      if (!error && data?.verification_code_length) {
        return data.verification_code_length;
      }
    } catch (err) {
      console.error("[AdminLogin] Error fetching code length:", err);
    }
    return 4;
  }

  async resolvePostVerificationFlow(
    userEmail: string,
    returnUrl: string
  ): Promise<LoginPostVerificationResult> {
    const hasPendingApproval = await this.hasPendingApprovalRequest(userEmail);
    if (hasPendingApproval) {
      await this.adminAuthService.logout();
      return { kind: "pending_approval" };
    }

    const isSubscriber = await this.isEmailSubscriber(userEmail);
    if (!isSubscriber) {
      const requiresApproval = !(await this.isInPlanningCenter(userEmail));
      return { kind: "show_registration", requiresApproval };
    }

    try {
      await this.userSessionService.loadUserSession(userEmail);
    } catch (sessionError) {
      console.warn("[AdminLogin] Failed to load user session:", sessionError);
    }

    return {
      kind: "navigate",
      destination: this.resolveDestination(returnUrl),
    };
  }

  async saveNewSubscriber(
    input: LoginSaveSubscriberInput
  ): Promise<LoginSaveSubscriberResult> {
    const email = input.email.toLowerCase().trim();
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    const affiliationReason = input.affiliationReason.trim();

    if (!firstName || !lastName) {
      return { kind: "error", message: "Please enter your first and last name" };
    }

    if (input.requiresApproval) {
      const { data, error } = await this.supabaseService.client.rpc(
        "create_account_approval_request",
        {
          p_email: email,
          p_first_name: firstName,
          p_last_name: lastName,
          p_affiliation_reason: affiliationReason,
        }
      );

      if (error) {
        console.error("[AdminLogin] Error creating approval request:", error);
        if (
          error.message?.includes("duplicate key") ||
          error.message?.includes("unique constraint")
        ) {
          return {
            kind: "error",
            message:
              "An approval request already exists for this email address. Please check your email or contact an administrator.",
          };
        }
        return {
          kind: "error",
          message: `Failed to submit approval request: ${
            error.message || "Unknown error"
          }`,
        };
      }

      console.log("[AdminLogin] Approval request created with ID:", data);

      try {
        await this.emailNotificationService.sendAccountApprovalNotification(
          email,
          firstName,
          lastName,
          affiliationReason
        );
      } catch (emailError) {
        console.error(
          "[AdminLogin] Failed to send admin notification:",
          emailError
        );
      }

      await this.adminAuthService.logout();
      return { kind: "pending_approval" };
    }

    const { error } = await this.supabaseService.directMutation<{ id: string }>(
      "email_subscribers",
      {
        method: "POST",
        body: {
          email,
          name: `${firstName} ${lastName}`,
          is_active: true,
          is_admin: false,
          receive_admin_emails: false,
          in_planning_center: true,
          planning_center_checked_at: new Date().toISOString(),
        },
        returning: true,
      }
    );

    if (error) {
      console.error("[AdminLogin] Error saving subscriber:", error);
      return {
        kind: "error",
        message: `Failed to save subscriber: ${error.message || "Unknown error"}`,
      };
    }

    try {
      await this.emailNotificationService.sendSubscriberWelcomeNotification(
        email
      );
    } catch (emailError) {
      console.error("[AdminLogin] Failed to send welcome email:", emailError);
    }

    try {
      await this.userSessionService.loadUserSession(email);
    } catch (sessionError) {
      console.warn("[AdminLogin] Failed to load user session:", sessionError);
    }

    return {
      kind: "navigate",
      destination: this.resolveDestination(input.returnUrl),
    };
  }

  resolveDestination(returnUrl: string): string {
    return returnUrl && returnUrl !== "/" && returnUrl !== "/admin"
      ? returnUrl
      : "/";
  }

  private async isEmailSubscriber(email: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabaseService.directQuery<{
        id: string;
        email: string;
        is_blocked: boolean;
      }>("email_subscribers", {
        select: "id, email, is_blocked",
        eq: { email: email.toLowerCase() },
        limit: 1,
      });

      if (error) {
        console.error("[AdminLogin] Error checking subscriber status:", error);
        return false;
      }

      const isSubscriber = data && Array.isArray(data) && data.length > 0;
      if (isSubscriber && data[0]?.is_blocked) {
        throw new Error(
          "This account has been blocked. Please contact an administrator."
        );
      }

      return isSubscriber || false;
    } catch (err) {
      console.error("[AdminLogin] Exception checking subscriber:", err);
      if (err instanceof Error && err.message.includes("blocked")) {
        throw err;
      }
      return false;
    }
  }

  private async hasPendingApprovalRequest(email: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabaseService.directQuery<{
        id: string;
        approval_status: string;
      }>("account_approval_requests", {
        select: "id, approval_status",
        eq: { email: email.toLowerCase(), approval_status: "pending" },
        limit: 1,
      });

      if (error) {
        console.error("[AdminLogin] Error checking pending approval:", error);
        return false;
      }

      return !!(data && Array.isArray(data) && data.length > 0);
    } catch (err) {
      console.error("[AdminLogin] Exception checking pending approval:", err);
      return false;
    }
  }

  private async isInPlanningCenter(email: string): Promise<boolean> {
    const pcResult = await lookupPersonByEmail(
      email,
      environment.supabaseUrl,
      environment.supabaseAnonKey
    );
    return pcResult.count > 0;
  }
}
