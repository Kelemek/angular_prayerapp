import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
};

const WHISPER_MODEL = 'whisper-1';
const WHISPER_RATE_USD_PER_MINUTE = 0.006;
const MAX_BYTES = 10 * 1024 * 1024;
const RECITE_MAX_AUDIO_SECONDS = 300;
const BYTES_PER_SECOND_ESTIMATE = 8000;

function estimateAudioSecondsFromBytes(byteSize: number): number {
  if (byteSize <= 0) return 0;
  return Math.min(
    RECITE_MAX_AUDIO_SECONDS,
    Math.max(1, byteSize / BYTES_PER_SECOND_ESTIMATE)
  );
}

function resolveBilledAudioSeconds(clientSeconds: number, byteSize: number): number {
  const fromFile = estimateAudioSecondsFromBytes(byteSize);
  const client = Number.isFinite(clientSeconds) ? Math.max(0, clientSeconds) : 0;
  // Never bill above what the uploaded bytes could contain; client may report a shorter stop.
  const billable = client > 0 ? Math.min(client, fromFile) : fromFile;
  return Math.min(RECITE_MAX_AUDIO_SECONDS, billable);
}

async function isKnownSubscriber(
  adminClient: SupabaseClient,
  email: string
): Promise<boolean> {
  const { data: subscriber, error } = await adminClient
    .from('email_subscribers')
    .select('email')
    .eq('email', email)
    .maybeSingle();

  if (error) {
    console.error('email_subscribers lookup failed:', error);
    return false;
  }

  return !!subscriber;
}

async function resolveAuthenticatedEmail(
  userClient: SupabaseClient,
  adminClient: SupabaseClient,
  formUserEmail: FormDataEntryValue | null
): Promise<string | null> {
  const { data: userData } = await userClient.auth.getUser();
  const jwtEmail = userData?.user?.email?.toLowerCase().trim();
  if (jwtEmail) {
    if (!(await isKnownSubscriber(adminClient, jwtEmail))) return null;
    return jwtEmail;
  }

  const email = String(formUserEmail ?? '').trim().toLowerCase();
  if (!email || !email.includes('@')) return null;

  if (!(await isKnownSubscriber(adminClient, email))) return null;

  return email;
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const openaiKey = Deno.env.get('OPENAI_API_KEY');

  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!openaiKey) {
    return new Response(
      JSON.stringify({ error: 'OpenAI transcription is not configured on the server.' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
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

  try {
    const form = await req.formData();
    const userEmail = await resolveAuthenticatedEmail(
      userClient,
      adminClient,
      form.get('user_email')
    );
    if (!userEmail) {
      return new Response(
        JSON.stringify({
          error: 'Sign in to use Recite mode.',
        }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const audio = form.get('audio');
    const prompt = String(form.get('prompt') ?? '').trim();
    const memorizedItemId = String(form.get('memorized_item_id') ?? '').trim() || null;
    const audioSecondsRaw = Number(form.get('audio_seconds'));
    const clientAudioSeconds = Number.isFinite(audioSecondsRaw) ? Math.max(0, audioSecondsRaw) : 0;

    if (!(audio instanceof File)) {
      return new Response(JSON.stringify({ error: 'audio file is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (audio.size > MAX_BYTES) {
      return new Response(JSON.stringify({ error: 'Audio file too large' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: settings, error: settingsError } = await adminClient
      .from('admin_settings')
      .select('memorization_recite_enabled')
      .eq('id', 1)
      .maybeSingle();

    if (settingsError) {
      console.error('admin_settings read failed:', settingsError);
      return new Response(JSON.stringify({ error: 'Could not verify recite settings' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!settings?.memorization_recite_enabled) {
      return new Response(JSON.stringify({ error: 'Recite mode is not enabled' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const openaiForm = new FormData();
    openaiForm.append('file', audio, audio.name || 'recording.webm');
    openaiForm.append('model', WHISPER_MODEL);
    openaiForm.append('language', 'en');
    openaiForm.append('temperature', '0');
    if (prompt) {
      openaiForm.append('prompt', prompt.slice(0, 800));
    }

    const openaiRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: openaiForm,
    });

    const openaiPayload = await openaiRes.json();
    if (!openaiRes.ok) {
      console.error('OpenAI transcription failed:', openaiPayload);
      return new Response(
        JSON.stringify({ error: 'Transcription failed', details: openaiPayload?.error?.message }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transcript = String(openaiPayload?.text ?? '').trim();
    const billedAudioSeconds = resolveBilledAudioSeconds(clientAudioSeconds, audio.size);
    const estimatedCost = (billedAudioSeconds / 60) * WHISPER_RATE_USD_PER_MINUTE;

    const { error: insertError } = await adminClient.from('memorization_recite_usage').insert({
      user_email: userEmail,
      memorized_item_id: memorizedItemId,
      audio_seconds: billedAudioSeconds,
      model: WHISPER_MODEL,
      rate_usd_per_minute: WHISPER_RATE_USD_PER_MINUTE,
      estimated_cost_usd: estimatedCost,
    });

    if (insertError) {
      console.error('usage insert failed:', insertError);
    }

    return new Response(JSON.stringify({ transcript }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('transcribe-audio error:', err);
    return new Response(JSON.stringify({ error: 'Failed to transcribe audio' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
