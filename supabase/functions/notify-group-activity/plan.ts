export type GroupActivityNotifyKind = 'prayer_added' | 'prayer_update' | 'prayer_answered';

export const GROUP_WELCOME_TEMPLATE_KEY = 'group_welcome';

export type SubscriberTemplateKey =
  | 'group_prayer_added'
  | 'group_prayer_update'
  | 'group_prayer_answered';

export interface EmailTemplateFields {
  subject: string;
  html_body: string;
  text_body: string;
}

export function applyTemplateVariables(
  content: string,
  variables: Record<string, string>,
): string {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(placeholder, value ?? '');
  }
  return result;
}

export function buildGroupInviteAppLink(baseUrl: string, groupId: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  const params = new URLSearchParams({
    filter: 'groups',
    groupId,
  });
  return `${base}/?${params.toString()}`;
}

export function buildGroupWelcomeTextVariables(input: {
  groupName: string;
  inviterName: string;
  appLink: string;
}): Record<string, string> {
  return {
    groupName: input.groupName,
    inviterName: input.inviterName,
    appLink: input.appLink,
  };
}

export function buildGroupWelcomeHtmlVariables(input: {
  groupName: string;
  inviterName: string;
  appLink: string;
  escapeHtml: (s: string) => string;
}): Record<string, string> {
  return {
    groupName: input.escapeHtml(input.groupName),
    inviterName: input.escapeHtml(input.inviterName),
    appLink: input.appLink,
  };
}

export function renderGroupWelcomeEmail(
  template: EmailTemplateFields,
  input: {
    groupName: string;
    inviterName: string;
    appLink: string;
    escapeHtml: (s: string) => string;
  },
): { subject: string; htmlBody: string; textBody: string } {
  const textVars = buildGroupWelcomeTextVariables(input);
  const htmlVars = buildGroupWelcomeHtmlVariables(input);
  return {
    subject: applyTemplateVariables(template.subject, textVars),
    textBody: applyTemplateVariables(template.text_body, textVars),
    htmlBody: applyTemplateVariables(template.html_body, htmlVars),
  };
}

export function subscriberTemplateKeyForKind(
  kind: GroupActivityNotifyKind,
): SubscriberTemplateKey {
  switch (kind) {
    case 'prayer_added':
      return 'group_prayer_added';
    case 'prayer_update':
      return 'group_prayer_update';
    case 'prayer_answered':
      return 'group_prayer_answered';
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function buildGroupPrayerAppLink(
  baseUrl: string,
  groupId: string,
  prayerId: string,
): string {
  const base = baseUrl.replace(/\/+$/, '');
  const params = new URLSearchParams({
    filter: 'groups',
    groupId,
    prayerId,
  });
  return `${base}/?${params.toString()}`;
}

export function memberEmailsExceptActor(
  memberEmails: string[],
  actorEmail: string,
): string[] {
  const actor = actorEmail.trim().toLowerCase();
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of memberEmails) {
    const email = raw.trim().toLowerCase();
    if (!email || email === actor || seen.has(email)) continue;
    seen.add(email);
    out.push(email);
  }
  return out;
}

export type SubscriberDeliveryRow = {
  email: string;
  is_active: boolean | null;
  is_blocked: boolean | null;
  receive_push: boolean | null;
};

export function planEmailRecipients(rows: SubscriberDeliveryRow[]): string[] {
  return rows
    .filter((row) => row.is_blocked !== true && row.is_active !== false)
    .map((row) => row.email);
}

export function planPushRecipients(rows: SubscriberDeliveryRow[]): string[] {
  return rows
    .filter((row) => row.is_blocked !== true && row.receive_push === true)
    .map((row) => row.email);
}

/** Actor rate limit covers email and push, not email-only. */
export function hasGroupNotifyDelivery(
  emailRecipients: readonly string[],
  pushRecipients: readonly string[],
): boolean {
  return emailRecipients.length > 0 || pushRecipients.length > 0;
}

export function uniqueNotifyRecipients(
  emailRecipients: readonly string[],
  pushRecipients: readonly string[],
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const email of [...emailRecipients, ...pushRecipients]) {
    const key = email.toLowerCase();
    if (!key || seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(email);
  }
  return out;
}

export function claimedDelivery(
  recipients: readonly string[],
  claimed: readonly string[],
): string[] {
  const ok = new Set(claimed.map((email) => email.toLowerCase()));
  return recipients.filter((email) => ok.has(email.toLowerCase()));
}

export interface PrayerFields {
  id: string;
  group_id: string;
  title: string;
  description: string | null;
  prayer_for: string;
  requester: string;
  status: string;
}

export interface UpdateFields {
  id: string;
  content: string;
  author: string;
}

export interface RenderedContent {
  prayerDescription: string;
  prayerDescriptionText: string;
  prayerDescriptionHtml: string;
  updateContent?: string;
  updateContentText?: string;
  updateContentHtml?: string;
}

export interface BuildVariablesInput {
  kind: GroupActivityNotifyKind;
  prayer: PrayerFields;
  appLink: string;
  authorName: string;
  rendered: RenderedContent;
}

export function buildSubscriberTemplateVariables(
  input: BuildVariablesInput,
): Record<string, string> {
  const { kind, prayer, appLink, authorName, rendered } = input;
  const base: Record<string, string> = {
    prayerTitle: prayer.title,
    prayerFor: prayer.prayer_for,
    requesterName: prayer.requester,
    prayerDescription: rendered.prayerDescription,
    prayerDescriptionText: rendered.prayerDescriptionText,
    prayerDescriptionHtml: rendered.prayerDescriptionHtml,
    status: prayer.status,
    prayerStatus: prayer.status,
    appLink,
  };
  if (kind === 'prayer_added') {
    return base;
  }
  return {
    ...base,
    authorName,
    updateContent: rendered.updateContent ?? '',
    updateContentText: rendered.updateContentText ?? '',
    updateContentHtml: rendered.updateContentHtml ?? '',
  };
}

export const FALLBACK_ANSWERED_UPDATE_TEXT = 'This prayer was marked as answered.';

export function updateContentForAnswered(
  update: UpdateFields | null,
  fallbackAuthor: string,
): { authorName: string; content: string } {
  if (update) {
    return { authorName: update.author, content: update.content };
  }
  return { authorName: fallbackAuthor, content: FALLBACK_ANSWERED_UPDATE_TEXT };
}

export function truncatePushTitle(title: string, max = 50): string {
  if (title.length <= max) return title;
  return `${title.slice(0, max - 3)}...`;
}

export function truncatePushBody(text: string, max = 120): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 3)}...`;
}

export function planPushForKind(
  kind: GroupActivityNotifyKind,
  prayer: PrayerFields,
  descriptionPlain: string,
  updatePlain: string,
): { title: string; body: string; pushType: string } {
  const title = truncatePushTitle(prayer.title);
  if (kind === 'prayer_added') {
    const desc = truncatePushBody(descriptionPlain);
    return {
      title,
      body: desc || 'A new prayer has been shared.',
      pushType: 'prayer_approved',
    };
  }
  const body = truncatePushBody(updatePlain) || 'New prayer update.';
  return {
    title,
    body,
    pushType: kind === 'prayer_answered' ? 'prayer_answered' : 'prayer_update',
  };
}

export function normalizeAppUrl(raw: string | undefined, fallback: string): string {
  let u = (raw ?? fallback).trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(u)) {
    if (/^localhost\b/i.test(u) || /^127\.0\.0\.1\b/.test(u)) {
      u = `http://${u}`;
    } else {
      u = `https://${u}`;
    }
  }
  return u;
}
