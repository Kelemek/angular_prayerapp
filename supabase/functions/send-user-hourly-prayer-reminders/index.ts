import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';
import { Marked } from 'https://esm.sh/marked@15.0.12';

// ----- TipTap markdown → safe HTML (inline; keep aligned with src/lib/edge-email-markdown.ts) -----
/** TipTap hard breaks: `\` + newline or two spaces + newline → plain newline. */
function normalizeMarkdownHardBreaks(markdown: string): string {
  return markdown.replace(/\\(\r?\n)/g, '\n').replace(/ {2,}(\r?\n)/g, '\n');
}

/**
 * TipTap's Underline mark serializes as ++text++. Expand to `<u>` before `marked`
 * (skipping fenced code blocks so literal ++ in code is preserved).
 */
function expandTiptapUnderlineForMarked(markdown: string): string {
  const segments = markdown.split(/(```[\s\S]*?```)/g);
  return segments
    .map((segment) => {
      if (segment.startsWith('```')) return segment;
      return segment.replace(/\+\+([\s\S]+?)\+\+/g, '<u>$1</u>');
    })
    .join('');
}

/** marked emits `<del>` for GFM strikethrough; our allowlist uses `<s>`. */
function normalizeMarkedDelToStrike(html: string): string {
  return html.replace(/<\/?del\b([^>]*)>/gi, (tag) => tag.replace(/del/gi, 's'));
}

function preprocessMarkdownForMarked(markdown: string): string {
  return expandTiptapUnderlineForMarked(normalizeMarkdownHardBreaks(markdown));
}

/**
 * Strip markdown syntax to plain text; preserves paragraph breaks (does not collapse whitespace).
 */
