import { Injectable } from "@angular/core";
import { environment } from "../../environments/environment";
import {
  htmlToPlainText,
  markdownToPlainText,
  markdownToSafeHtml,
  sanitizeEmailHtml,
} from "../../utils/markdown";
import { adminNotificationPushBody } from "../lib/email-notification-admin-push";
import {
  sendAccountApprovalNotificationToEmail as deliverAccountApprovalNotificationEmail,
  sendAdminItemNotificationToEmail as deliverAdminItemNotificationEmail,
} from "../lib/email-notification-admin-mail";
import {
  filterManualBroadcastRecipientEmails,
  normalizeTestAccountEmail,
} from "../lib/email-notification-broadcast";
import {
  generateDeniedPrayerHTML,
  generateDeniedUpdateHTML,
  generateRequesterApprovalHTML,
  generateUpdateAuthorApprovalHTML,
  generateVerseMemorizationPrayerHTML,
  generateWelcomeEmailHTML,
} from "../lib/email-notification-html";
import {
  buildAppHomeLink,
  buildMemorizeVerseAppLink,
  buildSubscriberAppLink,
  buildViewPrayerAppLink,
  resolveEmailBaseUrl,
} from "../lib/email-notification-links";
import {
  applyEmailTemplateVariables,
  stringifyEmailTemplateVariables,
} from "../lib/email-notification-template";
import {
  ADMIN_SUBSCRIBER_MANUAL_BROADCAST_TEMPLATE_KEY,
  type AdminNotificationPayload,
  type ApprovedPrayerPayload,
  type ApprovedUpdatePayload,
  type DeniedPrayerPayload,
  type DeniedUpdatePayload,
  type EmailTemplate,
  type RequesterApprovalPayload,
  type SendEmailOptions,
  type UpdateAuthorApprovalPayload,
  type VerseMemorizationPrayerPayload,
} from "../lib/email-notification-types";
import { PushNotificationService } from "./push-notification.service";
import { SupabaseService } from "./supabase.service";

export {
  ADMIN_SUBSCRIBER_MANUAL_BROADCAST_TEMPLATE_KEY,
  type AdminNotificationPayload,
  type ApprovedPrayerPayload,
  type ApprovedUpdatePayload,
  type DeniedPrayerPayload,
  type DeniedUpdatePayload,
  type EmailTemplate,
  type RequesterApprovalPayload,
  type SendEmailOptions,
  type UpdateAuthorApprovalPayload,
} from "../lib/email-notification-types";

@Injectable({
  providedIn: "root",
})
export class EmailNotificationService {
  constructor(
    private supabase: SupabaseService,
    private pushNotification: PushNotificationService
  ) {}

  /**
   * Base URL for links in emails. Website (browser): uses current origin.
   * Native app (Capacitor): origin can be capacitor://localhost or https://localhost (Android),
   * so we use environment.appUrl when origin is localhost or non-http(s) so links always point to the real web app.
   */
  getEmailBaseUrl(): string {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return resolveEmailBaseUrl({
      origin,
      appUrl:
        typeof environment !== "undefined" ? environment.appUrl : undefined,
    });
  }

  /**
   * Send a single email using Supabase edge function
   */
  async sendEmail(options: SendEmailOptions): Promise<void> {
    const { data, error } = await this.supabase.client.functions.invoke(
      "send-email",
      {
        body: {
          to: options.to,
          subject: options.subject,
          htmlBody: options.htmlBody,
          textBody: options.textBody,
          replyTo: options.replyTo,
          fromName: options.fromName,
        },
      }
    );

    if (error) {
      console.error("Failed to send email:", error);
      throw new Error(error.message || "Failed to send email");
    }

    if (!data?.success) {
      throw new Error(data?.error || "Failed to send email");
    }
  }

  /**
   * Get email template by key
   */
  async getTemplate(templateKey: string): Promise<EmailTemplate | null> {
    const { data, error } = await this.supabase.client
      .from("email_templates")
      .select("*")
      .eq("template_key", templateKey)
      .single();

    if (error) {
      console.error("Error fetching template:", error);
      return null;
    }

    return data;
  }

