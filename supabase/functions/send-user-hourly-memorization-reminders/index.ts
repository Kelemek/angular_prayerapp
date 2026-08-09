/**
 * Hourly job: send self memorization reminders.
 * Email when email_subscribers.is_active !== false; push when receive_push + device_tokens.
 * Template: admin_settings.user_hourly_memorization_reminder_template_key → email_templates.
 * Spotlight template fills {{spotlightItemReference}}, {{spotlightItemKind}}, {{spotlightMasteryLevel}},
 * {{spotlightVerseText}}, {{spotlightBlockHtml}} (empty when user has no memorized items).
 * Spotlight picks the item needing the most work (learning tier, least recently practiced, fewest sessions).
 * Verse body: try scripture_cache by memorized_items.reference (legacy human-readable key), then call the
 * `scripture` Edge Function (USFM cache key + upstream fetch) so Learning / uncached passages still include text.
 * Set Edge secret APP_URL to match Angular environment.appUrl in production.
 * Spotlight selection logic is duplicated from src/app/lib/memorization/memorization-reminder-spotlight.ts
 * (single-file bundle required for Supabase Edge deploy; keep both in sync).
 * Email formatting helpers are duplicated from src/app/lib/memorization/memorization-email-format.ts
 * (keep both in sync).
 */
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
  'Access-Control-Max-Age': '86400',
};

const DEFAULT_HOURLY_TEMPLATE_KEY = 'user_hourly_memorization_reminder';
const SPOTLIGHT_TEMPLATE_KEY = 'user_hourly_memorization_reminder_with_spotlight';

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

interface MemorizedItemRow {
  id: string;
  reference: string;
  text: string;
  translation: string;
  kind: 'verse' | 'bibleBooks';
  last_practiced_at: string | null;
  practice_sessions: Array<{ completed?: boolean }> | null;
}

interface SpotlightResult {
  id: string;
  reference: string;
  kind: 'verse' | 'bibleBooks';
  kindLabel: string;
  masteryLevel: string;
  verseText: string;
}

interface MemorizationSpotlightCandidate {
  id: string;
  reference: string;
  kind: 'verse' | 'bibleBooks';
  completedSessions: number;
  lastPracticedAt: string | null;
}

type MasteryTier = 0 | 1 | 2;

function masteryTierFromCompletedCount(completedCount: number): MasteryTier {
  if (completedCount < 3) return 0;
  if (completedCount < 9) return 1;
  return 2;
}

function masteryLevelLabel(tier: MasteryTier): string {
  switch (tier) {
    case 0:
      return 'Learning';
    case 1:
      return 'Practicing';
    case 2:
      return 'Mastered';
    default:
      return 'Learning';
  }
}

function kindLabelForMemorizedItem(kind: 'verse' | 'bibleBooks'): string {
  return kind === 'bibleBooks' ? 'Bible books' : 'Verse';
}

function compareSpotlightCandidates(
  a: MemorizationSpotlightCandidate,
  b: MemorizationSpotlightCandidate
): number {
  const tierA = masteryTierFromCompletedCount(a.completedSessions);
  const tierB = masteryTierFromCompletedCount(b.completedSessions);
  if (tierA !== tierB) return tierA - tierB;

  const lastA = a.lastPracticedAt ? Date.parse(a.lastPracticedAt) : null;
  const lastB = b.lastPracticedAt ? Date.parse(b.lastPracticedAt) : null;
  if (lastA === null && lastB !== null) return -1;
  if (lastA !== null && lastB === null) return 1;
  if (lastA !== null && lastB !== null && lastA !== lastB) return lastA - lastB;

  if (a.completedSessions !== b.completedSessions) {
    return a.completedSessions - b.completedSessions;
  }

  return a.reference.localeCompare(b.reference);
}

function sameSpotlightPriority(
  a: MemorizationSpotlightCandidate,
  b: MemorizationSpotlightCandidate
): boolean {
  const tierA = masteryTierFromCompletedCount(a.completedSessions);
  const tierB = masteryTierFromCompletedCount(b.completedSessions);
  if (tierA !== tierB) return false;

  const lastA = a.lastPracticedAt ? Date.parse(a.lastPracticedAt) : null;
  const lastB = b.lastPracticedAt ? Date.parse(b.lastPracticedAt) : null;
  return lastA === lastB && a.completedSessions === b.completedSessions;
}

