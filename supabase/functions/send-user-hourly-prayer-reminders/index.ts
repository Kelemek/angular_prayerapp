/**
 * Hourly job: send self prayer reminders.
 * Email when email_subscribers.is_active !== false (matches UserSessionData.isActive).
 * Push when receive_push and a device_tokens row exists (matches receivePush + native token).
 * Both run when both are enabled.
 * Template: admin_settings.user_hourly_prayer_reminder_template_key → email_templates (default user_hourly_prayer_reminder).
 * Spotlight template fills {{spotlightPrayerKind}}, {{spotlightPrayerTitle}}, {{spotlightPrayerFor}}, {{spotlightPrayerDescription}},
 * {{updateContent}}, {{spotlightUpdateBlockHtml}} (Update subsection HTML; empty if no update), {{spotlightLatestUpdateHtml}} (alias), {{spotlightUpdateTextSection}}.
 * Random prayer from the last 14 days; previous pick avoided when possible.
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

const SPOTLIGHT_WINDOW_DAYS = 14;
const DEFAULT_HOURLY_TEMPLATE_KEY = 'user_hourly_prayer_reminder';
const SPOTLIGHT_TEMPLATE_KEY = 'user_hourly_prayer_reminder_with_spotlight';

interface ReminderRow {
  id: string;
  user_email: string;
  iana_timezone: string;
  local_hour: number;
}

interface EmailTemplateRow {
  subject: string;
  text_body: string;
  html_body: string;
}

interface SpotlightCandidate {
  key: string;
  title: string;
  prayerFor: string;
  description: string;
  kindLabel: string;
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripHtmlToText(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function truncateText(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen - 1)}…`;
}

function pickSpotlightCandidate(
  candidates: SpotlightCandidate[],
  excludeKey: string | null
): SpotlightCandidate | null {
  if (candidates.length === 0) return null;
  let pool = candidates;
  if (excludeKey && candidates.length > 1) {
    const filtered = candidates.filter((c) => c.key !== excludeKey);
    if (filtered.length > 0) pool = filtered;
  }
  const idx = Math.floor(Math.random() * pool.length);
  return pool[idx] ?? null;
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

  try {
    const { data: adminRow, error: adminErr } = await supabase
      .from('admin_settings')
      .select('user_hourly_prayer_reminder_template_key')
      .eq('id', 1)
      .maybeSingle();

    if (adminErr) {
      console.error('admin_settings read failed:', adminErr);
    }

    const requestedTemplateKey =
      (adminRow as { user_hourly_prayer_reminder_template_key?: string } | null)
        ?.user_hourly_prayer_reminder_template_key ?? DEFAULT_HOURLY_TEMPLATE_KEY;

    let hourlyTemplate: EmailTemplateRow | null = null;
    let activeTemplateKey = requestedTemplateKey;

    const { data: primaryTpl } = await supabase
      .from('email_templates')
      .select('subject, text_body, html_body, template_key')
      .eq('template_key', requestedTemplateKey)
      .maybeSingle();

    if (primaryTpl) {
      hourlyTemplate = primaryTpl as EmailTemplateRow;
    } else {
      console.warn(`email_templates missing key ${requestedTemplateKey}; trying default.`);
      const { data: fallbackTpl } = await supabase
        .from('email_templates')
        .select('subject, text_body, html_body')
        .eq('template_key', DEFAULT_HOURLY_TEMPLATE_KEY)
        .maybeSingle();
      if (fallbackTpl) {
        hourlyTemplate = fallbackTpl as EmailTemplateRow;
        activeTemplateKey = DEFAULT_HOURLY_TEMPLATE_KEY;
      }
    }

    if (!hourlyTemplate) {
      console.warn(
        'email_templates hourly reminder not found; using inline fallback. Run migration or add template in admin.'
      );
    }

    const useSpotlightVariables = activeTemplateKey === SPOTLIGHT_TEMPLATE_KEY;

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

    const byLower = new Map<string, string>();
    for (const r of rows) {
      const k = r.user_email.toLowerCase();
      if (!byLower.has(k)) byLower.set(k, r.user_email);
    }
    const uniqueEmails = [...byLower.values()];

    const { data: subscribers, error: subErr } = await supabase
      .from('email_subscribers')
      .select('email, receive_push, is_active, is_blocked, hourly_reminder_last_spotlight_key')
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

    const cutoffIso = new Date(
      Date.now() - SPOTLIGHT_WINDOW_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    let pushesSent = 0;
    let emailsSent = 0;
    const errors: string[] = [];

    for (const canonicalEmail of uniqueEmails) {
      const sub = subByLower.get(canonicalEmail.toLowerCase()) as
        | {
            email: string;
            receive_push: boolean | null;
            is_active: boolean | null;
            is_blocked: boolean | null;
            hourly_reminder_last_spotlight_key?: string | null;
          }
        | undefined;

      if (!sub || sub.is_blocked) {
        continue;
      }

      const recipient = sub.email;
      const lower = recipient.toLowerCase();
      const wantEmail = sub.is_active !== false;
      const wantPush = !!sub.receive_push && hasToken.has(lower);

      if (!wantEmail && !wantPush) {
        continue;
      }

      let spotlight: SpotlightCandidate | null = null;
      if (useSpotlightVariables) {
        spotlight = await loadSpotlightCandidate(
          supabase,
          recipient,
          cutoffIso,
          sub.hourly_reminder_last_spotlight_key ?? null
        );
      }

      let updatePlain = '';
      if (spotlight && useSpotlightVariables) {
        updatePlain = truncateText(await fetchLatestUpdatePlain(supabase, spotlight.key), 2000);
      }

      /** Full “Update” subsection (label + inner white box); empty when no update so email omits the block. */
      const spotlightUpdateBlockHtml = updatePlain
        ? `<p style="margin: 15px 0 10px 0;"><strong>Update</strong></p><div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6; margin: 0;"><p style="margin: 0; white-space: pre-wrap;">${escapeHtml(
            updatePlain
          )}</p></div>`
        : '';

      /** Legacy alias for custom templates that still reference {{spotlightLatestUpdateHtml}}. */
      const spotlightLatestUpdateHtml = spotlightUpdateBlockHtml;

      const spotlightUpdateTextSection = updatePlain ? `\n\nLatest update:\n${updatePlain}\n` : '';

      const spotlightPlain = spotlight
        ? {
            spotlightPrayerKind: spotlight.kindLabel,
            spotlightPrayerTitle: spotlight.title,
            spotlightPrayerFor: spotlight.prayerFor,
            spotlightPrayerDescription: truncateText(
              stripHtmlToText(spotlight.description),
              600
            ),
            updateContent: updatePlain,
            spotlightUpdateTextSection,
          }
        : {
            spotlightPrayerKind: '',
            spotlightPrayerTitle: '',
            spotlightPrayerFor: '',
            spotlightPrayerDescription: '',
            updateContent: '',
            spotlightUpdateTextSection: '',
          };

      const spotlightSafeHtml = spotlight
        ? {
            spotlightPrayerKind: escapeHtml(spotlight.kindLabel),
            spotlightPrayerTitle: escapeHtml(spotlight.title),
            spotlightPrayerFor: escapeHtml(spotlight.prayerFor),
            spotlightPrayerDescription: escapeHtml(
              truncateText(stripHtmlToText(spotlight.description), 600)
            ),
            updateContent: escapeHtml(updatePlain),
          }
        : {
            spotlightPrayerKind: '',
            spotlightPrayerTitle: '',
            spotlightPrayerFor: '',
            spotlightPrayerDescription: '',
            updateContent: '',
          };

      const variablesHtml: Record<string, string> = {
        appLink,
        ...spotlightSafeHtml,
        spotlightUpdateBlockHtml,
        spotlightLatestUpdateHtml,
      };
      const variablesText: Record<string, string> = {
        appLink,
        ...spotlightPlain,
        spotlightUpdateBlockHtml: '',
        spotlightLatestUpdateHtml: '',
      };

      const pushBody =
        spotlight && useSpotlightVariables
          ? truncateText(
              `${spotlight.title} — ${spotlight.kindLabel}${
                updatePlain ? ` — ${truncateText(updatePlain, 80)}` : ''
              }`,
              140
            )
          : 'Take a moment to pray.';

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
        let subject: string;
        let textBody: string;
        let htmlBody: string;
        if (hourlyTemplate) {
          subject = applyTemplateVariables(hourlyTemplate.subject, variablesText);
          textBody = applyTemplateVariables(hourlyTemplate.text_body, variablesText);
          htmlBody = applyTemplateVariables(hourlyTemplate.html_body, variablesHtml);
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
          if (activeTemplateKey === SPOTLIGHT_TEMPLATE_KEY) {
            const nextKey = spotlight?.key ?? null;
            const { error: spotErr } = await supabase
              .from('email_subscribers')
              .update({ hourly_reminder_last_spotlight_key: nextKey })
              .eq('email', recipient);
            if (spotErr) {
              console.error('hourly_reminder_last_spotlight_key update failed', recipient, spotErr);
            }
          }
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

async function loadSpotlightCandidate(
  supabase: ReturnType<typeof createClient>,
  recipientEmail: string,
  cutoffIso: string,
  lastSpotlightKey: string | null
): Promise<SpotlightCandidate | null> {
  // PostgREST: unquoted ISO after gte./lt. (same pattern as prayer.service.ts getPrayersByMonth); quoted values can misparse.
  const cutoffOr = `created_at.gte.${cutoffIso},updated_at.gte.${cutoffIso}`;

  const { data: commRows, error: cErr } = await supabase
    .from('prayers')
    .select('id, title, description, prayer_for, created_at, updated_at')
    .ilike('email', recipientEmail)
    .eq('approval_status', 'approved')
    .eq('status', 'current')
    .or(cutoffOr);

  if (cErr) {
    console.error('spotlight community prayers query failed', cErr);
  }

  const { data: persRows, error: pErr } = await supabase
    .from('personal_prayers')
    .select('id, title, description, prayer_for, category, created_at, updated_at')
    .ilike('user_email', recipientEmail)
    .or(cutoffOr);

  if (pErr) {
    console.error('spotlight personal prayers query failed', pErr);
  }

  const candidates: SpotlightCandidate[] = [];

  for (const p of commRows ?? []) {
    const row = p as {
      id: string;
      title: string;
      description: string | null;
      prayer_for: string | null;
    };
    candidates.push({
      key: `c:${row.id}`,
      title: row.title ?? '',
      prayerFor: row.prayer_for ?? '',
      description: row.description ?? '',
      kindLabel: 'Community prayer',
    });
  }

  for (const p of persRows ?? []) {
    const row = p as {
      id: string;
      title: string;
      description: string | null;
      prayer_for: string | null;
      category: string | null;
    };
    if (row.category === 'Answered') continue;
    candidates.push({
      key: `p:${row.id}`,
      title: row.title ?? '',
      prayerFor: row.prayer_for ?? '',
      description: row.description ?? '',
      kindLabel: 'Personal prayer',
    });
  }

  return pickSpotlightCandidate(candidates, lastSpotlightKey);
}

/** Latest approved community update or latest personal update (plain text, not truncated). */
async function fetchLatestUpdatePlain(
  supabase: ReturnType<typeof createClient>,
  spotlightKey: string
): Promise<string> {
  const colon = spotlightKey.indexOf(':');
  if (colon < 1) return '';
  const kind = spotlightKey.slice(0, colon);
  const id = spotlightKey.slice(colon + 1);
  if (!id) return '';

  if (kind === 'c') {
    const { data, error } = await supabase
      .from('prayer_updates')
      .select('content')
      .eq('prayer_id', id)
      .eq('approval_status', 'approved')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error('fetchLatestUpdatePlain community', error);
      return '';
    }
    const raw = data?.content;
    return raw ? stripHtmlToText(raw) : '';
  }

  if (kind === 'p') {
    const { data, error } = await supabase
      .from('personal_prayer_updates')
      .select('content')
      .eq('personal_prayer_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error('fetchLatestUpdatePlain personal', error);
      return '';
    }
    const raw = data?.content;
    return raw ? stripHtmlToText(raw) : '';
  }

  return '';
}

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
