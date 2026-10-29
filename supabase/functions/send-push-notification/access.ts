import { isServiceRoleCredential } from "../send-email/access.ts";
import type { PushRequest } from "./payload.ts";

export type PushCallerKind =
  | "service_role"
  | "admin"
  | "subscriber"
  | "anonymous";

export type PushAccess = "raw" | "admin_recipients" | "all_admins" | "deny";

/** Accepts a service_role JWT or the configured key itself (`sb_secret_…` keys are not JWTs). */
export function isPushServiceRoleCaller(
  authorizationHeader: string | null | undefined,
  apiKeyHeader: string | null | undefined,
  serviceRoleKey: string | null | undefined
): boolean {
  return isServiceRoleCredential(authorizationHeader, apiKeyHeader, serviceRoleKey);
}

/**
 * Service role and admins may choose recipients, and only they may refresh every admin's badge.
 * A subscriber may reach only admins.
 */
export function decidePushAccess(
  caller: PushCallerKind,
  request: PushRequest
): PushAccess {
  const trusted = caller === "service_role" || caller === "admin";
  if (request.kind === "badge_only") {
    return trusted ? "all_admins" : "deny";
  }
  if (trusted) {
    return "raw";
  }
  if (caller === "subscriber" && !request.sendToAll) {
    return "admin_recipients";
  }
  return "deny";
}

export interface AdminPushRow {
  email?: string | null;
  receive_admin_push?: boolean | null;
  is_blocked?: boolean | null;
}

/** Every unblocked admin, whatever their admin push setting: the icon counts pending for all of them. */
export function allAdminRecipientEmails(admins: AdminPushRow[]): string[] {
  const chosen: string[] = [];
  for (const admin of admins) {
    const stored = admin.email?.trim() ?? "";
    if (stored && admin.is_blocked !== true) chosen.push(stored);
  }
  return chosen;
}

/** Keeps requested addresses that are unblocked admins with admin push enabled. */
export function adminPushRecipientEmails(
  requested: string[],
  admins: AdminPushRow[]
): string[] {
  const allowed = new Map<string, string>();
  for (const admin of admins) {
    if (admin.receive_admin_push !== true || admin.is_blocked === true) continue;
    const stored = admin.email?.trim() ?? "";
    if (!stored) continue;
    allowed.set(stored.toLowerCase(), stored);
  }

  const chosen: string[] = [];
  const seen = new Set<string>();
  for (const email of requested) {
    const stored = allowed.get(email.trim().toLowerCase());
    if (!stored || seen.has(stored)) continue;
    seen.add(stored);
    chosen.push(stored);
  }
  return chosen;
}
