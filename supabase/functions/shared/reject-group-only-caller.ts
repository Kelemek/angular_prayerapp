import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

/** Returns a 403 response when the caller is a signed-in group-only subscriber. */
export async function rejectGroupOnlyCaller(req: Request): Promise<Response | null> {
  const header = req.headers.get('Authorization') ?? '';
  const token = header.replace(/^Bearer\s+/i, '').trim();
  const url = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!token || !url || !serviceKey) return null;

  const admin = createClient(url, serviceKey);
  const { data, error } = await admin.auth.getUser(token);
  const email = data.user?.email?.trim().toLowerCase();
  if (error || !email) return null;

  const { data: row } = await admin
    .from('email_subscribers')
    .select('is_church_member')
    .eq('email', email)
    .maybeSingle();
  if (row?.is_church_member === false) {
    return new Response(JSON.stringify({ error: 'Not authorized' }), {
      status: 403,
      headers: corsHeaders,
    });
  }
  return null;
}