  /**
   * Apply template variables to a string with {{variableName}} syntax
   */
  applyTemplateVariables(
    content: string,
    variables: Record<string, string>
  ): string {
    return applyEmailTemplateVariables(content, variables);
  }

  /**
   * Queue an email for processing by the email queue system
   * Used for bulk notifications to improve deliverability
   */
  async enqueueEmail(
    recipient: string,
    templateKey: string,
    variables: Record<string, string | null | undefined> = {}
  ): Promise<void> {
    const stringifiedVariables = stringifyEmailTemplateVariables(variables);

    const { error } = await this.supabase.client.from("email_queue").insert({
      recipient,
      template_key: templateKey,
      template_variables: stringifiedVariables,
      status: "pending",
      attempts: 0,
    });

    if (error) {
      console.error("Failed to enqueue email:", error);
      throw new Error(error.message || "Failed to enqueue email");
    }

    console.log(
      `📧 Email queued for ${recipient} with template ${templateKey}`
    );
  }

  /**
   * Trigger email processor workflow via Supabase Edge Function
   */
  private async triggerEmailProcessor(): Promise<void> {
    try {
      console.log("🚀 Triggering email processor via Edge Function...");

      const response = await this.supabase.client.functions.invoke(
        "trigger-email-processor",
        {
          method: "POST",
        }
      );

      if (response.error) {
        console.error("❌ Edge Function error:", response.error);
        return;
      }

      console.log("📊 Edge Function response:", response.data);
      console.log("✅ Email processor workflow triggered successfully");
    } catch (error) {
      console.error(
        "❌ Failed to trigger email processor:",
        error instanceof Error ? error.message : error
      );
    }
  }

  /**
   * Send email to all active subscribers
   */
  async sendEmailToAllSubscribers(options: {
    subject: string;
    htmlBody?: string;
    textBody?: string;
    replyTo?: string;
    fromName?: string;
  }): Promise<void> {
    const { data, error } = await this.supabase.client.functions.invoke(
      "send-email",
      {
        body: {
          action: "send_to_all_subscribers",
          subject: options.subject,
          htmlBody: options.htmlBody,
          textBody: options.textBody,
          replyTo: options.replyTo,
          fromName: options.fromName,
        },
      }
    );

    if (error) {
      console.error("Failed to send bulk email:", error);
      throw new Error(error.message || "Failed to send bulk email");
    }

    if (!data?.success) {
      throw new Error(data?.error || "Failed to send bulk email");
    }
  }

