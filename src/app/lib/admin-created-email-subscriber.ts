import type { SupabaseClient } from '@supabase/supabase-js';
import {
  findEmailSubscriberByEmail,
  insertEmailSubscriberRow,
} from './prayer-community-db';
import { normalizeSubscriberEmail } from './prayer-community-mutations';
import { isPostgresUniqueViolation } from './postgres-error';
import { validateSubscriberEmailFormat } from './subscriber-email-format';

export type AdminCreatedSubscriberPlanningCenterMeta = {
  inPlanningCenter: boolean | null;
  planningCenterCheckedAt: string | null;
};

export type AdminCreatedEmailSubscriberInsert = {
  name: string;
  email: string;
  is_active: boolean;
  is_admin: boolean;
  receive_admin_emails: boolean;
  in_planning_center: boolean | null;
  planning_center_checked_at: string | null;
};

export function emptyAdminCreatedSubscriberPcMeta(): AdminCreatedSubscriberPlanningCenterMeta {
  return { inPlanningCenter: null, planningCenterCheckedAt: null };
}

export function buildAdminCreatedEmailSubscriberInsertRow(
  name: string,
  normalizedEmail: string,
  pc: AdminCreatedSubscriberPlanningCenterMeta = emptyAdminCreatedSubscriberPcMeta(),
): AdminCreatedEmailSubscriberInsert {
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

export type EnsureAdminCreatedEmailSubscriberOutcome =
  | { status: 'invalid'; error: string }
  | { status: 'exists'; normalizedEmail: string }
  | { status: 'created'; normalizedEmail: string };

export async function ensureAdminCreatedEmailSubscriber(
  client: SupabaseClient,
  name: string,
  email: string,
  resolvePlanningCenter: (
    normalizedEmail: string,
  ) => Promise<AdminCreatedSubscriberPlanningCenterMeta>,
): Promise<EnsureAdminCreatedEmailSubscriberOutcome> {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { status: 'invalid', error: 'Name is required' };
  }

  const emailError = validateSubscriberEmailFormat(email);
  if (emailError) {
    return { status: 'invalid', error: emailError };
  }

  const normalizedEmail = normalizeSubscriberEmail(email);
  const { data: existing, error: findError } = await findEmailSubscriberByEmail(
    client,
    normalizedEmail,
  );
  if (findError) {
    throw findError;
  }
  if (existing) {
    return { status: 'exists', normalizedEmail };
  }

  const pc = await resolvePlanningCenter(normalizedEmail);
  const row = buildAdminCreatedEmailSubscriberInsertRow(trimmedName, normalizedEmail, pc);
  const { error: insertError } = await insertEmailSubscriberRow(client, row);
  if (insertError) {
    if (isPostgresUniqueViolation(insertError)) {
      return { status: 'exists', normalizedEmail };
    }
    throw insertError;
  }

  return { status: 'created', normalizedEmail };
}

export async function resolvePlanningCenterMetaForAdminCreatedSubscriber(
  lookupPersonByEmail: (
    normalizedEmail: string,
    includePeople: boolean,
  ) => Promise<{ count: number }>,
  normalizedEmail: string,
): Promise<AdminCreatedSubscriberPlanningCenterMeta> {
  try {
    const pcResult = await lookupPersonByEmail(normalizedEmail, false);
    return {
      inPlanningCenter: pcResult.count > 0,
      planningCenterCheckedAt: new Date().toISOString(),
    };
  } catch (pcError) {
    console.error('[Admin created subscriber] Planning Center lookup failed:', pcError);
    return emptyAdminCreatedSubscriberPcMeta();
  }
}
