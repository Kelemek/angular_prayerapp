/**
 * Hourly job: send self prayer reminders.
 * Email when email_subscribers.is_active !== false (matches UserSessionData.isActive).
 * Push when receive_push and a device_tokens row exists (matches receivePush + native token).
 * Both run when both are enabled.
 * Email body uses email_templates.user_hourly_prayer_reminder with {{appLink}} (same pattern as send-verification-code).
 * Set Edge secret APP_URL to match Angular environment.appUrl in production.
 * If APP_URL is host-only (no https://), it is prefixed with https:// so mail clients do not rewrite links to x-webdoc://…
 * Auth matches send-prayer-reminders: Supabase Edge JWT verification only.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
  'Access-Control-Max-Age': '86400',
};

interface ReminderRow {
  id: string;
  user_email: string;
  iana_timezone: string;
  local_hour: number;
}

/** Absolute http(s) base for email <a href>; host-only values get https:// (avoids x-webdoc:// in Apple Mail). */
function normalizeAppUrl(raw: string | undefined, fallback: string): string {
  let u = (raw ?? fallback).trim().replace(/\/+$/, '');
  if (!/^https?:\/\//i.test(u)) {
    if (/^localhost\b/i.test(u) || /^127\.0\.0\.1\b/.test(u)) {
      u = `http://${u}`;
    } else {
      u = `https://${u}`;
    }
  }
  return u;
}

/** When email_templates row is missing (migration not applied). */
function hourlyReminderFallbackParts(appLink: string): {
  subject: string;
  textBody: string;
  htmlBody: string;
} {
  return {
    subject: 'Prayer reminder',
    textBody: `Take a moment to pray.\n\nOpen the app: ${appLink}\n`,
    htmlBody: `<p>Take a moment to pray.</p><p><a href="${appLink}">Open the prayer app</a></p>`,
  };
}

serve(async (req) => {
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

  const appUrl = normalizeAppUrl(Deno.env.get('APP_URL'), 'http://localhost:4200');
  const appLink = `${appUrl}/`;
  const pushTitle = 'Prayer reminder';
  const pushBody = 'Take a moment to pray.';

  try {
    const { data: dueRows, error: rpcError } = await supabase.rpc(
      'get_user_prayer_hour_reminders_due_now'
    );

    if (rpcError) {
      console.error('RPC get_user_prayer_hour_reminders_due_now failed:', rpcError);
      return new Response(
        JSON.stringify({ error: 'Failed to load due reminders', details: rpcError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rows = (dueRows ?? []) as ReminderRow[];
    if (rows.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No user prayer reminders due this hour',
          matched: 0,
          pushesSent: 0,
          emailsSent: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: hourlyTemplate } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_key', 'user_hourly_prayer_reminder')
      .maybeSingle();

    if (!hourlyTemplate) {
      console.warn(
        'email_templates.user_hourly_prayer_reminder not found; using inline fallback. Run migration or add template in admin.'
      );
    }

    const byLower = new Map<string, string>();
    for (const r of rows) {
      const k = r.user_email.toLowerCase();
      if (!byLower.has(k)) byLower.set(k, r.user_email);
    }
    const uniqueEmails = [...byLower.values()];

    const { data: subscribers, error: subErr } = await supabase
      .from('email_subscribers')
      .select('email, receive_push, is_active, is_blocked')
      .in('email', uniqueEmails);

    if (subErr) {
      console.error('email_subscribers batch failed:', subErr);
      return new Response(
        JSON.stringify({ error: 'Failed to load subscribers', details: subErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const subByLower = new Map(
      (subscribers ?? []).map((s: { email: string }) => [s.email.toLowerCase(), s])
    );

    const { data: tokenRows, error: tokErr } = await supabase
      .from('device_tokens')
      .select('user_email')
      .in('user_email', uniqueEmails);

    if (tokErr) {
      console.error('device_tokens batch failed:', tokErr);
      return new Response(
        JSON.stringify({ error: 'Failed to load device tokens', details: tokErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hasToken = new Set(
      (tokenRows ?? []).map((t: { user_email: string }) => t.user_email.toLowerCase())
    );

    let pushesSent = 0;
    let emailsSent = 0;
    const errors: string[] = [];

    for (const canonicalEmail of uniqueEmails) {
      const sub = subByLower.get(canonicalEmail.toLowerCase()) as
        | { email: string; receive_push: boolean | null; is_active: boolean | null; is_blocked: boolean | null }
        | undefined;

      if (!sub || sub.is_blocked) {
        continue;
      }

      const recipient = sub.email;
      const lower = recipient.toLowerCase();
      // Align with UserSessionService: is_active ?? true for "email subscription"
      const wantEmail = sub.is_active !== false;
      const wantPush = !!sub.receive_push && hasToken.has(lower);

      if (!wantEmail && !wantPush) {
        continue;
      }

      if (wantPush) {
        const { error: pushErr } = await supabase.functions.invoke('send-push-notification', {
          body: {
            emails: [recipient],
            title: pushTitle,
            body: pushBody,
            data: {
              type: 'prayer_reminder',
              url: appLink,
            },
          },
        });
        if (pushErr) {
          console.error('Push failed for', recipient, pushErr);
          errors.push(`${recipient} push: ${pushErr.message ?? String(pushErr)}`);
        } else {
          pushesSent++;
        }
      }

      if (wantEmail) {
        const variables: Record<string, string> = { appLink };
        let subject: string;
        let textBody: string;
        let htmlBody: string;
        if (hourlyTemplate) {
          subject = applyTemplateVariables(hourlyTemplate.subject, variables);
          textBody = applyTemplateVariables(hourlyTemplate.text_body, variables);
          htmlBody = applyTemplateVariables(hourlyTemplate.html_body, variables);
        } else {
          const fb = hourlyReminderFallbackParts(appLink);
          subject = fb.subject;
          textBody = fb.textBody;
          htmlBody = fb.htmlBody;
        }

        const { error: mailErr } = await supabase.functions.invoke('send-email', {
          body: {
            to: recipient,
            subject,
            textBody,
            htmlBody,
          },
        });
        if (mailErr) {
          console.error('Email failed for', recipient, mailErr);
          errors.push(`${recipient} email: ${mailErr.message ?? String(mailErr)}`);
        } else {
          emailsSent++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Hourly user prayer reminders processed',
        matched: uniqueEmails.length,
        rowCount: rows.length,
        pushesSent,
        emailsSent,
        errors: errors.length ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('send-user-hourly-prayer-reminders:', e);
    return new Response(
      JSON.stringify({
        error: 'Unexpected error',
        details: e instanceof Error ? e.message : String(e),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Replace template variables with actual values
 * Supports {{variableName}} syntax
 */
function applyTemplateVariables(content: string, variables: Record<string, string>): string {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  }
  return result;
}