function pickMemorizationSpotlightCandidate(
  items: MemorizationSpotlightCandidate[],
  lastSpotlightId: string | null
): MemorizationSpotlightCandidate | null {
  if (items.length === 0) return null;

  const sorted = [...items].sort(compareSpotlightCandidates);
  const best = sorted[0];
  const tied = sorted.filter((item) => sameSpotlightPriority(item, best));

  if (tied.length === 1) return tied[0];

  if (lastSpotlightId) {
    const alternate = tied.filter((item) => item.id !== lastSpotlightId);
    if (alternate.length > 0) return alternate[0];
  }

  return tied[0];
}

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

function hourlyReminderFallbackParts(appLink: string): {
  subject: string;
  textBody: string;
  htmlBody: string;
} {
  return {
    subject: 'Memorization reminder',
    textBody: `Take a moment to practice your verses.\n\nOpen the app: ${appLink}\n`,
    htmlBody: `<p>Take a moment to practice your verses.</p><p><a href="${appLink}">Open the Memorize tab</a></p>`,
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

function truncateText(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen - 1)}...`;
}

/** Mirror src/app/lib/memorization/memorization-email-format.ts — keep in sync. */
const BIBLE_BOOK_NAMES_LONGEST_FIRST = [
  'Song of Solomon',
  '1 Thessalonians',
  '2 Thessalonians',
  '1 Corinthians',
  '2 Corinthians',
  '1 Chronicles',
  '2 Chronicles',
  'Lamentations',
  'Ecclesiastes',
  'Deuteronomy',
  'Philippians',
  'Habakkuk',
  'Zephaniah',
  'Zechariah',
  'Revelation',
  'Genesis',
  'Exodus',
  'Leviticus',
  'Numbers',
  'Joshua',
  'Judges',
  'Ezra',
  'Nehemiah',
  'Esther',
  'Psalms',
  'Proverbs',
  'Isaiah',
  'Jeremiah',
  'Ezekiel',
  'Daniel',
  'Hosea',
  'Joel',
  'Amos',
  'Obadiah',
  'Jonah',
  'Micah',
  'Nahum',
  'Haggai',
  'Malachi',
  'Matthew',
  'Galatians',
  'Ephesians',
  'Colossians',
  'Philemon',
  'Hebrews',
  'Ruth',
  'Job',
  'Acts',
  'Romans',
  'Titus',
  'James',
  'Jude',
  'Mark',
  'Luke',
  'John',
  '1 Samuel',
  '2 Samuel',
  '1 Kings',
  '2 Kings',
  '1 Timothy',
  '2 Timothy',
  '1 Peter',
  '2 Peter',
  '1 John',
  '2 John',
  '3 John',
].sort((a, b) => b.length - a.length);

function normalizeScriptureTextForEmail(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');
}

function parseBibleBooksPlainText(plain: string): string[] {
  const books: string[] = [];
  let remaining = plain.trim();
  while (remaining.length > 0) {
    const name = BIBLE_BOOK_NAMES_LONGEST_FIRST.find(
      (n) => remaining === n || remaining.startsWith(`${n} `)
    );
    if (!name) break;
    books.push(name);
    remaining = remaining.slice(name.length).trimStart();
  }
  return books;
}

function formatBibleBooksForEmailPlain(plain: string): string {
  return parseBibleBooksPlainText(plain)
    .map((name) => name.replace(/ /g, '\u00A0'))
    .join(' ');
}

function formatBibleBooksForEmailHtml(plain: string): string {
  return parseBibleBooksPlainText(plain)
    .map(
      (name) =>
        `<span style="white-space:nowrap;">${escapeHtml(name)}</span>`
    )
    .join(' ');
}

function formatVerseTextForEmailHtml(text: string): string {
  const normalized = normalizeScriptureTextForEmail(text);
  return normalized
    .split('\n\n')
    .map((paragraph) => escapeHtml(paragraph))
    .join('<br><br>');
}

function formatSpotlightBodyForEmailHtml(
  kind: 'verse' | 'bibleBooks',
  text: string
): string {
  if (!text.trim()) return '';
  if (kind === 'bibleBooks') {
    return formatBibleBooksForEmailHtml(text);
  }
  return formatVerseTextForEmailHtml(text);
}

function formatSpotlightBodyForEmailPlain(
  kind: 'verse' | 'bibleBooks',
  text: string
): string {
  if (!text.trim()) return '';
  if (kind === 'bibleBooks') {
    return formatBibleBooksForEmailPlain(text);
  }
  return normalizeScriptureTextForEmail(text);
}

function countCompletedSessions(
  sessions: Array<{ completed?: boolean }> | null | undefined
): number {
  return (sessions ?? []).filter((s) => s.completed === true).length;
}

function buildSpotlightBlockHtml(spotlight: SpotlightResult | null): string {
  if (!spotlight) return '';
  const bodyHtml = spotlight.verseText
    ? formatSpotlightBodyForEmailHtml(
        spotlight.kind,
        truncateText(spotlight.verseText, 1200)
      )
    : '';
  const textHtml = bodyHtml
    ? `<div style="background-color:#ecfdf5;padding:15px;border-radius:6px;border-left:4px solid #10b981;margin:15px 0 0;"><p style="margin:0;">${bodyHtml}</p></div>`
    : '';
  return `<h2 style="color:#1f2937;margin-top:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">${escapeHtml(
    spotlight.reference
  )}</h2><p style="margin:5px 0 15px 0;"><strong>${escapeHtml(
    spotlight.kindLabel
  )}</strong> · <strong>${escapeHtml(spotlight.masteryLevel)}</strong></p>${textHtml}`;
}

function applyTemplateVariables(content: string, variables: Record<string, string>): string {
  let result = content;
  for (const [key, value] of Object.entries(variables)) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(`{{\\s*${escapedKey}\\s*}}`, 'g'), value ?? '');
  }
  return result;
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

  const appUrl = normalizeAppUrl(Deno.env.get('APP_URL'), 'http://localhost:4200');
  const appLink = `${appUrl}/?filter=memorize`;
  const pushTitle = 'Memorization reminder';

  try {
    const { data: adminRow, error: adminErr } = await supabase
      .from('admin_settings')
      .select('user_hourly_memorization_reminder_template_key')
      .eq('id', 1)
      .maybeSingle();

    if (adminErr) {
      console.error('admin_settings read failed:', adminErr);
    }

    const requestedTemplateKey =
      (adminRow as { user_hourly_memorization_reminder_template_key?: string } | null)
        ?.user_hourly_memorization_reminder_template_key ?? DEFAULT_HOURLY_TEMPLATE_KEY;

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
        'email_templates memorization hourly reminder not found; using inline fallback.'
      );
    }

    const useSpotlightVariables = activeTemplateKey === SPOTLIGHT_TEMPLATE_KEY;

    const { data: dueRows, error: rpcError } = await supabase.rpc(
      'get_user_memorization_hour_reminders_due_now'
    );

    if (rpcError) {
      console.error('RPC get_user_memorization_hour_reminders_due_now failed:', rpcError);
      return new Response(
        JSON.stringify({ error: 'Failed to load due reminders', details: rpcError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rows = (dueRows ?? []) as ReminderRow[];
    if (rows.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No user memorization reminders due this hour',
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
      .select(
        'email, receive_push, is_active, is_blocked, hourly_memorization_reminder_last_spotlight_key'
      )
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
        | {
            email: string;
            receive_push: boolean | null;
            is_active: boolean | null;
            is_blocked: boolean | null;
            hourly_memorization_reminder_last_spotlight_key?: string | null;
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

      let spotlight: SpotlightResult | null = null;
      if (useSpotlightVariables) {
        spotlight = await loadSpotlightForRecipient(
          supabase,
          supabaseUrl,
          serviceKey,
          recipient,
          sub.hourly_memorization_reminder_last_spotlight_key ?? null
        );
      }

      const spotlightBlockHtml = buildSpotlightBlockHtml(spotlight);

      const spotlightPlain = spotlight
        ? {
            spotlightItemReference: spotlight.reference,
            spotlightItemKind: spotlight.kindLabel,
            spotlightMasteryLevel: spotlight.masteryLevel,
            spotlightVerseText: truncateText(
              formatSpotlightBodyForEmailPlain(spotlight.kind, spotlight.verseText),
              1200
            ),
          }
        : {
            spotlightItemReference: '',
            spotlightItemKind: '',
            spotlightMasteryLevel: '',
            spotlightVerseText: '',
          };

      const spotlightSafeHtml = spotlight
        ? {
            spotlightItemReference: escapeHtml(spotlight.reference),
            spotlightItemKind: escapeHtml(spotlight.kindLabel),
            spotlightMasteryLevel: escapeHtml(spotlight.masteryLevel),
            spotlightVerseText: escapeHtml(
              truncateText(
                formatSpotlightBodyForEmailPlain(spotlight.kind, spotlight.verseText),
                1200
              )
            ),
          }
        : {
            spotlightItemReference: '',
            spotlightItemKind: '',
            spotlightMasteryLevel: '',
            spotlightVerseText: '',
          };

      const variablesHtml: Record<string, string> = {
        appLink,
        ...spotlightSafeHtml,
        spotlightBlockHtml,
      };
      const variablesText: Record<string, string> = {
        appLink,
        ...spotlightPlain,
        spotlightBlockHtml: '',
      };

      const pushBody =
        spotlight && useSpotlightVariables
          ? truncateText(
              `${spotlight.reference} — ${spotlight.masteryLevel}`,
              140
            )
          : 'Take a moment to practice your verses.';

      let pushDelivered = false;
      if (wantPush) {
        const { error: pushErr } = await supabase.functions.invoke('send-push-notification', {
          body: {
            emails: [recipient],
            title: pushTitle,
            body: pushBody,
            data: {
              type: 'memorization_reminder',
              url: appLink,
            },
          },
        });
        if (pushErr) {
          console.error('Push failed for', recipient, pushErr);
          errors.push(`${recipient} push: ${pushErr.message ?? String(pushErr)}`);
        } else {
          pushesSent++;
          pushDelivered = true;
        }
      }

      let emailDelivered = false;
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
          emailDelivered = true;
        }
      }

      if (activeTemplateKey === SPOTLIGHT_TEMPLATE_KEY && (pushDelivered || emailDelivered)) {
        const nextKey = spotlight?.id ?? null;
        const { error: spotErr } = await supabase
          .from('email_subscribers')
          .update({ hourly_memorization_reminder_last_spotlight_key: nextKey })
          .eq('email', recipient);
        if (spotErr) {
          console.error(
            'hourly_memorization_reminder_last_spotlight_key update failed',
            recipient,
            spotErr
          );
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Hourly user memorization reminders processed',
        matched: uniqueEmails.length,
        rowCount: rows.length,
        pushesSent,
        emailsSent,
        errors: errors.length ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    console.error('send-user-hourly-memorization-reminders:', e);
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
 * Resolve passage text for a verse spotlight item.
 * Fast path: legacy human-readable scripture_cache key (matches memorized_items.reference).
 * Fallback: `scripture` Edge Function (tries USFM + legacy keys, then upstream API).
 */
async function resolveSpotlightVerseText(
  supabase: SupabaseClient<any>,
  supabaseUrl: string,
  serviceKey: string,
  reference: string,
  translation: string
): Promise<string> {
  const translationCode = (translation || 'esv').toLowerCase();

  const { data: cached, error: cacheErr } = await supabase
    .from('scripture_cache')
    .select('text')
    .eq('reference', reference)
    .eq('translation', translationCode)
    .maybeSingle();
  if (cacheErr) {
    console.error('scripture_cache lookup failed', cacheErr);
  }
  const cachedText = (cached as { text?: string } | null)?.text?.trim() ?? '';
  if (cachedText) {
    return normalizeScriptureTextForEmail(cachedText);
  }

  try {
    const url = new URL(`${supabaseUrl}/functions/v1/scripture`);
    url.searchParams.set('reference', reference);
    url.searchParams.set('translation', translationCode);
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('scripture fetch for memorization spotlight failed', res.status, body);
      return '';
    }
    const payload = (await res.json()) as { text?: string };
    return normalizeScriptureTextForEmail(payload.text?.trim() ?? '');
  } catch (e) {
    console.error('scripture fetch for memorization spotlight threw', e);
    return '';
  }
}

async function loadSpotlightForRecipient(
  supabase: SupabaseClient<any>,
  supabaseUrl: string,
  serviceKey: string,
  recipientEmail: string,
  lastSpotlightId: string | null
): Promise<SpotlightResult | null> {
  const { data: rows, error } = await supabase
    .from('memorized_items')
    .select('id, reference, text, translation, kind, last_practiced_at, practice_sessions')
    .ilike('user_email', recipientEmail);

  if (error) {
    console.error('memorized_items query failed', error);
    return null;
  }

  const candidates: MemorizationSpotlightCandidate[] = (rows ?? []).map(
    (row: MemorizedItemRow) => ({
      id: row.id,
      reference: row.reference,
      kind: row.kind,
      completedSessions: countCompletedSessions(row.practice_sessions),
      lastPracticedAt: row.last_practiced_at,
    })
  );

  const picked = pickMemorizationSpotlightCandidate(candidates, lastSpotlightId);
  if (!picked) return null;

  const row = (rows ?? []).find((r: MemorizedItemRow) => r.id === picked.id) as
    | MemorizedItemRow
    | undefined;
  if (!row) return null;

  let verseText = '';
  if (row.kind === 'bibleBooks') {
    verseText = row.text?.trim() ?? '';
  } else {
    verseText = await resolveSpotlightVerseText(
      supabase,
      supabaseUrl,
      serviceKey,
      row.reference,
      row.translation || 'esv'
    );
  }

  const tier = masteryTierFromCompletedCount(picked.completedSessions);

  return {
    id: picked.id,
    reference: picked.reference,
    kind: row.kind,
    kindLabel: kindLabelForMemorizedItem(picked.kind),
    masteryLevel: masteryLevelLabel(tier),
    verseText,
  };
}
