export type SendEmailCaller =
  | { kind: "service_role" }
  | { kind: "admin" }
  | { kind: "subscriber" }
  | { kind: "anonymous" };

export type SendEmailDecision = "raw" | "notify_admins" | "deny";

export function jwtRole(token: string): string | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const padded = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
    const payload = JSON.parse(json) as { role?: unknown };
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

export function decideSendEmailAccess(
  caller: SendEmailCaller,
  action: string | undefined
): SendEmailDecision {
  if (action === "notify_admins") {
    if (
      caller.kind === "service_role" ||
      caller.kind === "admin" ||
      caller.kind === "subscriber"
    ) {
      return "notify_admins";
    }
    return "deny";
  }

  if (caller.kind === "service_role" || caller.kind === "admin") {
    return "raw";
  }

  return "deny";
}

export interface AdminNoticeInput {
  type?: string;
  title?: string;
  description?: string;
  requester?: string;
  author?: string;
  content?: string;
  reason?: string;
}

export interface AdminNoticeMessage {
  templateKey: string;
  subjectFallback: string;
  textVariables: Record<string, string>;
  htmlVariables: Record<string, string>;
}

const FIELD_LIMIT = 4000;

const ADMIN_PORTAL_ORIGINS = new Set([
  "https://cpprayer.cp-church.org",
  "http://localhost:4200",
]);

export function isAdminPortalLink(link: string): boolean {
  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return false;
  }
  if (url.username || url.password || url.search || url.hash) return false;
  if (url.pathname !== "/admin") return false;
  return ADMIN_PORTAL_ORIGINS.has(url.origin);
}

function clip(value: string | undefined, fallback: string): string {
  const text = (value ?? "").trim();
  const chosen = text || fallback;
  return chosen.slice(0, FIELD_LIMIT);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function adminNoticeMessage(
  notice: AdminNoticeInput,
  adminLink: string
): AdminNoticeMessage | null {
  if (!isAdminPortalLink(adminLink)) return null;
  const title = clip(notice.title, "");
  if (!title) return null;

  const textLink = adminLink;
  const htmlLink = escapeHtml(adminLink);

  switch (notice.type) {
    case "prayer": {
      const requester = clip(notice.requester, "Anonymous");
      const description = clip(notice.description, "No description provided");
      return {
        templateKey: "admin_notification_prayer",
        subjectFallback: `New Prayer Request: ${title}`,
        textVariables: {
          prayerTitle: title,
          requesterName: requester,
          prayerDescription: description,
          adminLink: textLink,
        },
        htmlVariables: {
          prayerTitle: escapeHtml(title),
          requesterName: escapeHtml(requester),
          prayerDescription: escapeHtml(description),
          adminLink: htmlLink,
        },
      };
    }
    case "update": {
      const author = clip(notice.author, "Anonymous");
      const content = clip(notice.content, "No content provided");
      return {
        templateKey: "admin_notification_update",
        subjectFallback: `New Prayer Update: ${title}`,
        textVariables: {
          prayerTitle: title,
          authorName: author,
          updateContent: content,
          adminLink: textLink,
        },
        htmlVariables: {
          prayerTitle: escapeHtml(title),
          authorName: escapeHtml(author),
          updateContent: escapeHtml(content),
          adminLink: htmlLink,
        },
      };
    }
    case "deletion": {
      const requestedBy = clip(notice.requester, "Anonymous");
      const reason = clip(notice.reason, "No reason provided");
      return {
        templateKey: "admin_notification_deletion",
        subjectFallback: `Deletion Request: ${title}`,
        textVariables: {
          prayerTitle: title,
          requestedBy,
          reason,
          adminLink: textLink,
        },
        htmlVariables: {
          prayerTitle: escapeHtml(title),
          requestedBy: escapeHtml(requestedBy),
          reason: escapeHtml(reason),
          adminLink: htmlLink,
        },
      };
    }
    default:
      return null;
  }
}

export function applyFixedTemplateVariables(
  content: string,
  variables: Record<string, string>
): string {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    if (!/^[A-Za-z0-9_]+$/.test(key)) continue;
    result = result.replace(
      new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"),
      value
    );
  }
  return result;
}
