import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';
import { planningCenterPeopleIncludeEmail } from '../shared/planning-center-email-match.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await userClient.auth.getUser();
  const email = userData.user?.email?.trim().toLowerCase() ?? '';
  if (!email) {
    return json({ error: 'Not authorized' }, 401);
  }

  const admin = createClient(url, serviceKey);
  const { data: row } = await admin
    .from('email_subscribers')
    .select('id, is_church_member, church_downgraded_at, is_blocked')
    .eq('email', email)
    .maybeSingle();
  if (!row || row.is_blocked) {
    return json({ error: 'Not authorized' }, 403);
  }
  if (row.is_church_member || row.church_downgraded_at) {
    return json({ upgraded: false });
  }

  const inPlanningCenter = await emailIsInPlanningCenter(email);
  if (!inPlanningCenter) {
    return json({ upgraded: false });
  }

  const { error } = await admin
    .from('email_subscribers')
    .update({ is_church_member: true, church_downgraded_at: null })
    .eq('id', row.id)
    .is('church_downgraded_at', null);
  if (error) return json({ error: error.message }, 500);
  return json({ upgraded: true });
});

async function fetchPrimaryEmail(personId: string, authHeader: string): Promise<string | null> {
  const response = await fetch(
    `https://api.planningcenteronline.com/people/v2/people/${encodeURIComponent(personId)}/emails`,
    { headers: { Authorization: authHeader, 'Content-Type': 'application/json' } },
  );
  if (!response.ok) return null;
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
  if (!appId || !secret) return false;
  const authHeader = 'Basic ' + btoa(`${appId}:${secret}`);
  const response = await fetch(
    `https://api.planningcenteronline.com/people/v2/people?where[search_name_or_email]=${encodeURIComponent(email)}`,
    { headers: { Authorization: authHeader, 'Content-Type': 'application/json' } },
  );
  if (!response.ok) return false;
  const data = await response.json();
  const people = Array.isArray(data.data) ? data.data : [];
  const withEmails = [];
  for (const person of people) {
    const loginId = person.attributes?.login_identifier;
    const login = typeof loginId === 'string' && loginId.trim() ? loginId.trim() : null;
    const loginMatches = login !== null && login.toLowerCase() === email;
    const primary = loginMatches ? login : await fetchPrimaryEmail(String(person.id), authHeader);
    withEmails.push({
      attributes: { login_identifier: login, primary_email_address: primary },
    });
  }
  return planningCenterPeopleIncludeEmail(withEmails, email);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
