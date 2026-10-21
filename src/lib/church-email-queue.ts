export const CHURCH_ONLY_QUEUE_TEMPLATE_KEYS = [
  'verse_memorization_prayer',
  'admin_subscriber_manual_broadcast',
] as const;

export const SHARED_MASS_QUEUE_TEMPLATE_KEYS = [
  'approved_prayer',
  'approved_update',
  'prayer_answered',
] as const;

const CHURCH_ONLY = new Set<string>(CHURCH_ONLY_QUEUE_TEMPLATE_KEYS);
const SHARED_MASS = new Set<string>(SHARED_MASS_QUEUE_TEMPLATE_KEYS);

/** @deprecated Group mail is identified by email_templates.is_group in the database. */
export function appLinkLooksLikeGroupMail(
  appLink: string | null | undefined
): boolean {
  return String(appLink ?? '').includes('filter=groups');
}

/** Drop leftover church blasts to group-only addresses. Keep group activity mail. */
export function shouldSkipChurchQueueRow(input: {
  templateKey: string;
  recipientIsChurchMember: boolean;
  isGroupTemplate?: boolean;
  appLink?: string | null;
}): boolean {
  if (input.recipientIsChurchMember) {
    return false;
  }
  if (input.isGroupTemplate === true) {
    return false;
  }
  if (CHURCH_ONLY.has(input.templateKey)) {
    return true;
  }
  if (SHARED_MASS.has(input.templateKey)) {
    return true;
  }
  return false;
}
