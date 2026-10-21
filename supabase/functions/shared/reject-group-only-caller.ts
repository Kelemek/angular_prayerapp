import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

/**
 * Fail-closed church-member gate for Planning Center list/search.
 *
 * Login-flow functions that MUST stay off this helper:
 * - send-verification-code (email code is the proof)
 * - verify-code (codeId + code; mints auth_resume_token)
 * - resume-auth-link (resume token)
 * - register-planning-center-member (resume token + exact PC email match)
 * - planning-center-lookup login mode (resume token, boolean only)
 * - upgrade-planning-center-member (signed-in group-only by design)
 *
 * Documented only, not changed here: check-admin-status, scripture,
 * scripture-audio, submit-feedback, transcribe-audio, cron reminder
 * functions, trigger-email-processor.
 */

export type ChurchMemberCallerDecision =
  | { kind: 'allow' }
  | { kind: 'deny'; status: 401 | 403 };

export type ChurchMemberCallerFacts = {
  hasToken: boolean;
  envConfigured: boolean;
  getUserOk: boolean;
  email: string | null;
  subscriber: {
    is_church_member: boolean | null;
    is_blocked: boolean | null;
    is_admin: boolean | null;
  } | null;
};

export function decideChurchMemberCallerAccess(
  facts: ChurchMemberCallerFacts,
): ChurchMemberCallerDecision {
  if (!facts.hasToken || !facts.envConfigured) {
    return { kind: 'deny', status: 401 };
  }
  if (!facts.getUserOk || !facts.email) {
    return { kind: 'deny', status: 401 };
  }
  if (!facts.subscriber || facts.subscriber.is_blocked === true) {
    return { kind: 'deny', status: 403 };
  }
  if (
    facts.subscriber.is_church_member === true ||
    facts.subscriber.is_admin === true
  ) {
    return { kind: 'allow' };
  }
  return { kind: 'deny', status: 403 };
}

function denyResponse(status: 401 | 403): Response {
  return new Response(JSON.stringify({ error: 'Not authorized' }), {
    status,
    headers: corsHeaders,
  });
}

/** Returns a 401/403 when the caller is not a verified unblocked church member or admin. */
export async function requireChurchMemberCaller(
  req: Request,
): Promise<Response | null> {
  const header = req.headers.get('Authorization') ?? '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const envConfigured = Boolean(url && serviceKey);

  if (!token || !envConfigured) {
    return denyResponse(401);
  }

  const admin = createClient(url, serviceKey);
  const { data, error } = await admin.auth.getUser(token);
  const email = data.user?.email?.trim().toLowerCase() ?? null;
  if (error || !email) {
    return denyResponse(401);
  }

  const { data: row } = await admin
    .from('email_subscribers')
    .select('is_church_member, is_blocked, is_admin')
    .eq('email', email)
    .maybeSingle();

  const decision = decideChurchMemberCallerAccess({
    hasToken: true,
    envConfigured: true,
    getUserOk: true,
    email,
    subscriber: row
      ? {
          is_church_member: row.is_church_member ?? null,
          is_blocked: row.is_blocked ?? null,
          is_admin: row.is_admin ?? null,
        }
      : null,
  });
  if (decision.kind === 'deny') {
    return denyResponse(decision.status);
  }
  return null;
}
