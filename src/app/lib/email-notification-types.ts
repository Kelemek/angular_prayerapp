export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  htmlBody?: string;
  textBody?: string;
  replyTo?: string;
  fromName?: string;
}

export interface EmailTemplate {
  id: string;
  template_key: string;
  name: string;
  subject: string;
  html_body: string;
  text_body: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ApprovedPrayerPayload {
  title: string;
  description: string;
  requester: string;
  prayerFor: string;
  status: string;
}

export interface ApprovedUpdatePayload {
  prayerTitle: string;
  prayerDescription: string;
  content: string;
  author: string;
  /** Parent `prayers.status` — drives `?filter=` on subscriber email app link (current | answered). */
  prayerStatus: string;
  markedAsAnswered?: boolean;
}

export interface RequesterApprovalPayload {
  title: string;
  description: string;
  requester: string;
  requesterEmail: string;
  prayerFor: string;
}

export interface DeniedPrayerPayload {
  title: string;
  description: string;
  requester: string;
  requesterEmail: string;
  denialReason: string;
}

export interface DeniedUpdatePayload {
  prayerTitle: string;
  content: string;
  author: string;
  authorEmail: string;
  denialReason: string;
}

export interface UpdateAuthorApprovalPayload {
  prayerTitle: string;
  content: string;
  author: string;
  authorEmail: string;
}

export interface AdminNotificationPayload {
  type: "prayer" | "update" | "deletion";
  title: string;
  description?: string;
  requester?: string;
  author?: string;
  content?: string;
  reason?: string;
  requestId?: string;
}

/** Queued template for Admin → Settings → Email → manual broadcast to subscriber list. */
export const ADMIN_SUBSCRIBER_MANUAL_BROADCAST_TEMPLATE_KEY =
  "admin_subscriber_manual_broadcast";