function stripMarkdownSyntaxToPlainText(markdown: string): string {
  let text = normalizeMarkdownHardBreaks(markdown);
  text = text.replace(/```[\s\S]*?```/g, (m) => m.replace(/```/g, '').trim());
  text = text.replace(/`([^`]+)`/g, '$1');
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
  text = text.replace(/(\*\*\*|___)(.*?)\1/g, '$2');
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
  text = text.replace(/(\*|_)(.*?)\1/g, '$2');
  text = text.replace(/~~(.*?)~~/g, '$1');
  text = text.replace(/\+\+([\s\S]+?)\+\+/g, '$1');
  text = text.replace(/^\s{0,3}#{1,6}\s+/gm, '');
  text = text.replace(/^\s{0,3}>\s?/gm, '');
  text = text.replace(/^\s*[-*+]\s+/gm, '');
  text = text.replace(/^\s*\d+\.\s+/gm, '');
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

const MARKDOWN_ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'u',
  's',
  'ol',
  'ul',
  'li',
  'blockquote',
  'h3',
  'h4',
  'code',
  'pre',
  'a',
  'hr',
  'img',
];

const MARKDOWN_ALLOWED_ATTR = [
  'href',
  'title',
  'target',
  'rel',
  'style',
  'src',
  'alt',
  'width',
  'height',
];
const MARKDOWN_ALLOWED_TAG_SET = new Set(MARKDOWN_ALLOWED_TAGS);
const MARKDOWN_VOID_TAGS = new Set(['br', 'hr', 'img']);

const MARKDOWN_INLINE_STYLES: Record<string, string> = {
  BLOCKQUOTE:
    'margin: 0.75rem 0; padding: 0.25rem 0.75rem 0.25rem 1rem; border-left: 3px solid rgba(57, 112, 77, 0.5); opacity: 0.9;',
  U: 'text-decoration: underline;',
  IMG: 'display:block;max-width:100%;height:auto;border:0;border-radius:8px;margin:12px 0;',
  UL: 'margin: 0.5rem 0; padding-left: 1.5rem;',
  OL: 'margin: 0.5rem 0; padding-left: 1.5rem;',
  LI: 'margin: 0.25rem 0;',
  P: 'margin: 0.5rem 0;',
};

let markedParser: Marked | null = null;

function getMarked(): Marked {
  if (!markedParser) {
    markedParser = new Marked({ gfm: true, breaks: true });
  }
  return markedParser;
}

function isSafeHref(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return false;
  if (trimmed.startsWith('javascript:')) return false;
  if (trimmed.startsWith('data:') && !trimmed.startsWith('data:text/plain')) return false;
  if (trimmed.startsWith('vbscript:')) return false;
  return true;
}

function isSafeImageSrc(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('vbscript:') || lower.startsWith('data:')) {
    return false;
  }
  if (lower.startsWith('https://')) return true;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true;
  return false;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function sanitizeAttrString(tagName: string, attrRaw: string): string {
  const attrs: string[] = [];
  const seen = new Set<string>();
  const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*(?:=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match: RegExpExecArray | null;
  while ((match = attrRe.exec(attrRaw)) !== null) {
    const name = match[1].toLowerCase();
    if (name === 'class' || name === 'id' || !MARKDOWN_ALLOWED_ATTR.includes(name)) continue;
    const value = match[3] ?? match[4] ?? match[5] ?? '';
    if (name === 'href' && !isSafeHref(value)) continue;
    if (name === 'src' && !isSafeImageSrc(value)) continue;
    if (seen.has(name)) continue;
    seen.add(name);
    attrs.push(`${name}="${escapeAttr(value)}"`);
  }
  if (tagName === 'img' && !seen.has('src')) {
    return '';
  }
  return attrs.join(' ');
}

function stripToAllowlistedHtml(html: string): string {
  const input = html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '');

  const parts: string[] = [];
  const stack: string[] = [];
  const tagRe = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)\s*([^>]*?)>|[^<]+/g;
  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(input)) !== null) {
    if (match[0].startsWith('<')) {
      const isClosing = match[1] === '/';
      const tagName = match[2].toLowerCase();
      const attrRaw = match[3] ?? '';
      const isVoid = MARKDOWN_VOID_TAGS.has(tagName) || /\/\s*$/.test(attrRaw);

      if (!MARKDOWN_ALLOWED_TAG_SET.has(tagName)) {
        if (isClosing) {
          const idx = stack.lastIndexOf(tagName);
          if (idx !== -1) {
            while (stack.length > idx) {
              parts.push(`</${stack.pop()}>`);
            }
          }
        }
        continue;
      }

      if (isClosing) {
        const idx = stack.lastIndexOf(tagName);
        if (idx !== -1) {
          while (stack.length > idx + 1) {
            parts.push(`</${stack.pop()}>`);
          }
          stack.pop();
          parts.push(`</${tagName}>`);
        }
      } else {
        const safeAttrs = sanitizeAttrString(tagName, attrRaw);
        if (tagName === 'img' && !safeAttrs) {
          continue;
        }
        const attrSuffix = safeAttrs ? ` ${safeAttrs}` : '';
        if (isVoid) {
          parts.push(`<${tagName}${attrSuffix}>`);
        } else {
          stack.push(tagName);
          parts.push(`<${tagName}${attrSuffix}>`);
        }
      }
    } else {
      parts.push(match[0]);
    }
  }
  while (stack.length) {
    parts.push(`</${stack.pop()}>`);
  }
  return enhanceSanitizedHtml(parts.join(''));
}

function enhanceSanitizedHtml(html: string): string {
  return html
    .replace(/<p(?![^>]*\bstyle=)([^>]*)>/gi, `<p style="${MARKDOWN_INLINE_STYLES['P']}"$1>`)
    .replace(/<ul(?![^>]*\bstyle=)([^>]*)>/gi, `<ul style="${MARKDOWN_INLINE_STYLES['UL']}"$1>`)
    .replace(/<ol(?![^>]*\bstyle=)([^>]*)>/gi, `<ol style="${MARKDOWN_INLINE_STYLES['OL']}"$1>`)
    .replace(/<li(?![^>]*\bstyle=)([^>]*)>/gi, `<li style="${MARKDOWN_INLINE_STYLES['LI']}"$1>`)
    .replace(
      /<blockquote(?![^>]*\bstyle=)([^>]*)>/gi,
      `<blockquote style="${MARKDOWN_INLINE_STYLES['BLOCKQUOTE']}"$1>`
    )
    .replace(/<u(?![^>]*\bstyle=)([^>]*)>/gi, `<u style="${MARKDOWN_INLINE_STYLES['U']}"$1>`)
    .replace(/<a\b([^>]*\bhref="([^"]*)"[^>]*)>/gi, (_match, rest: string, href: string) => {
      if (!isSafeHref(href)) return '<a>';
      let extra = '';
      if (!/\btarget=/.test(rest)) extra += ' target="_blank"';
      if (!/\brel=/.test(rest)) extra += ' rel="noopener noreferrer"';
      return `<a${rest}${extra}>`;
    })
    .replace(/<img\b([^>]*)>/gi, (_match, rest: string) => {
      const srcMatch = rest.match(/\bsrc="([^"]*)"/i);
      const src = srcMatch?.[1] ?? '';
      if (!isSafeImageSrc(src)) return '';
      let extra = '';
      if (!/\balt=/.test(rest)) extra += ' alt=""';
      if (!/\bstyle=/.test(rest)) extra += ` style="${MARKDOWN_INLINE_STYLES['IMG']}"`;
      return `<img${rest}${extra}>`;
    });
}

