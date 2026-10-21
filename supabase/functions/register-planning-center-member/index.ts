import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';
import { verifyAuthResumeToken } from '../shared/auth-resume-token.ts';
import { mintSubscriberMagicLinkToken } from '../shared/mint-subscriber-magic-link.ts';
import { planningCenterPeopleIncludeEmail } from '../shared/planning-center-email-match.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX_PER_EMAIL = 10;
const RATE_MAX_PER_IP = 40;
const recentAttempts = new Map<string, number[]>();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
  'Access-Control-Max-Age': '86400',
};

type SubscriberFlagRow = {
  is_church_member: boolean;
  is_blocked: boolean | null;
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for') ?? '';
  const first = forwarded.split(',')[0]?.trim();
  return (first || req.headers.get('cf-connecting-ip') || 'unknown').slice(0, 64);
}

function isRateLimited(key: string, max: number): boolean {
  const now = Date.now();
  const times = (recentAttempts.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (!recentAttempts.has(key) && recentAttempts.size >= 5000) {
    const oldest = recentAttempts.keys().next().value;
    if (oldest) recentAttempts.delete(oldest);
  }
  recentAttempts.set(key, times);
  return times.length >= max;
}

function recordAttempt(key: string): void {
  const times = recentAttempts.get(key) ?? [];
  times.push(Date.now());
  recentAttempts.set(key, times);
}

async function fetchPrimaryEmail(personId: string, authHeader: string): Promise<string | null> {
  const response = await fetch(
    `https://api.planningcenteronline.com/people/v2/people/${encodeURIComponent(personId)}/emails`,
    { headers: { Authorization: authHeader, 'Content-Type': 'application/json' } },
  );
  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  const emails = Array.isArray(data.data) ? data.data : [];
  const primary = emails.find((entry: { attributes?: { primary?: boolean } }) =>
    entry.attributes?.primary === true
  );
  const chosen = primary ?? emails[0];
  const address = chosen?.attributes?.address;
  return typeof address === 'string' && address.trim() ? address.trim() : null;
}

async function emailIsInPlanningCenter(email: string): Promise<boolean> {
  const appId = Deno.env.get('PLANNING_CENTER_APP_ID');
  const secret = Deno.env.get('PLANNING_CENTER_SECRET');
  if (!appId || !secret) {
    throw new Error('Planning Center not configured');
  }
  const authHeader = 'Basic ' + btoa(`${appId}:${secret}`);
  const searchUrl =
    `https://api.planningcenteronline.com/people/v2/people?where[search_name_or_email]=${
      encodeURIComponent(email)
    }`;
  const response = await fetch(searchUrl, {
    headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    throw new Error('Failed to search Planning Center');
  }
  const data = await response.json();
  const people = Array.isArray(data.data) ? data.data : [];
  const withEmails = [];
  for (const person of people) {
    const loginId = person.attributes?.login_identifier;
    const login = typeof loginId === 'string' && loginId.trim() ? loginId.trim() : null;
    const loginMatches = login !== null && login.toLowerCase() === email;
    const primary = loginMatches
      ? login
      : await fetchPrimaryEmail(String(person.id), authHeader);
    withEmails.push({
      attributes: {
        login_identifier: login,
        primary_email_address: primary,
      },
    });
  }
  return planningCenterPeopleIncludeEmail(withEmails, email);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: 'Server configuration error' }, 500);
    }

    const body = await req.json();
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
    const resumeToken = typeof body.auth_resume_token === 'string'
      ? body.auth_resume_token.trim()
      : '';

    if (!email.includes('@') || !firstName || !lastName) {
      return json({ error: 'Name and email are required' }, 400);
    }
    if (!resumeToken) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const tokenCheck = await verifyAuthResumeToken(resumeToken, email);
    if (!tokenCheck.ok) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const emailKey = `email:${email}`;
    const ipKey = `ip:${clientIp(req)}`;
    if (isRateLimited(emailKey, RATE_MAX_PER_EMAIL) || isRateLimited(ipKey, RATE_MAX_PER_IP)) {
      return json({ error: 'Too many attempts. Try again later.' }, 429);
    }
    recordAttempt(emailKey);
    recordAttempt(ipKey);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: existing, error: existingError } = await supabase
      .from('email_subscribers')
      .select('is_church_member, is_blocked')
      .eq('email', email)
      .maybeSingle();
    if (existingError) {
      console.error('register-planning-center-member lookup failed:', existingError);
      return json({ error: 'Failed to save subscriber' }, 500);
    }

    const row = existing as SubscriberFlagRow | null;
    if (row?.is_blocked === true) {
      return json({ error: 'Subscriber not found' }, 403);
    }
    if (row && row.is_church_member !== true) {
      return json({ error: 'This email is already registered' }, 409);
    }

    if (!row) {
      const inPlanningCenter = await emailIsInPlanningCenter(email);
      if (!inPlanningCenter) {
        return json({ error: 'This email is not in Planning Center' }, 403);
      }

      const { error: insertError } = await supabase.from('email_subscribers').insert({
        email,
        name: `${firstName} ${lastName}`,
        is_active: true,
        is_admin: false,
        receive_admin_emails: false,
        is_blocked: false,
        in_planning_center: true,
        planning_center_checked_at: new Date().toISOString(),
        is_church_member: true,
        church_downgraded_at: null,
      });
      if (insertError) {
        console.error('register-planning-center-member insert failed:', insertError);
        return json({ error: 'Failed to save subscriber' }, 500);
      }

      const { data: insertedRow, error: insertedError } = await supabase
        .from('email_subscribers')
        .select('is_blocked')
        .eq('email', email)
        .maybeSingle();
      if (insertedError) {
        console.error('register-planning-center-member post-insert lookup failed:', insertedError);
        return json({ error: 'Failed to save subscriber' }, 500);
      }
      if (insertedRow?.is_blocked === true) {
        return json({ error: 'Subscriber not found' }, 403);
      }
    }

    const minted = await mintSubscriberMagicLinkToken(supabase, email);
    if (!minted.ok) {
      return json({ error: minted.error }, minted.status);
    }

    return json({
      success: true,
      hashed_token: minted.hashed_token,
      email,
    }, 200);
  } catch (error) {
    console.error('register-planning-center-member error:', error);
    return json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});
