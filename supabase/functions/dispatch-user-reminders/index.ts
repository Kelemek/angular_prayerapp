/**
 * Single pg_cron entry every 15 minutes runs this function, which invokes reminder Edge Functions
 * sequentially so PostgREST is not stamped by three jobs at once.
 * Each phase is a separate self-contained function (no shared Edge modules).
 * Deploy with: supabase functions deploy dispatch-user-reminders
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
  'Access-Control-Max-Age': '86400',
};

const PHASES = [
  'send-user-hourly-prayer-reminders',
  'send-user-hourly-memorization-reminders',
  'send-user-prayer-item-reminders',
] as const;

type PhaseName = (typeof PHASES)[number];

interface PhaseResult {
  phase: PhaseName;
  ok: boolean;
  data?: unknown;
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results: PhaseResult[] = [];

  try {
    for (const phase of PHASES) {
      console.log(`dispatch-user-reminders: starting ${phase}`);
      const { data, error } = await supabase.functions.invoke(phase, {
        body: { dispatchedBy: 'dispatch-user-reminders' },
      });

      if (error) {
        const message = error.message ?? String(error);
        console.error(`dispatch-user-reminders: ${phase} failed`, error);
        results.push({ phase, ok: false, error: message });
        continue;
      }

      console.log(`dispatch-user-reminders: ${phase} completed`, data);
      results.push({ phase, ok: true, data });
    }

    const allOk = results.every((r) => r.ok);
    return new Response(
      JSON.stringify({
        message: allOk
          ? 'All reminder phases completed'
          : 'Reminder dispatch finished with errors',
        phases: results,
      }),
      {
        status: allOk ? 200 : 207,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (e) {
    console.error('dispatch-user-reminders:', e);
    return new Response(
      JSON.stringify({
        error: 'Unexpected error',
        details: e instanceof Error ? e.message : String(e),
        phases: results,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
