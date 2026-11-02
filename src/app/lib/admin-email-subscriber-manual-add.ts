import type { SupabaseClient } from '@supabase/supabase-js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type AdminManualSubscriberPlanningCenterMeta = {
  inPlanningCenter: boolean | null;
  planningCenterCheckedAt: string | null;
};

export const EMPTY_ADMIN_MANUAL_SUBSCRIBER_PC_META: AdminManualSubscriberPlanningCenterMeta =
  {
    inPlanningCenter: null,
    planningCenterCheckedAt: null,
  };

export function normalizeAdminManualSubscriberEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function validateAdminManualSubscriberEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) {
    return 'Email is required';
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return 'Please enter a valid email address';
  }
  return null;
}

export function buildAdminManualEmailSubscriberInsertRow(
  name: string,
  normalizedEmail: string,
  pc: AdminManualSubscriberPlanningCenterMeta = EMPTY_ADMIN_MANUAL_SUBSCRIBER_PC_META,
): Record<string, unknown> {
  return {
    name: name.trim(),
    email: normalizedEmail,
    is_active: true,
    is_admin: false,
    receive_admin_emails: false,
    in_planning_center: pc.inPlanningCenter,
    planning_center_checked_at: pc.planningCenterCheckedAt,
  };
}

export function isUniqueEmailSubscriberViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  );
}

export async function findAdminManualEmailSubscriberByEmail(
  client: SupabaseClient,
  normalizedEmail: string,
): Promise<{ id: string } | null> {
  const { data, error } = await client
    .from('email_subscribers')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data;
}

export type EnsureAdminManualEmailSubscriberResult =
  | { ok: true; created: boolean; normalizedEmail: string }
  | { ok: false; error: string };

export async function ensureAdminManualEmailSubscriber(
  client: SupabaseClient,
  name: string,
  email: string,
  resolvePlanningCenter: (
    normalizedEmail: string,
  ) => Promise<AdminManualSubscriberPlanningCenterMeta>,
): Promise<EnsureAdminManualEmailSubscriberResult> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { ok: false, error: 'Name is required' };
  }

  const emailError = validateAdminManualSubscriberEmail(email);
  if (emailError) {
    return { ok: false, error: emailError };
  }

  const normalizedEmail = normalizeAdminManualSubscriberEmail(email);
  const existing = await findAdminManualEmailSubscriberByEmail(client, normalizedEmail);
  if (existing) {
    return { ok: true, created: false, normalizedEmail };
  }

  const pc = await resolvePlanningCenter(normalizedEmail);
  const row = buildAdminManualEmailSubscriberInsertRow(trimmedName, normalizedEmail, pc);
  const { error: insertError } = await client.from('email_subscribers').insert(row);
  if (insertError) {
    if (isUniqueEmailSubscriberViolation(insertError)) {
      return { ok: true, created: false, normalizedEmail };
    }
    throw insertError;
  }

  return { ok: true, created: true, normalizedEmail };
}

export type AddAdminManualEmailSubscriberResult =
  | { ok: true; normalizedEmail: string }
  | { ok: false; error: string };

export async function addAdminManualEmailSubscriberIfNew(
  client: SupabaseClient,
  name: string,
  email: string,
  resolvePlanningCenter: (
    normalizedEmail: string,
  ) => Promise<AdminManualSubscriberPlanningCenterMeta>,
): Promise<AddAdminManualEmailSubscriberResult> {
  const trimmedName = name.trim();
  if (!trimmedName || !email.trim()) {
    return { ok: false, error: 'Name and email are required' };
  }

  const emailError = validateAdminManualSubscriberEmail(email);
  if (emailError) {
    return { ok: false, error: emailError };
  }

  const normalizedEmail = normalizeAdminManualSubscriberEmail(email);
  const existing = await findAdminManualEmailSubscriberByEmail(client, normalizedEmail);
  if (existing) {
    return { ok: false, error: 'This email address is already subscribed' };
  }

  const pc = await resolvePlanningCenter(normalizedEmail);
  const row = buildAdminManualEmailSubscriberInsertRow(trimmedName, normalizedEmail, pc);
  const { error: insertError } = await client.from('email_subscribers').insert(row);
  if (insertError) {
    if (isUniqueEmailSubscriberViolation(insertError)) {
      return { ok: false, error: 'This email address is already subscribed' };
    }
    throw insertError;
  }

  return { ok: true, normalizedEmail };
}

export async function resolvePlanningCenterMetaForManualSubscriber(
  lookupPersonByEmail: (
    normalizedEmail: string,
    includePeople: boolean,
  ) => Promise<{ count: number }>,
  normalizedEmail: string,
): Promise<AdminManualSubscriberPlanningCenterMeta> {
  try {
    const pcResult = await lookupPersonByEmail(normalizedEmail, false);
    return {
      inPlanningCenter: pcResult.count > 0,
      planningCenterCheckedAt: new Date().toISOString(),
    };
  } catch (pcError) {
    console.error('[Email Subscribers] Planning Center check failed:', pcError);
    return EMPTY_ADMIN_MANUAL_SUBSCRIBER_PC_META;
  }
}