  /**
   * Tester email from Admin → Security → Test Account (excluded from manual subscriber broadcasts).
   */
  private async getConfiguredTestAccountEmailLower(): Promise<string | null> {
    const { data, error } = await this.supabase.client
      .from("admin_settings")
      .select("test_account_email")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error(
        "Failed to load test_account_email for broadcast exclusion:",
        error
      );
      return null;
    }
    return normalizeTestAccountEmail(data?.test_account_email);
  }

  /**
   * Non-blocked subscriber emails for the admin manual broadcast, excluding the configured app test account.
   */
  async getManualBroadcastRecipientEmails(): Promise<string[]> {
    const excludeLower = await this.getConfiguredTestAccountEmailLower();
    const { data: rows, error } = await this.supabase.client
      .from("email_subscribers")
      .select("email")
      .eq("is_blocked", false);

    if (error) {
      throw error;
    }
    if (!rows?.length) {
      return [];
    }
    return filterManualBroadcastRecipientEmails(
      rows.map((r: { email: string }) => r.email),
      excludeLower
    );
  }

  /** Count of recipients that would receive `queueAdminManualBroadcastToSubscribers`. */
  async getManualBroadcastRecipientCount(): Promise<number> {
    const emails = await this.getManualBroadcastRecipientEmails();
    return emails.length;
  }

  /**
   * Queue one email per non-blocked subscriber (ignores mass-email opt-out / is_active).
   * Uses the same email_queue + process-email-queue pipeline as prayer/update notifications.
   * Excludes `admin_settings.test_account_email` when set (Admin → Security → Test Account).
   */
  async queueAdminManualBroadcastToSubscribers(options: {
    subject: string;
    /** TipTap / Markdown body (converted with markdownToSafeHtml). */
    bodyMarkdown?: string;
    /** Pasted HTML body (sanitized with sanitizeEmailHtml). Prefer for marketing emails with screenshots. */
    bodyHtml?: string;
  }): Promise<{ queued: number }> {
    const broadcastSubject = options.subject.trim();
    const bodyMarkdown = options.bodyMarkdown?.trim() ?? "";
    const bodyHtmlRaw = options.bodyHtml?.trim() ?? "";
    if (!broadcastSubject) {
      throw new Error("Subject is required");
    }
    if (!bodyMarkdown && !bodyHtmlRaw) {
      throw new Error("Message body is required");
    }
    if (bodyMarkdown && bodyHtmlRaw) {
      throw new Error("Provide either Markdown or HTML body, not both");
    }

    const broadcastBodyHtml = bodyHtmlRaw
      ? sanitizeEmailHtml(bodyHtmlRaw)
      : markdownToSafeHtml(bodyMarkdown);
    const broadcastBodyText = bodyHtmlRaw
      ? htmlToPlainText(bodyHtmlRaw)
      : markdownToPlainText(bodyMarkdown);
    if (!broadcastBodyHtml.trim()) {
      throw new Error("Message body is empty after sanitization");
    }

    const variables = {
      broadcastSubject,
      broadcastBodyHtml,
      broadcastBodyText,
    };

    const recipientEmails = await this.getManualBroadcastRecipientEmails();

    if (recipientEmails.length === 0) {
      return { queued: 0 };
    }

    const queuePromises = recipientEmails.map((email) =>
      this.enqueueEmail(
        email,
        ADMIN_SUBSCRIBER_MANUAL_BROADCAST_TEMPLATE_KEY,
        variables
      ).catch((err) =>
        console.error(`Failed to queue admin broadcast for ${email}:`, err)
      )
    );

    await Promise.all(queuePromises);

    console.log(
      `📧 Queued admin manual broadcast to ${recipientEmails.length} subscriber(s)`
    );

    await this.triggerEmailProcessor().catch((err) =>
      console.error("Failed to trigger email processor:", err)
    );

    return { queued: recipientEmails.length };
  }

  private async queueTemplateToActiveSubscribers(
    templateKey: string,
    variables: Record<string, string | null | undefined>,
    logLabel: string
  ): Promise<void> {
    const { data: subscribers, error: fetchError } = await this.supabase.client
      .from("email_subscribers")
      .select("email")
      .eq("is_active", true)
      .eq("is_blocked", false);

    if (fetchError) {
      throw fetchError;
    }

    if (!subscribers || subscribers.length === 0) {
      console.log("No active subscribers to notify");
      return;
    }

    const queuePromises = subscribers.map((sub) =>
      this.enqueueEmail(sub.email, templateKey, variables).catch((err) =>
        console.error(`Failed to queue email for ${sub.email}:`, err)
      )
    );

    await Promise.all(queuePromises);
    console.log(`📧 Queued ${logLabel} to ${subscribers.length} subscriber(s)`);

    await this.triggerEmailProcessor().catch((err) =>
      console.error("Failed to trigger email processor:", err)
    );
  }

  /**
   * Send notification when a prayer is approved
   * Queues emails to all active subscribers for processing
   */
  async sendApprovedPrayerNotification(
    payload: ApprovedPrayerPayload
  ): Promise<void> {
    try {
      const isAnswered = payload.status === "answered";
      const templateKey = isAnswered ? "prayer_answered" : "approved_prayer";
      const appLink = buildSubscriberAppLink(
        this.getEmailBaseUrl(),
        payload.status
      );
      await this.queueTemplateToActiveSubscribers(
        templateKey,
        {
          prayerTitle: payload.title,
          prayerFor: payload.prayerFor,
          requesterName: payload.requester,
          prayerDescription: payload.description,
          prayerDescriptionText: markdownToPlainText(payload.description),
          prayerDescriptionHtml: markdownToSafeHtml(payload.description),
          status: payload.status,
          appLink,
        },
        "approved prayer notification"
      );
    } catch (error) {
      console.error("Error in sendApprovedPrayerNotification:", error);
      // Don't re-throw - let the error be logged but don't block approval
    }
  }

  /**
   * Send notification when a prayer update is approved
   * Queues emails to all active subscribers for processing
   */
  async sendApprovedUpdateNotification(
    payload: ApprovedUpdatePayload
  ): Promise<void> {
    try {
      const isAnswered = payload.markedAsAnswered || false;
      const templateKey = isAnswered ? "prayer_answered" : "approved_update";
      const appLink = buildSubscriberAppLink(
        this.getEmailBaseUrl(),
        payload.prayerStatus
      );
      await this.queueTemplateToActiveSubscribers(
        templateKey,
        {
          prayerTitle: payload.prayerTitle,
          prayerDescription: payload.prayerDescription,
          prayerDescriptionText: markdownToPlainText(payload.prayerDescription),
          prayerDescriptionHtml: markdownToSafeHtml(payload.prayerDescription),
          authorName: payload.author,
          updateContent: payload.content,
          updateContentText: markdownToPlainText(payload.content),
          updateContentHtml: markdownToSafeHtml(payload.content),
          prayerStatus: payload.prayerStatus ?? "current",
          appLink,
        },
        "approved update notification"
      );
    } catch (error) {
      console.error("Error in sendApprovedUpdateNotification:", error);
    }
  }

  /**
   * Broadcast when admin sends a verse memorization prayer (immediate, no approval queue).
   */
  async sendVerseMemorizationPrayerNotification(
    payload: VerseMemorizationPrayerPayload
  ): Promise<void> {
    try {
      const baseUrl = this.getEmailBaseUrl();
      const memorizeAppLink = buildMemorizeVerseAppLink(
        baseUrl,
        payload.verseReference,
        payload.verseTranslation
      );
      const viewPrayerAppLink = buildViewPrayerAppLink(baseUrl, payload.prayerId);
      const adminMessageTrimmed = payload.adminMessage?.trim() ?? "";
      const adminMessageBlock = adminMessageTrimmed
        ? `<div style="background-color:#ffffff;padding:15px;border-radius:6px;border-left:4px solid #C9A961;margin-bottom:16px;">${markdownToSafeHtml(adminMessageTrimmed)}</div>`
        : "";

      await this.queueTemplateToActiveSubscribers(
        "verse_memorization_prayer",
        {
          verseReference: payload.verseReference,
          verseTextHtml: markdownToSafeHtml(payload.verseText),
          verseTextText: markdownToPlainText(payload.verseText),
          adminMessageBlock,
          memorizeAppLink,
          viewPrayerAppLink,
        },
        "verse memorization prayer notification"
      );
    } catch (error) {
      console.error("Error in sendVerseMemorizationPrayerNotification:", error);
    }
  }

  /**
   * Send notification to requester when their prayer is approved
   */
  async sendRequesterApprovalNotification(
    payload: RequesterApprovalPayload
  ): Promise<void> {
    try {
      if (!payload.requesterEmail) {
        console.warn("No email address for prayer requester");
        return;
      }

      let subject: string;
      let body: string;
      let html: string;

      try {
        const template = await this.getTemplate("requester_approval");
        if (template) {
          const textVariables = {
            prayerTitle: payload.title,
            prayerFor: payload.prayerFor,
            prayerDescription: markdownToPlainText(payload.description),
            appLink: buildAppHomeLink(this.getEmailBaseUrl()),
          };
          const htmlVariables = {
            ...textVariables,
            prayerDescription: markdownToSafeHtml(payload.description),
          };
          console.log(
            "[EmailNotificationService.sendRequesterApprovalNotification] Template variables:",
            textVariables
          );
          console.log(
            "[EmailNotificationService.sendRequesterApprovalNotification] Template HTML before substitution:",
            template.html_body.substring(0, 200)
          );
          subject = this.applyTemplateVariables(
            template.subject,
            textVariables
          );
          body = this.applyTemplateVariables(template.text_body, textVariables);
          html = this.applyTemplateVariables(template.html_body, htmlVariables);
          console.log(
            "[EmailNotificationService.sendRequesterApprovalNotification] HTML after substitution contains prayerFor:",
            html.includes(payload.prayerFor)
          );
        } else {
          throw new Error("Template not found");
        }
      } catch (error) {
        console.warn(
          "Failed to load requester_approval template, using fallback:",
          error
        );
        subject = `Your Prayer Request Has Been Approved: ${payload.title}`;
        body = `Great news! Your prayer request has been approved and is now live on the prayer app.\n\nTitle: ${payload.title}\nFor: ${payload.prayerFor}\n\nYour prayer is now being lifted up by our community. You will receive updates via email when the prayer status changes or when updates are posted.`;
        html = generateRequesterApprovalHTML(payload, this.getEmailBaseUrl());
        console.log(
          "[EmailNotificationService.sendRequesterApprovalNotification] Using fallback HTML, html contains prayerFor:",
          html.includes(payload.prayerFor)
        );
      }

      await this.sendEmail({
        to: [payload.requesterEmail],
        subject,
        textBody: body,
        htmlBody: html,
      });
    } catch (error) {
      console.error("Error in sendRequesterApprovalNotification:", error);
    }
  }

  /**
   * Send notification when a prayer is denied
   */
  async sendDeniedPrayerNotification(
    payload: DeniedPrayerPayload
  ): Promise<void> {
    try {
      if (!payload.requesterEmail) {
        console.warn("No email address for denied prayer requester");
        return;
      }

      let subject = `Prayer Request Not Approved: ${payload.title}`;
      let body = `Unfortunately, your prayer request could not be approved at this time.\n\nTitle: ${payload.title}\nRequested by: ${payload.requester}\n\nReason: ${payload.denialReason}\n\nIf you have questions, please contact the administrator.`;
      let html = generateDeniedPrayerHTML(payload, this.getEmailBaseUrl());

      try {
        const template = await this.getTemplate("denied_prayer");
        if (template) {
          const textVariables = {
            prayerTitle: payload.title,
            prayerDescription: markdownToPlainText(payload.description),
            denialReason: payload.denialReason,
            appLink: buildAppHomeLink(this.getEmailBaseUrl()),
          };
          const htmlVariables = {
            ...textVariables,
            prayerDescription: markdownToSafeHtml(payload.description),
          };
          subject = this.applyTemplateVariables(
            template.subject,
            textVariables
          );
          body = this.applyTemplateVariables(template.text_body, textVariables);
          html = this.applyTemplateVariables(template.html_body, htmlVariables);
        }
      } catch (templateError) {
        console.warn(
          "Failed to fetch denied_prayer template, using fallback:",
          templateError
        );
      }

      await this.sendEmail({
        to: [payload.requesterEmail],
        subject,
        textBody: body,
        htmlBody: html,
      });
    } catch (error) {
      console.error("Error in sendDeniedPrayerNotification:", error);
    }
  }

  /**
   * Send notification when an update is denied
   */
  async sendDeniedUpdateNotification(
    payload: DeniedUpdatePayload
  ): Promise<void> {
    try {
      if (!payload.authorEmail) {
        console.warn("No email address for denied update author");
        return;
      }

      let subject = `Prayer Update Not Approved: ${payload.prayerTitle}`;
      let body = `Unfortunately, your update for "${payload.prayerTitle}" could not be approved at this time.\n\nUpdate by: ${payload.author}\n\nReason: ${payload.denialReason}\n\nIf you have questions, please contact the administrator.`;
      let html = generateDeniedUpdateHTML(payload, this.getEmailBaseUrl());

      try {
        const template = await this.getTemplate("denied_update");
        if (template) {
          const textVariables = {
            prayerTitle: payload.prayerTitle,
            updateContent: markdownToPlainText(payload.content),
            denialReason: payload.denialReason,
            appLink: buildAppHomeLink(this.getEmailBaseUrl()),
          };
          const htmlVariables = {
            ...textVariables,
            updateContent: markdownToSafeHtml(payload.content),
          };
          subject = this.applyTemplateVariables(
            template.subject,
            textVariables
          );
          body = this.applyTemplateVariables(template.text_body, textVariables);
          html = this.applyTemplateVariables(template.html_body, htmlVariables);
        }
      } catch (templateError) {
        console.warn(
          "Failed to fetch denied_update template, using fallback:",
          templateError
        );
      }

      await this.sendEmail({
        to: [payload.authorEmail],
        subject,
        textBody: body,
        htmlBody: html,
      });
    } catch (error) {
      console.error("Error in sendDeniedUpdateNotification:", error);
    }
  }

  /**
   * Send notification to update author when their update is approved
   */
  async sendUpdateAuthorApprovalNotification(
    payload: UpdateAuthorApprovalPayload
  ): Promise<void> {
    try {
      if (!payload.authorEmail) {
        console.warn("No email address for update author");
        return;
      }

      let subject: string;
      let body: string;
      let html: string;

      try {
        const template = await this.getTemplate("update_author_approval");
        if (template) {
          const textVariables = {
            prayerTitle: payload.prayerTitle,
            updateContent: markdownToPlainText(payload.content),
            author: payload.author,
            appLink: buildAppHomeLink(this.getEmailBaseUrl()),
          };
          const htmlVariables = {
            ...textVariables,
            updateContent: markdownToSafeHtml(payload.content),
          };
          subject = this.applyTemplateVariables(
            template.subject,
            textVariables
          );
          body = this.applyTemplateVariables(template.text_body, textVariables);
          html = this.applyTemplateVariables(template.html_body, htmlVariables);
        } else {
          throw new Error("Template not found");
        }
      } catch (error) {
        console.warn(
          "Failed to load update_author_approval template, using fallback:",
          error
        );
        subject = `Your Update Has Been Approved: ${payload.prayerTitle}`;
        body = `Great news! Your update for "${
          payload.prayerTitle
        }" has been approved and is now live on the prayer app.\n\nUpdate: ${markdownToPlainText(
          payload.content
        )}\n\nThank you for keeping our community updated!`;
        html = generateUpdateAuthorApprovalHTML(
          payload,
          this.getEmailBaseUrl()
        );
      }

      await this.sendEmail({
        to: [payload.authorEmail],
        subject,
        textBody: body,
        htmlBody: html,
      });
    } catch (error) {
      console.error("Error in sendUpdateAuthorApprovalNotification:", error);
    }
  }

  /**
   * Send notification to admins when new items need approval
   * Sends individual emails to each admin with personalized approval links
   */
  async sendAdminNotification(
    payload: AdminNotificationPayload
  ): Promise<void> {
    try {
      // Get admin emails from email_subscribers table (receive_admin_emails only; not tied to is_active)
      const { data: admins, error: adminsError } = await this.supabase.client
        .from("email_subscribers")
        .select("email")
        .eq("is_admin", true)
        .eq("receive_admin_emails", true);

      if (adminsError) {
        console.error("Error fetching admin emails:", adminsError);
        return;
      }

      if (!admins || admins.length === 0) {
        console.warn(
          "No admins configured to receive notifications. Please enable admin email notifications in Admin User Management."
        );
        return;
      }

      const adminEmails = admins.map((admin) => admin.email);

      // Send individual emails to each admin
      for (const adminEmail of adminEmails) {
        await this.sendAdminNotificationToEmail(payload, adminEmail);
      }

      // Send push to admins who have receive_admin_push enabled (best-effort)
      try {
        const body = adminNotificationPushBody(payload);
        await this.pushNotification.sendPushToAdmins({
          title: payload.title,
          body,
          data: {
            type: payload.type,
            ...(payload.requestId && { requestId: payload.requestId }),
          },
        });
      } catch (pushErr) {
        console.error("Error sending admin push notification:", pushErr);
      }
    } catch (error) {
      console.error("Error in sendAdminNotification:", error);
      // Don't throw - we don't want email failures to break the app
    }
  }

  /**
   * Send account approval request notification to all admins
   */
  async sendAccountApprovalNotification(
    email: string,
    firstName: string,
    lastName: string,
    affiliationReason?: string
  ): Promise<void> {
    try {
      // Get all admin emails (receive_admin_emails only; not tied to is_active)
      const { data: admins, error: adminsError } =
        await this.supabase.directQuery<{ email: string }>(
          "email_subscribers",
          {
            select: "email",
            eq: { is_admin: true, receive_admin_emails: true },
          }
        );

      if (
        adminsError ||
        !admins ||
        !Array.isArray(admins) ||
        admins.length === 0
      ) {
        console.error(
          "No admins found for account approval notification:",
          adminsError
        );
        return;
      }

      // Send notification to each admin
      for (const admin of admins) {
        await this.sendAccountApprovalNotificationToEmail(
          email,
          firstName,
          lastName,
          affiliationReason || "",
          admin.email
        );
      }

      // Send push to admins who have receive_admin_push enabled (best-effort)
      try {
        await this.pushNotification.sendPushToAdmins({
          title: "Account approval request",
          body: `${firstName} ${lastName} (${email})`,
          data: { type: "account_approval_request" },
        });
      } catch (pushErr) {
        console.error(
          "Error sending admin push for account approval:",
          pushErr
        );
      }
    } catch (error) {
      console.error("Error in sendAccountApprovalNotification:", error);
      // Don't throw - we don't want email failures to break the app
    }
  }

  private mailDeps() {
    return {
      getTemplate: (templateKey: string) => this.getTemplate(templateKey),
      sendEmail: (options: SendEmailOptions) => this.sendEmail(options),
      getEmailBaseUrl: () => this.getEmailBaseUrl(),
    };
  }

  /**
   * Send account approval notification to a single admin
   */
  private async sendAccountApprovalNotificationToEmail(
    email: string,
    firstName: string,
    lastName: string,
    affiliationReason: string,
    adminEmail: string
  ): Promise<void> {
    await deliverAccountApprovalNotificationEmail(
      this.mailDeps(),
      email,
      firstName,
      lastName,
      affiliationReason,
      adminEmail
    );
  }

  /**
   * Send notification to a single admin with personalized approval link
   */
  private async sendAdminNotificationToEmail(
    payload: AdminNotificationPayload,
    adminEmail: string
  ): Promise<void> {
    await deliverAdminItemNotificationEmail(
      this.mailDeps(),
      payload,
      adminEmail
    );
  }

  /**
   * Send welcome email to a new subscriber
   */
  async sendSubscriberWelcomeNotification(email: string): Promise<void> {
    try {
      if (!email) {
        console.warn(
          "No email address provided for subscriber welcome notification"
        );
        return;
      }

      const template = await this.getTemplate("subscriber_welcome");
      let subject: string;
      let htmlContent: string;
      let textContent: string;

      if (template) {
        const variables = {
          appLink: buildAppHomeLink(this.getEmailBaseUrl()),
        };
        subject = this.applyTemplateVariables(template.subject, variables);
        htmlContent = this.applyTemplateVariables(
          template.html_body,
          variables
        );
        textContent = this.applyTemplateVariables(
          template.text_body,
          variables
        );
      } else {
        subject = "Welcome to Our Prayer Community! 🙏";
        htmlContent = generateWelcomeEmailHTML(this.getEmailBaseUrl());
        textContent =
          "Welcome to our prayer community! We are thrilled to have you join us. Visit the app to learn more about how you can participate.";
      }

      await this.sendEmail({
        to: [email],
        subject,
        htmlBody: htmlContent,
        textBody: textContent,
      });
    } catch (error) {
      console.error("Error in sendSubscriberWelcomeNotification:", error);
      // Don't re-throw - let the error be logged but don't block subscriber addition
    }
  }
}
