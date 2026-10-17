import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
};

async function sessionEmail(userClient: SupabaseClient): Promise<string | null> {
  const { data: userData } = await userClient.auth.getUser();
  const jwtEmail = userData?.user?.email?.toLowerCase().trim();
  return jwtEmail || null;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const openaiAdminKey = Deno.env.get('OPENAI_ADMIN_KEY');
  const openaiApiKeyId = Deno.env.get('OPENAI_API_KEY_ID')?.trim();

  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? serviceKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceKey);

  const email = await sessionEmail(userClient);
  if (!email) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: isAdmin, error: adminError } = await adminClient.rpc('is_admin', {
    user_email: email,
  });

  if (adminError) {
    console.error('admin check failed:', adminError);
    return new Response(JSON.stringify({ error: 'Could not verify admin status' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (isAdmin !== true) {
    return new Response(JSON.stringify({ error: 'Not authorized' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!openaiAdminKey) {
    return new Response(
      JSON.stringify({ configured: false, admin_key_required: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!openaiApiKeyId) {
    return new Response(
      JSON.stringify({ configured: false, api_key_id_required: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const periodDays = 30;
  const end = Math.floor(Date.now() / 1000);
  const start = end - periodDays * 24 * 60 * 60;

  const costsUrl = new URL('https://api.openai.com/v1/organization/costs');
  costsUrl.searchParams.set('start_time', String(start));
  costsUrl.searchParams.set('end_time', String(end));
  costsUrl.searchParams.set('bucket_width', '1d');
  costsUrl.searchParams.set('limit', '31');
  costsUrl.searchParams.append('api_key_ids', openaiApiKeyId);

  const costsRes = await fetch(costsUrl.toString(), {
    headers: { Authorization: `Bearer ${openaiAdminKey}` },
  });

  if (!costsRes.ok) {
    const errText = await costsRes.text();
    console.error('OpenAI costs API failed:', errText);
    return new Response(
      JSON.stringify({
        configured: true,
        error: 'Could not load OpenAI API key usage',
        costs_api_failed: true,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const costsPayload = await costsRes.json();
  let totalUsd = 0;

  for (const bucket of costsPayload?.data ?? []) {
    for (const result of bucket?.results ?? []) {
      totalUsd += Number(result?.amount?.value ?? 0);
    }
  }

  return new Response(
    JSON.stringify({
      configured: true,
      period_days: periodDays,
      total_usd: totalUsd,
      scoped_to_api_key: true,
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