function markdownToSafeHtml(markdown: string | null | undefined): string {
  if (!markdown) return '';
  const preprocessed = preprocessMarkdownForMarked(String(markdown));
  const parsed = getMarked().parse(preprocessed, { async: false });
  const rawHtml = normalizeMarkedDelToStrike(
    typeof parsed === 'string' ? parsed : String(parsed)
  );
  return stripToAllowlistedHtml(rawHtml);
}

function markdownToPlainText(markdown: string | null | undefined): string {
  if (!markdown) return '';
  return stripMarkdownSyntaxToPlainText(String(markdown));
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
  return `${s.slice(0, maxLen - 1)}…`;
}

function buildPrayerUpdateBlockHtml(updateHtml: string): string {
  if (!updateHtml) return '';
  return `<p style="margin: 15px 0 10px 0;"><strong>Update</strong></p><div style="background-color:#ffffff;padding:15px;border-radius:6px;border-left:4px solid #3b82f6;margin:0;">${updateHtml}</div>`;
}

interface SpotlightEmailCandidate {
  kindLabel: string;
  title: string;
  prayerFor: string;
  requester: string;
  description: string;
}

interface SpotlightEmailTemplateVars {
  variablesText: Record<string, string>;
  variablesHtml: Record<string, string>;
}

const EMPTY_SPOTLIGHT_TEXT = {
  spotlightPrayerKind: '',
  spotlightPrayerTitle: '',
  spotlightPrayerFor: '',
  spotlightPrayerRequester: '',
  spotlightPrayerDescription: '',
  updateContent: '',
  spotlightUpdateTextSection: '',
};

const EMPTY_SPOTLIGHT_HTML = {
  spotlightPrayerKind: '',
  spotlightPrayerTitle: '',
  spotlightPrayerFor: '',
  spotlightPrayerRequester: '',
  spotlightPrayerDescription: '',
  spotlightPrayerDescriptionHtml: '',
  updateContent: '',
};

const SPOTLIGHT_DESCRIPTION_PLAIN_MAX = 600;
const SPOTLIGHT_UPDATE_PLAIN_MAX = 2000;

