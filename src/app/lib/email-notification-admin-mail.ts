import { markdownToPlainText, markdownToSafeHtml } from "../../utils/markdown";
import {
  generateAdminNotificationDeletionHTML,
  generateAdminNotificationPrayerHTML,
  generateAdminNotificationUpdateHTML,
} from "./email-notification-html";
import { buildAdminPortalLink } from "./email-notification-links";
import {
  applyEmailTemplateVariables,
  renderEmailFromTemplate,
} from "./email-notification-template";
import type {
  AdminNotificationPayload,
  EmailTemplate,
  SendEmailOptions,
} from "./email-notification-types";

export type EmailNotificationMailDeps = {
  getTemplate: (templateKey: string) => Promise<EmailTemplate | null>;
  sendEmail: (options: SendEmailOptions) => Promise<void>;
  getEmailBaseUrl: () => string;
};

export async function sendAccountApprovalNotificationToEmail(
  deps: EmailNotificationMailDeps,
  email: string,
  firstName: string,
  lastName: string,
  affiliationReason: string,
  adminEmail: string
): Promise<void> {
  try {
    const adminLink = buildAdminPortalLink(deps.getEmailBaseUrl());
    const template = await deps.getTemplate("account_approval_request");

    if (!template) {
      console.error("Account approval request template not found");
      return;
    }

    const requestedDate = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const bodyVariables = {
      firstName,
      lastName,
      email,
      affiliationReason,
      requestedDate,
      adminLink,
    };
    const rendered = renderEmailFromTemplate(
      template,
      bodyVariables,
      bodyVariables
    );
    const subject = applyEmailTemplateVariables(template.subject, {
      firstName,
      lastName,
      email,
    });

    await deps.sendEmail({
      to: [adminEmail],
      subject,
      textBody: rendered.body,
      htmlBody: rendered.html,
    });
  } catch (error) {
    console.error("Error in sendAccountApprovalNotificationToEmail:", error);
  }
}

export async function sendAdminItemNotificationToEmail(
  deps: EmailNotificationMailDeps,
  payload: AdminNotificationPayload,
  adminEmail: string
): Promise<void> {
  try {
    const adminLink = buildAdminPortalLink(deps.getEmailBaseUrl());

    let subject: string;
    let body: string;
    let html: string | undefined;

    try {
      const plan = adminNotificationTemplatePlan(payload, adminLink);
      if (!plan) {
        subject = `New Admin Action Required: ${payload.title}`;
        body = `A new item requires your attention in the admin portal.`;
        throw new Error("Unknown payload type");
      }

      const template = await deps.getTemplate(plan.templateKey);
      if (!template) {
        throw new Error(`Template ${plan.templateKey} not found`);
      }
      const rendered = renderEmailFromTemplate(
        template,
        plan.textVariables,
        plan.htmlVariables
      );
      subject = rendered.subject;
      body = rendered.body;
      html = rendered.html;
    } catch {
      const fallback = adminNotificationFallbackContent(payload, adminLink);
      subject = fallback.subject;
      body = fallback.body;
      html = fallback.html;
    }

    await deps.sendEmail({
      to: [adminEmail],
      subject,
      textBody: body,
      htmlBody: html,
    });
  } catch (error) {
    console.error("Error in sendAdminNotificationToEmail:", error);
  }
}

function adminNotificationTemplatePlan(
  payload: AdminNotificationPayload,
  adminLink: string
): {
  templateKey: string;
  textVariables: Record<string, string>;
  htmlVariables: Record<string, string>;
} | null {
  switch (payload.type) {
    case "prayer":
      return {
        templateKey: "admin_notification_prayer",
        textVariables: {
          prayerTitle: payload.title,
          requesterName: payload.requester || "Anonymous",
          prayerDescription: payload.description
            ? markdownToPlainText(payload.description)
            : "No description provided",
          adminLink,
        },
        htmlVariables: {
          prayerTitle: payload.title,
          requesterName: payload.requester || "Anonymous",
          prayerDescription: payload.description
            ? markdownToSafeHtml(payload.description)
            : "No description provided",
          adminLink,
        },
      };
    case "update":
      return {
        templateKey: "admin_notification_update",
        textVariables: {
          prayerTitle: payload.title,
          authorName: payload.author || "Anonymous",
          updateContent: payload.content
            ? markdownToPlainText(payload.content)
            : "No content provided",
          adminLink,
        },
        htmlVariables: {
          prayerTitle: payload.title,
          authorName: payload.author || "Anonymous",
          updateContent: payload.content
            ? markdownToSafeHtml(payload.content)
            : "No content provided",
          adminLink,
        },
      };
    case "deletion": {
      const textVariables = {
        prayerTitle: payload.title,
        requestedBy: payload.requester || "Anonymous",
        reason: payload.reason || "No reason provided",
        adminLink,
      };
      return {
        templateKey: "admin_notification_deletion",
        textVariables,
        htmlVariables: textVariables,
      };
    }
    default: {
      const neverType: never = payload.type;
      void neverType;
      return null;
    }
  }
}

function adminNotificationFallbackContent(
  payload: AdminNotificationPayload,
  adminLink: string
): { subject: string; body: string; html?: string } {
  switch (payload.type) {
    case "prayer":
      return {
        subject: `New Prayer Request: ${payload.title}`,
        body: `A new prayer request has been submitted and is pending approval.\n\nTitle: ${
          payload.title
        }\nRequested by: ${payload.requester || "Anonymous"}\n\nDescription: ${
          markdownToPlainText(payload.description) || "No description provided"
        }\n\nApprove this request here: ${adminLink}`,
        html: generateAdminNotificationPrayerHTML(payload, adminLink),
      };
    case "update":
      return {
        subject: `New Prayer Update: ${payload.title}`,
        body: `A new prayer update has been submitted and is pending approval.\n\nPrayer: ${
          payload.title
        }\nUpdate by: ${payload.author || "Anonymous"}\n\nContent: ${
          markdownToPlainText(payload.content) || "No content provided"
        }\n\nApprove this request here: ${adminLink}`,
        html: generateAdminNotificationUpdateHTML(payload, adminLink),
      };
    case "deletion":
      return {
        subject: `Deletion Request: ${payload.title}`,
        body: `A deletion request has been submitted for a prayer.\n\nPrayer: ${
          payload.title
        }\nRequested by: ${payload.requester || "Anonymous"}\n\nReason: ${
          payload.reason || "No reason provided"
        }\n\nApprove this request here: ${adminLink}`,
        html: generateAdminNotificationDeletionHTML(payload, adminLink),
      };
    default: {
      const neverType: never = payload.type;
      void neverType;
      return {
        subject: `New Admin Action Required`,
        body: `A new item requires your attention in the admin portal: ${adminLink}`,
      };
    }
  }
}
