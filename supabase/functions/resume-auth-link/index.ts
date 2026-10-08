// @ts-nocheck - Deno Edge Function
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { verifyAuthResumeToken } from '../shared/auth-resume-token.ts';
import { mintSubscriberMagicLinkToken } from '../shared/mint-subscriber-magic-link.ts';

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { email, auth_resume_token } = await req.json();
    const emailNormalized = (email || '').toLowerCase().trim();
    if (!emailNormalized || !emailNormalized.includes('@')) {
      return new Response(JSON.stringify({ error: 'Invalid email' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const resumeToken =
      typeof auth_resume_token === 'string' ? auth_resume_token.trim() : '';
    if (!resumeToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const tokenCheck = await verifyAuthResumeToken(resumeToken, emailNormalized);
    if (!tokenCheck.ok) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const emailKey = `email:${emailNormalized}`;
    const ipKey = `ip:${clientIp(req)}`;
    if (isRateLimited(emailKey, RATE_MAX_PER_EMAIL) || isRateLimited(ipKey, RATE_MAX_PER_IP)) {
      return new Response(JSON.stringify({ error: 'Too many attempts. Try again later.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    recordAttempt(emailKey);
    recordAttempt(ipKey);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: subscriber } = await supabase
      .from('email_subscribers')
      .select('auth_linked_at')
      .eq('email', emailNormalized)
      .maybeSingle();

    const minted = await mintSubscriberMagicLinkToken(supabase, emailNormalized);
    if (!minted.ok) {
      return new Response(JSON.stringify({ error: minted.error }), {
        status: minted.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        hashed_token: minted.hashed_token,
        email: emailNormalized,
        already_linked: subscriber?.auth_linked_at != null,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  } catch (error) {
    console.error('resume-auth-link error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
});