function buildSpotlightEmailTemplateVars(
  appLink: string,
  spotlight: SpotlightEmailCandidate | null,
  updateMarkdown: string
): SpotlightEmailTemplateVars {
  const updatePlain = truncateText(
    markdownToPlainText(updateMarkdown),
    SPOTLIGHT_UPDATE_PLAIN_MAX
  );
  const updateHtml = updatePlain ? markdownToSafeHtml(updateMarkdown) : '';
  const spotlightUpdateBlockHtml = buildPrayerUpdateBlockHtml(updateHtml);
  const spotlightLatestUpdateHtml = spotlightUpdateBlockHtml;
  const spotlightUpdateTextSection = updatePlain ? `\n\nLatest update:\n${updatePlain}\n` : '';

  if (!spotlight) {
    return {
      variablesText: {
        appLink,
        ...EMPTY_SPOTLIGHT_TEXT,
        spotlightUpdateBlockHtml: '',
        spotlightLatestUpdateHtml: '',
      },
      variablesHtml: {
        appLink,
        ...EMPTY_SPOTLIGHT_HTML,
        spotlightUpdateBlockHtml: '',
        spotlightLatestUpdateHtml: '',
      },
    };
  }

  const descriptionPlain = truncateText(
    markdownToPlainText(spotlight.description),
    SPOTLIGHT_DESCRIPTION_PLAIN_MAX
  );

  return {
    variablesText: {
      appLink,
      spotlightPrayerKind: spotlight.kindLabel,
      spotlightPrayerTitle: spotlight.title,
      spotlightPrayerFor: spotlight.prayerFor,
      spotlightPrayerRequester: spotlight.requester,
      spotlightPrayerDescription: descriptionPlain,
      updateContent: updatePlain,
      spotlightUpdateTextSection,
      spotlightUpdateBlockHtml: '',
      spotlightLatestUpdateHtml: '',
    },
    variablesHtml: {
      appLink,
      spotlightPrayerKind: escapeHtml(spotlight.kindLabel),
      spotlightPrayerTitle: escapeHtml(spotlight.title),
      spotlightPrayerFor: escapeHtml(spotlight.prayerFor),
      spotlightPrayerRequester: escapeHtml(spotlight.requester),
      spotlightPrayerDescription: escapeHtml(descriptionPlain),
      spotlightPrayerDescriptionHtml: markdownToSafeHtml(spotlight.description),
      updateContent: escapeHtml(updatePlain),
      spotlightUpdateBlockHtml,
      spotlightLatestUpdateHtml,
    },
  };
}
// ----- END inline edge-email-markdown -----
/**
 * Hourly job: send self prayer reminders.
 * Email when email_subscribers.is_active !== false (matches UserSessionData.isActive).
 * Push when receive_push and a device_tokens row exists (matches receivePush + native token).
 * Both run when both are enabled.
 * Template: admin_settings.user_hourly_prayer_reminder_template_key → email_templates (default user_hourly_prayer_reminder).
 * Spotlight template fills {{spotlightPrayerKind}}, {{spotlightPrayerTitle}}, {{spotlightPrayerFor}}, {{spotlightPrayerRequester}},
 * {{spotlightPrayerDescription}} (plain text), {{spotlightPrayerDescriptionHtml}} (rendered markdown HTML),
 * {{updateContent}}, {{spotlightUpdateBlockHtml}} (Update subsection HTML; empty if no update),
 * {{spotlightLatestUpdateHtml}} (alias), {{spotlightUpdateTextSection}}. Community: {{spotlightPrayerRequester}} is **Anonymous**
 * when `prayers.is_anonymous`, else `requester`; personal spotlight: **Me**.
 * Community spotlight: **all** approved + **current** `prayers` (app-wide; no date window).
 * Personal spotlight: **all** non-**Answered** `personal_prayers` for the recipient’s `user_email`. Previous pick avoided when possible.
 * Spotlight template: `{{appLink}}` = `APP_URL/?prayerId=` for the featured prayer when one is picked; push includes `prayerId` for tap-to-open.
 * Set Edge secret APP_URL to match Angular environment.appUrl in production.
 * If APP_URL is host-only (no https://), it is prefixed with https:// so mail clients do not rewrite links to x-webdoc://…
 * Auth matches send-prayer-reminders: Supabase Edge JWT verification only.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
  'Access-Control-Max-Age': '86400',
};

const DEFAULT_HOURLY_TEMPLATE_KEY = 'user_hourly_prayer_reminder';
const SPOTLIGHT_TEMPLATE_KEY = 'user_hourly_prayer_reminder_with_spotlight';

/** Push notification previews must stay on one line (email plain text keeps paragraph breaks). */
function collapsePlainTextToSingleLine(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

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
  /**
   * Community: public label for who submitted (`Anonymous` when `prayers.is_anonymous`, else `requester`).
   * Personal spotlight: **Me** (subscriber’s own prayer).
   */
  requester: string;
  description: string;
  kindLabel: string;
}

