import { Injectable } from "@angular/core";
import { linkAuthSessionAfterVerify } from "../../lib/auth-session-link";
import { MFA_AUTH_RESUME_TOKEN_STORAGE_KEY } from "../../lib/auth-storage-keys";
import { AdminAuthService } from "./admin-auth.service";
import { PlanningCenterRestService } from "./planning-center-rest.service";
import { EmailNotificationService } from "./email-notification.service";
import { SupabaseService } from "./supabase.service";
import { UserSessionService } from "./user-session.service";
import { PrayerGroupService } from "./prayer-group.service";

export type LoginPostVerificationResult =
  | { kind: "pending_approval" }
  | { kind: "show_registration"; requiresApproval: boolean }
  | { kind: "show_group_profile"; destination: string }
  | { kind: "navigate"; destination: string };

export type LoginSaveGroupProfileResult =
  | { kind: "navigate"; destination: string }
  | { kind: "error"; message: string };

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
    private readonly userSessionService: UserSessionService,
    private readonly planningCenterRest: PlanningCenterRestService,
    private readonly prayerGroupService: PrayerGroupService
  ) {}

  async fetchVerificationCodeLength(): Promise<number> {
    try {
      const { data, error } = await (
        await this.supabaseService.from("admin_settings")
      )
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
    await this.adminAuthService.prepareLoginDataAccess(userEmail);

    const subscriber = await this.fetchSubscriber(userEmail);
    const groupOnly = subscriber?.is_church_member === false;
    if (!groupOnly) {
      const hasPendingApproval = await this.hasPendingApprovalRequest(userEmail);
      if (hasPendingApproval) {
        await this.adminAuthService.logout();
        return { kind: "pending_approval" };
      }
    }

    if (!subscriber) {
      const requiresApproval = !(await this.isInPlanningCenter(userEmail));
      return { kind: "show_registration", requiresApproval };
    }

    if (groupOnly && subscriber.church_downgraded_at == null) {
      try {
        const client = await this.supabaseService.getClientWhenReady();
        await client.functions.invoke("upgrade-planning-center-member", { body: {} });
      } catch (upgradeError) {
        console.warn("[AdminLogin] Planning Center upgrade check failed:", upgradeError);
      }
    }

    const groupsFeatureOn = subscriber?.prayer_groups_enabled === true;
    const destination = groupOnly
      ? groupsFeatureOn
        ? "/?filter=groups"
        : "/?filter=personal"
      : this.resolveDestination(returnUrl);

    if (groupOnly && groupsFeatureOn && !(subscriber.name?.trim())) {
      return { kind: "show_group_profile", destination };
    }

    try {
      await this.userSessionService.loadUserSession(userEmail);
    } catch (sessionError) {
      console.warn("[AdminLogin] Failed to load user session:", sessionError);
    }

    return {
      kind: "navigate",
      destination,
    };
  }

  async saveGroupMemberProfile(input: {
    email: string;
    firstName: string;
    lastName: string;
    returnUrl: string;
  }): Promise<LoginSaveGroupProfileResult> {
    const email = input.email.toLowerCase().trim();
    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    if (!firstName || !lastName) {
      return { kind: "error", message: "Please enter your first and last name" };
    }

    try {
      await this.prayerGroupService.completeMemberProfile(firstName, lastName);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not save your profile";
      return { kind: "error", message };
    }

    await this.adminAuthService.prepareLoginDataAccess(email);

    try {
      await this.userSessionService.loadUserSession(email);
    } catch (sessionError) {
      console.warn("[AdminLogin] Failed to load user session:", sessionError);
    }

    const session = this.userSessionService.getCurrentSession();
    const groupsHome =
      session?.prayerGroupsEnabled === true ? "/?filter=groups" : "/?filter=personal";
    const destination =
      input.returnUrl && input.returnUrl !== "/" && input.returnUrl !== "/admin"
        ? input.returnUrl
        : groupsHome;

    return { kind: "navigate", destination };
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
      const { data, error } = await (await this.supabaseService.rpc(
        "create_account_approval_request",
        {
          p_email: email,
          p_first_name: firstName,
          p_last_name: lastName,
          p_affiliation_reason: affiliationReason,
        }
      ));

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

    const resumeToken =
      localStorage.getItem(MFA_AUTH_RESUME_TOKEN_STORAGE_KEY)?.trim() ?? "";
    if (!resumeToken) {
      return {
        kind: "error",
        message:
          "Failed to save subscriber: Sign in again to finish creating your account.",
      };
    }

    const client = this.supabaseService.getClient();
    const { data, error } = await client.functions.invoke(
      "register-planning-center-member",
      {
        body: {
          email,
          firstName,
          lastName,
          auth_resume_token: resumeToken,
        },
      }
    );

    const functionError =
      (typeof data?.error === "string" && data.error) ||
      (error ? error.message || "Unknown error" : "");
    if (functionError) {
      console.error("[AdminLogin] Error saving subscriber:", functionError);
      return {
        kind: "error",
        message: `Failed to save subscriber: ${functionError}`,
      };
    }

    const hashedToken =
      typeof data?.hashed_token === "string" ? data.hashed_token : "";
    if (!hashedToken.trim()) {
      return {
        kind: "error",
        message: "Failed to save subscriber: Could not establish a secure session.",
      };
    }

    const linked = await linkAuthSessionAfterVerify(client, hashedToken);
    if (!linked.ok) {
      return {
        kind: "error",
        message: `Failed to save subscriber: ${linked.error}`,
      };
    }

    await this.adminAuthService.prepareLoginDataAccess(email);

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

  private async fetchSubscriber(email: string): Promise<{
    name?: string | null;
    is_church_member?: boolean | null;
    church_downgraded_at?: string | null;
    is_blocked?: boolean | null;
    prayer_groups_enabled?: boolean | null;
  } | null> {
    try {
      const client = await this.supabaseService.getClientWhenReady();
      const { data, error } = await client
        .from("email_subscribers")
        .select(
          "id, email, name, is_blocked, is_church_member, church_downgraded_at, prayer_groups_enabled",
        )
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (error) {
        console.error("[AdminLogin] Error checking subscriber status:", error);
        return null;
      }

      if (data?.is_blocked) {
        throw new Error(
          "This account has been blocked. Please contact an administrator."
        );
      }

      return data;
    } catch (err) {
      console.error("[AdminLogin] Exception checking subscriber:", err);
      if (err instanceof Error && err.message.includes("blocked")) {
        throw err;
      }
      return null;
    }
  }

  private async hasPendingApprovalRequest(email: string): Promise<boolean> {
    try {
      const { data, error } = await (
        await this.supabaseService.rpc("has_pending_account_approval", {
          p_email: email.toLowerCase(),
        })
      );

      if (error) {
        console.error("[AdminLogin] Error checking pending approval:", error);
        return false;
      }

      return data === true;
    } catch (err) {
      console.error("[AdminLogin] Exception checking pending approval:", err);
      return false;
    }
  }

  private async isInPlanningCenter(email: string): Promise<boolean> {
    const pcResult = await this.planningCenterRest.lookupPersonByEmail(
      email,
      true
    );
    return pcResult.count > 0;
  }
}
