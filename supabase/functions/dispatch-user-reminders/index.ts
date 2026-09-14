/**
 * Single pg_cron entry every 15 minutes runs this function, which invokes reminder Edge Functions
 * sequentially so PostgREST is not stamped by three jobs at once.
 * Loads admin_settings template keys once (with retry) and passes them to prayer/memorization phases.
 * Each phase is a separate self-contained function (no shared Edge modules).
 * Deploy with: supabase functions deploy dispatch-user-reminders
 */
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';

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

const DISPATCHED_BY = 'dispatch-user-reminders';
const PHASE_PAUSE_MS = 2500;
const PHASE_INVOKE_ATTEMPTS = 2;
const PHASE_INVOKE_RETRY_DELAY_MS = 3500;

interface PhaseResult {
  phase: PhaseName;
  ok: boolean;
  data?: unknown;
  error?: string;
}

interface AdminReminderBootstrap {
  userHourlyPrayerReminderTemplateKey: string | null;
  userHourlyMemorizationReminderTemplateKey: string | null;
}

type QueryResult<T> = {
  data: T | null;
  error: { message: string; code?: string; status?: number } | null;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isTransientPostgrestError(
  err: { message?: string; code?: string; status?: number } | null
): boolean {
  if (!err) return false;
  const msg = (err.message ?? '').toLowerCase();
  const code = String(err.code ?? '');
  const status = Number(err.status ?? 0);
  return (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    code === '500' ||
    code === '502' ||
    code === '503' ||
    code === '504' ||
    msg.includes('504') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('500') ||
    msg.includes('timeout') ||
    msg.includes('timed out') ||
    msg.includes('fetch failed') ||
    msg.includes('network') ||
    msg.includes('connection') ||
    msg.includes('gateway') ||
    msg.includes('failed to get project config') ||
    msg.includes('internal server error')
  );
}

async function withRetry<T>(
  label: string,
  fn: () => PromiseLike<QueryResult<T>>,
  opts: { attempts?: number; baseDelayMs?: number } = {}
): Promise<QueryResult<T>> {
  const attempts = opts.attempts ?? 5;
  const baseDelayMs = opts.baseDelayMs ?? 500;
  let last: QueryResult<T> = { data: null, error: { message: 'no attempt' } };
  for (let i = 0; i < attempts; i++) {
    last = await fn();
    if (!last.error) return last;
    if (!isTransientPostgrestError(last.error) || i === attempts - 1) {
      console.error(`${label} failed (attempt ${i + 1}/${attempts}):`, last.error);
      return last;
    }
    const delay = baseDelayMs * Math.pow(2, i);
    console.warn(`${label} transient error; retrying in ${delay}ms:`, last.error);
    await sleep(delay);
  }
  return last;
}

async function loadAdminReminderBootstrap(
  supabase: SupabaseClient
): Promise<AdminReminderBootstrap | null> {
  const { data, error } = await withRetry(
    'admin_settings_bootstrap',
    () =>
      supabase
        .from('admin_settings')
        .select(
          'user_hourly_prayer_reminder_template_key, user_hourly_memorization_reminder_template_key'
        )
        .eq('id', 1)
        .maybeSingle()
  );

  if (error || !data) {
    console.warn(
      'dispatch-user-reminders: admin_settings bootstrap unavailable; phases will load settings themselves.',
      error
    );
    return null;
  }

  const row = data as {
    user_hourly_prayer_reminder_template_key?: string | null;
    user_hourly_memorization_reminder_template_key?: string | null;
  };

  return {
    userHourlyPrayerReminderTemplateKey:
      row.user_hourly_prayer_reminder_template_key ?? null,
    userHourlyMemorizationReminderTemplateKey:
      row.user_hourly_memorization_reminder_template_key ?? null,
  };
}

function invokeBodyForPhase(
  phase: PhaseName,
  bootstrap: AdminReminderBootstrap | null
): Record<string, unknown> {
  const base: Record<string, unknown> = { dispatchedBy: DISPATCHED_BY };
  if (!bootstrap) return base;

  if (phase === 'send-user-hourly-prayer-reminders') {
    base.userHourlyPrayerReminderTemplateKey = bootstrap.userHourlyPrayerReminderTemplateKey;
  } else if (phase === 'send-user-hourly-memorization-reminders') {
    base.userHourlyMemorizationReminderTemplateKey =
      bootstrap.userHourlyMemorizationReminderTemplateKey;
  }
  return base;
}

async function invokePhaseWithRetry(
  supabase: SupabaseClient,
  phase: PhaseName,
  body: Record<string, unknown>
): Promise<PhaseResult> {
  let lastError = 'unknown error';

  for (let attempt = 0; attempt < PHASE_INVOKE_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      console.warn(
        `dispatch-user-reminders: retrying ${phase} (attempt ${attempt + 1}/${PHASE_INVOKE_ATTEMPTS})`
      );
      await sleep(PHASE_INVOKE_RETRY_DELAY_MS);
    }

    const { data, error } = await supabase.functions.invoke(phase, { body });

    if (!error) {
      return { phase, ok: true, data };
    }

    lastError = error.message ?? String(error);
    console.error(`dispatch-user-reminders: ${phase} invoke failed`, error);
  }

  return { phase, ok: false, error: lastError };
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
  const bootstrap = await loadAdminReminderBootstrap(supabase);

  try {
    for (let i = 0; i < PHASES.length; i++) {
      const phase = PHASES[i];
      console.log(`dispatch-user-reminders: starting ${phase}`);
      const body = invokeBodyForPhase(phase, bootstrap);
      const result = await invokePhaseWithRetry(supabase, phase, body);
      results.push(result);

      if (result.ok) {
        console.log(`dispatch-user-reminders: ${phase} completed`, result.data);
      }

      if (i < PHASES.length - 1) {
        await sleep(PHASE_PAUSE_MS);
      }
    }

    const allOk = results.every((r) => r.ok);
    return new Response(
      JSON.stringify({
        message: allOk
          ? 'All reminder phases completed'
          : 'Reminder dispatch finished with errors',
        adminSettingsBootstrapped: bootstrap !== null,
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
        adminSettingsBootstrapped: bootstrap !== null,
        phases: results,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