function communityRequesterForSpotlight(
  isAnonymous: boolean | null | undefined,
  requester: string | null | undefined
): string {
  if (isAnonymous === true) {
    return 'Anonymous';
  }
  return requester?.trim() ? requester : '';
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

/** Duplicated from src/app/lib/hourly-prayer-spotlight-deep-link.ts */
function spotlightKeyToPrayerId(key: string | null | undefined): string | null {
  if (!key) return null;
  const colon = key.indexOf(':');
  if (colon < 1) return null;
  const kind = key.slice(0, colon);
  const id = key.slice(colon + 1).trim();
  if (!id) return null;
  if (kind === 'c' || kind === 'p') return id;
  return null;
}

/** Duplicated from src/app/lib/hourly-prayer-spotlight-deep-link.ts */
function buildPrayerSpotlightAppLink(
  appUrl: string,
  spotlightKey: string | null | undefined
): string {
  const base = appUrl.replace(/\/$/, '');
  const prayerId = spotlightKeyToPrayerId(spotlightKey);
  if (!prayerId) return `${base}/`;
  return `${base}/?prayerId=${encodeURIComponent(prayerId)}`;
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
          sub.hourly_reminder_last_spotlight_key ?? null
        );
      }

      const spotlightPrayerId =
        useSpotlightVariables && spotlight?.key
          ? spotlightKeyToPrayerId(spotlight.key)
          : null;
      const appLink = buildPrayerSpotlightAppLink(
        appUrl,
        useSpotlightVariables && spotlight?.key ? spotlight.key : null
      );

      let updateMarkdown = '';
      if (spotlight && useSpotlightVariables) {
        updateMarkdown = await fetchLatestUpdateMarkdown(supabase, spotlight.key);
      }

      const { variablesText, variablesHtml } = buildSpotlightEmailTemplateVars(
        appLink,
        spotlight
          ? {
              kindLabel: spotlight.kindLabel,
              title: spotlight.title,
              prayerFor: spotlight.prayerFor,
              requester: spotlight.requester,
              description: spotlight.description,
            }
          : null,
        updateMarkdown
      );

      const updatePlain = variablesText.updateContent;

      const pushBody =
        spotlight && useSpotlightVariables
          ? truncateText(
              `${spotlight.title} — ${spotlight.kindLabel}${
                updatePlain
                  ? ` — ${truncateText(collapsePlainTextToSingleLine(updatePlain), 80)}`
                  : ''
              }`,
              140
            )
          : 'Take a moment to pray.';

      let pushDelivered = false;
      if (wantPush) {
        const pushData: Record<string, string> = {
          type: 'prayer_reminder',
          url: appLink,
        };
        if (spotlightPrayerId) {
          pushData.prayerId = spotlightPrayerId;
        }
        const { error: pushErr } = await supabase.functions.invoke('send-push-notification', {
          body: {
            emails: [recipient],
            title: pushTitle,
            body: pushBody,
            data: pushData,
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

      // Persist last spotlight for rotation on the next run. Must run after push *or* email success;
      // previously only email updated this, so push-only users never excluded the prior pick.
      if (activeTemplateKey === SPOTLIGHT_TEMPLATE_KEY && (pushDelivered || emailDelivered)) {
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
  supabase: SupabaseClient<any>,
  recipientEmail: string,
  lastSpotlightKey: string | null
): Promise<SpotlightCandidate | null> {
  const commSelect =
    'id, title, description, prayer_for, requester, is_anonymous, created_at, updated_at';
  const { data: commRows, error: cErr } = await supabase
    .from('prayers')
    .select(commSelect)
    .eq('approval_status', 'approved')
    .eq('status', 'current');

  if (cErr) {
    console.error('spotlight community prayers query failed', cErr);
  }

  const { data: persRows, error: pErr } = await supabase
    .from('personal_prayers')
    .select('id, title, description, prayer_for, category, created_at, updated_at')
    .ilike('user_email', recipientEmail);

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
      requester: string | null;
      is_anonymous: boolean | null;
    };
    candidates.push({
      key: `c:${row.id}`,
      title: row.title ?? '',
      prayerFor: row.prayer_for ?? '',
      requester: communityRequesterForSpotlight(row.is_anonymous, row.requester),
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
      requester: 'Me',
      description: row.description ?? '',
      kindLabel: 'Personal prayer',
    });
  }

  return pickSpotlightCandidate(candidates, lastSpotlightKey);
}

/** Latest approved community update or latest personal update (TipTap markdown). */
async function fetchLatestUpdateMarkdown(
  supabase: SupabaseClient<any>,
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
      console.error('fetchLatestUpdateMarkdown community', error);
      return '';
    }
    const raw = data?.content;
    return raw?.trim() ? raw : '';
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
      console.error('fetchLatestUpdateMarkdown personal', error);
      return '';
    }
    const raw = data?.content;
    return raw?.trim() ? raw : '';
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
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(
      new RegExp(`{{\\s*${escapedKey}\\s*}}`, 'g'),
      value ?? ''
    );
  }
  return result;
}
