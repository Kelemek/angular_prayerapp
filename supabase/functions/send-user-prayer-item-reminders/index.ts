import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';
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

// ----- END inline edge-email-markdown -----
/**
 * Every-15-minutes job: send per-prayer item reminders (once / daily / weekly).
 * Email when email_subscribers.is_active !== false.
 * Push when receive_push and a device_tokens row exists.
 * Template: email_templates.user_prayer_item_reminder.
 * Auth: Supabase Edge JWT verification only (same as other reminder jobs).
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform',
  'Access-Control-Max-Age': '86400',
};

const TEMPLATE_KEY = 'user_prayer_item_reminder';

interface ItemReminderRow {
  id: string;
  user_email: string;
  prayer_kind: string;
  prayer_id: string;
  title_snapshot: string;
  prayer_for_snapshot: string;
  mode: 'once' | 'daily' | 'weekly';
  iana_timezone: string;
  local_hour: number;
  local_minute: number;
  local_date?: string | null;
  last_sent_at?: string | null;
  last_push_sent_at?: string | null;
  last_email_sent_at?: string | null;
}

function localDateInTimezone(ianaTimezone: string, instant: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ianaTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

function channelPendingForRow(
  row: ItemReminderRow,
  channel: 'push' | 'email',
  want: boolean
): boolean {
  if (!want) {
    return false;
  }
  const lastSent =
    channel === 'push' ? row.last_push_sent_at : row.last_email_sent_at;
  if (row.mode === 'once') {
    return !lastSent;
  }
  if (!lastSent) {
    return true;
  }
  return localDateInTimezone(row.iana_timezone, new Date(lastSent)) <
    localDateInTimezone(row.iana_timezone);
}

function localZonedParts(
  ianaTimezone: string,
  instant: Date
): { local_date: string; local_hour: number; local_minute: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ianaTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '00';
  let hour = Number(get('hour'));
  if (hour === 24) hour = 0;
  return {
    local_date: `${get('year')}-${get('month')}-${get('day')}`,
    local_hour: hour,
    local_minute: Number(get('minute')),
  };
}

/** Next quarter-hour slot after `from` in the reminder's IANA zone (for once retry). */
function nextOnceReminderQuarterSlot(
  ianaTimezone: string,
  from: Date = new Date()
): { local_date: string; local_hour: number; local_minute: number } {
  const bumped = new Date(from.getTime() + 15 * 60 * 1000);
  const parts = localZonedParts(ianaTimezone, bumped);
  const snappedMinute = Math.floor(parts.local_minute / 15) * 15;
  return {
    local_date: parts.local_date,
    local_hour: parts.local_hour,
    local_minute: snappedMinute,
  };
}

async function rescheduleUndeliveredOnceReminder(
  supabase: SupabaseClientLike,
  row: ItemReminderRow,
  errors: string[]
): Promise<void> {
  const slot = nextOnceReminderQuarterSlot(row.iana_timezone);
  const { error: updErr } = await supabase
    .from('user_prayer_item_reminders')
    .update({
      local_date: slot.local_date,
      local_hour: slot.local_hour,
      local_minute: slot.local_minute,
      last_sent_at: null,
    })
    .eq('id', row.id);
  if (updErr) {
    console.error('Failed to reschedule once reminder', row.id, updErr);
    errors.push(`${row.id} reschedule: ${updErr.message ?? String(updErr)}`);
  }
}

interface EmailTemplateRow {
  subject: string;
  text_body: string;
  html_body: string;
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

function modeLabel(mode: ItemReminderRow['mode']): string {
  if (mode === 'once') return 'One-time reminder';
  if (mode === 'daily') return 'Daily reminder';
  return 'Weekly reminder';
}

function formatScheduledTime(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const ampm = hour < 12 ? 'AM' : 'PM';
  const mm = minute.toString().padStart(2, '0');
  return `${h12}:${mm} ${ampm}`;
}

function applyTemplateVariables(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

function fallbackParts(
  appLink: string,
  prayerFor: string,
  prayerTitle: string,
  prayerDescriptionText: string,
  prayerDescriptionHtml: string,
  updateContentText: string,
  updateBlockHtml: string
): {
  subject: string;
  textBody: string;
  htmlBody: string;
} {
  const bodyText = prayerDescriptionText || prayerTitle;
  const updateText = updateContentText ? `\n\nLatest update:\n${updateContentText}\n` : '';
  return {
    subject: `Prayer reminder: ${prayerFor}`,
    textBody: `Prayer for ${prayerFor}\n${bodyText}${updateText}\nOpen the app:\n${appLink}\n`,
    htmlBody: `<div bgcolor="#ecfdf5" style="background-color:#ecfdf5;padding:16px 16px 16px 22px;border-radius:6px;border-left:4px solid #10b981;margin-bottom:20px;">${prayerDescriptionHtml}${updateBlockHtml}</div><p><a href="${appLink}">Open prayer</a></p>`,
  };
}

function pcMemberPersonId(prayerId: string): string {
  return prayerId.startsWith('pc-member-')
    ? prayerId.slice('pc-member-'.length)
    : prayerId;
}

async function fetchPlanningCenterListPersonIds(
  listId: string,
  authHeader: string
): Promise<Set<string> | null> {
  const personIds = new Set<string>();
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const response = await fetch(
      `https://api.planningcenteronline.com/people/v2/lists/${encodeURIComponent(listId)}/people?page=${page}&per_page=100`,
      {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
      }
    );
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Planning Center list members API error:', response.status, errorText);
      return null;
    }
    const data = await response.json();
    for (const person of data.data ?? []) {
      const id = (person as { id?: string }).id;
      const name = (person as { attributes?: { name?: string } }).attributes?.name ?? '';
      if (id && name.trim()) {
        personIds.add(id);
      }
    }
    const pagination = (data.meta as { pagination?: { next_offset?: number | null } } | undefined)
      ?.pagination;
    hasMore = pagination?.next_offset !== null && pagination?.next_offset !== undefined;
    page++;
  }
  return personIds;
}

type SupabaseClientLike = {
  from: (table: string) => any;
};

async function loadDescriptionsByKind(
  supabase: SupabaseClientLike,
  rows: ItemReminderRow[]
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const communityIds = [
    ...new Set(rows.filter((r) => r.prayer_kind === 'community').map((r) => r.prayer_id)),
  ];
  const personalIds = [
    ...new Set(rows.filter((r) => r.prayer_kind === 'personal').map((r) => r.prayer_id)),
  ];

  if (communityIds.length > 0) {
    const { data, error } = await supabase
      .from('prayers')
      .select('id, description')
      .in('id', communityIds);
    if (error) {
      console.error('prayer descriptions batch failed:', error);
    } else {
      for (const p of data ?? []) {
        const row = p as { id: string; description: string | null };
        out.set(`community:${row.id}`, (row.description ?? '').trim());
      }
    }
  }

  if (personalIds.length > 0) {
    const { data, error } = await supabase
      .from('personal_prayers')
      .select('id, description')
      .in('id', personalIds);
    if (error) {
      console.error('personal prayer descriptions batch failed:', error);
    } else {
      for (const p of data ?? []) {
        const row = p as { id: string; description: string | null };
        out.set(`personal:${row.id}`, (row.description ?? '').trim());
      }
    }
  }

  const promptIds = [
    ...new Set(rows.filter((r) => r.prayer_kind === 'prompt').map((r) => r.prayer_id)),
  ];
  if (promptIds.length > 0) {
    const { data, error } = await supabase
      .from('prayer_prompts')
      .select('id, description')
      .in('id', promptIds);
    if (error) {
      console.error('prompt descriptions batch failed:', error);
    } else {
      for (const p of data ?? []) {
        const row = p as { id: string; description: string | null };
        out.set(`prompt:${row.id}`, (row.description ?? '').trim());
      }
    }
  }

  return out;
}

/** Latest update plain text keyed by `${kind}:${prayer_id}` (item reminder id, not person id). */
async function loadLatestUpdatesByKind(
  supabase: SupabaseClientLike,
  rows: ItemReminderRow[]
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const communityIds = [
    ...new Set(rows.filter((r) => r.prayer_kind === 'community').map((r) => r.prayer_id)),
  ];
  const personalIds = [
    ...new Set(rows.filter((r) => r.prayer_kind === 'personal').map((r) => r.prayer_id)),
  ];
  const memberPersonIds = [
    ...new Set(
      rows
        .filter((r) => r.prayer_kind === 'pc_member')
        .map((r) => pcMemberPersonId(r.prayer_id))
        .filter(Boolean)
    ),
  ];

  if (communityIds.length > 0) {
    const { data, error } = await supabase
      .from('prayer_updates')
      .select('prayer_id, content, created_at')
      .in('prayer_id', communityIds)
      .eq('approval_status', 'approved')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('community updates batch failed:', error);
    } else {
      for (const u of data ?? []) {
        const row = u as { prayer_id: string; content: string | null };
        const key = `community:${row.prayer_id}`;
        if (out.has(key)) continue;
        const plain = truncateText((row.content ?? '').trim(), 8000);
        if (plain) out.set(key, plain);
      }
    }
  }

  if (personalIds.length > 0) {
    const { data, error } = await supabase
      .from('personal_prayer_updates')
      .select('personal_prayer_id, content, created_at')
      .in('personal_prayer_id', personalIds)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('personal updates batch failed:', error);
    } else {
      for (const u of data ?? []) {
        const row = u as { personal_prayer_id: string; content: string | null };
        const key = `personal:${row.personal_prayer_id}`;
        if (out.has(key)) continue;
        const plain = truncateText((row.content ?? '').trim(), 8000);
        if (plain) out.set(key, plain);
      }
    }
  }

  if (memberPersonIds.length > 0) {
    const { data, error } = await supabase
      .from('member_prayer_updates')
      .select('person_id, content, created_at')
      .in('person_id', memberPersonIds)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('member updates batch failed:', error);
    } else {
      const latestByPerson = new Map<string, string>();
      for (const u of data ?? []) {
        const row = u as { person_id: string; content: string | null };
        if (latestByPerson.has(row.person_id)) continue;
        const plain = truncateText((row.content ?? '').trim(), 8000);
        if (plain) latestByPerson.set(row.person_id, plain);
      }
      for (const r of rows) {
        if (r.prayer_kind !== 'pc_member') continue;
        const personId = pcMemberPersonId(r.prayer_id);
        const plain = latestByPerson.get(personId);
        if (plain) out.set(`pc_member:${r.prayer_id}`, plain);
      }
    }
  }

  return out;
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

  try {
    const { data: tplRow } = await supabase
      .from('email_templates')
      .select('subject, text_body, html_body')
      .eq('template_key', TEMPLATE_KEY)
      .maybeSingle();

    const template = tplRow as EmailTemplateRow | null;

    const { data: dueRows, error: rpcError } = await supabase.rpc(
      'get_user_prayer_item_reminders_due_now'
    );

    if (rpcError) {
      console.error('RPC get_user_prayer_item_reminders_due_now failed:', rpcError);
      return new Response(
        JSON.stringify({ error: 'Failed to load due reminders', details: rpcError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const rows = (dueRows ?? []) as ItemReminderRow[];
    if (rows.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No per-prayer reminders due this slot',
          matched: 0,
          pushesSent: 0,
          emailsSent: 0,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const uniqueEmails = [
      ...new Map(rows.map((r) => [r.user_email.toLowerCase(), r.user_email])).values(),
    ];

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

    // Defensive: skip + delete reminders whose prayer was deleted/archived/answered
    // (triggers normally purge these; this covers races and legacy rows).
    const communityIds = [
      ...new Set(rows.filter((r) => r.prayer_kind === 'community').map((r) => r.prayer_id)),
    ];
    const personalIds = [
      ...new Set(rows.filter((r) => r.prayer_kind === 'personal').map((r) => r.prayer_id)),
    ];
    const promptIds = [
      ...new Set(rows.filter((r) => r.prayer_kind === 'prompt').map((r) => r.prayer_id)),
    ];

    const communityActive = new Set<string>();
    if (communityIds.length > 0) {
      const { data: communityRows, error: communityErr } = await supabase
        .from('prayers')
        .select('id, status')
        .in('id', communityIds);
      if (communityErr) {
        console.error('prayers status batch failed:', communityErr);
        return new Response(
          JSON.stringify({
            error: 'Failed to load prayer status',
            details: communityErr.message,
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      for (const p of communityRows ?? []) {
        const status = (p as { id: string; status: string }).status;
        if (status === 'current') {
          communityActive.add((p as { id: string }).id);
        }
      }
    }

    const personalActive = new Set<string>();
    if (personalIds.length > 0) {
      const { data: personalRows, error: personalErr } = await supabase
        .from('personal_prayers')
        .select('id, category')
        .in('id', personalIds);
      if (personalErr) {
        console.error('personal_prayers status batch failed:', personalErr);
        return new Response(
          JSON.stringify({
            error: 'Failed to load personal prayer status',
            details: personalErr.message,
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      for (const p of personalRows ?? []) {
        const category = (p as { id: string; category: string | null }).category;
        if (category !== 'Answered') {
          personalActive.add((p as { id: string }).id);
        }
      }
    }

    const promptActive = new Set<string>();
    if (promptIds.length > 0) {
      const { data: promptRows, error: promptErr } = await supabase
        .from('prayer_prompts')
        .select('id')
        .in('id', promptIds);
      if (promptErr) {
        console.error('prayer_prompts batch failed:', promptErr);
        return new Response(
          JSON.stringify({
            error: 'Failed to load prayer prompts',
            details: promptErr.message,
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      for (const p of promptRows ?? []) {
        promptActive.add((p as { id: string }).id);
      }
    }

    const pcMemberDeliverable = new Set<string>();
    const pcMemberPurgeRowIds = new Set<string>();
    const pcMemberRows = rows.filter((r) => r.prayer_kind === 'pc_member');
    if (pcMemberRows.length > 0) {
      const pcEmails = [
        ...new Map(
          pcMemberRows.map((r) => [r.user_email.toLowerCase(), r.user_email])
        ).values(),
      ];
      const { data: pcSubs, error: pcSubErr } = await supabase
        .from('email_subscribers')
        .select('email, planning_center_list_id')
        .in('email', pcEmails);
      if (pcSubErr) {
        console.error('email_subscribers pc list batch failed:', pcSubErr);
        for (const row of pcMemberRows) {
          pcMemberDeliverable.add(row.id);
        }
      } else {
        const listIdByEmail = new Map(
          (pcSubs ?? []).map((s: { email: string; planning_center_list_id: string | null }) => [
            s.email.toLowerCase(),
            s.planning_center_list_id,
          ])
        );
        const pcAppId = Deno.env.get('PLANNING_CENTER_APP_ID');
        const pcSecret = Deno.env.get('PLANNING_CENTER_SECRET');
        const pcAuth =
          pcAppId && pcSecret
            ? `Basic ${btoa(`${pcAppId}:${pcSecret}`)}`
            : null;
        const listPersonIdsCache = new Map<string, Set<string> | null>();
        for (const email of pcEmails) {
          const emailRows = pcMemberRows.filter(
            (r) => r.user_email.toLowerCase() === email.toLowerCase()
          );
          const listId = listIdByEmail.get(email.toLowerCase());
          if (!listId) {
            for (const row of emailRows) {
              pcMemberPurgeRowIds.add(row.id);
            }
            continue;
          }
          if (!pcAuth) {
            for (const row of emailRows) {
              pcMemberDeliverable.add(row.id);
            }
            continue;
          }
          if (!listPersonIdsCache.has(listId)) {
            listPersonIdsCache.set(listId, await fetchPlanningCenterListPersonIds(listId, pcAuth));
          }
          const personIds = listPersonIdsCache.get(listId);
          if (!personIds) {
            for (const row of emailRows) {
              pcMemberDeliverable.add(row.id);
            }
            continue;
          }
          for (const row of emailRows) {
            const personId = pcMemberPersonId(row.prayer_id);
            if (personIds.has(personId)) {
              pcMemberDeliverable.add(row.id);
            } else {
              pcMemberPurgeRowIds.add(row.id);
            }
          }
        }
      }
    }

    const activeRows = rows.filter((row) => {
      if (row.prayer_kind === 'community') return communityActive.has(row.prayer_id);
      if (row.prayer_kind === 'personal') return personalActive.has(row.prayer_id);
      if (row.prayer_kind === 'prompt') return promptActive.has(row.prayer_id);
      if (row.prayer_kind === 'pc_member') return pcMemberDeliverable.has(row.id);
      return true;
    });

    const descriptionsByKey = await loadDescriptionsByKind(supabase, activeRows);
    const updatesByKey = await loadLatestUpdatesByKind(supabase, activeRows);

    let pushesSent = 0;
    let emailsSent = 0;
    let skippedInactive = 0;
    const errors: string[] = [];

    for (const row of rows) {
      if (row.prayer_kind === 'community' && !communityActive.has(row.prayer_id)) {
        skippedInactive++;
        const { error: purgeErr } = await supabase
          .from('user_prayer_item_reminders')
          .delete()
          .eq('id', row.id);
        if (purgeErr) {
          console.error('Failed to purge inactive community reminder', row.id, purgeErr);
          errors.push(`${row.id} purge: ${purgeErr.message}`);
        }
        continue;
      }
      if (row.prayer_kind === 'personal' && !personalActive.has(row.prayer_id)) {
        skippedInactive++;
        const { error: purgeErr } = await supabase
          .from('user_prayer_item_reminders')
          .delete()
          .eq('id', row.id);
        if (purgeErr) {
          console.error('Failed to purge inactive personal reminder', row.id, purgeErr);
          errors.push(`${row.id} purge: ${purgeErr.message}`);
        }
        continue;
      }
      if (row.prayer_kind === 'prompt' && !promptActive.has(row.prayer_id)) {
        skippedInactive++;
        const { error: purgeErr } = await supabase
          .from('user_prayer_item_reminders')
          .delete()
          .eq('id', row.id);
        if (purgeErr) {
          console.error('Failed to purge inactive prompt reminder', row.id, purgeErr);
          errors.push(`${row.id} purge: ${purgeErr.message}`);
        }
        continue;
      }
      if (row.prayer_kind === 'pc_member' && pcMemberPurgeRowIds.has(row.id)) {
        skippedInactive++;
        const { error: purgeErr } = await supabase
          .from('user_prayer_item_reminders')
          .delete()
          .eq('id', row.id);
        if (purgeErr) {
          console.error('Failed to purge inactive pc member reminder', row.id, purgeErr);
          errors.push(`${row.id} purge: ${purgeErr.message}`);
        }
        continue;
      }

      if (
        row.prayer_kind === 'pc_member' &&
        !pcMemberDeliverable.has(row.id) &&
        !pcMemberPurgeRowIds.has(row.id)
      ) {
        continue;
      }

      const recipient = row.user_email;
      const sub = subByLower.get(recipient.toLowerCase()) as
        | {
            email: string;
            receive_push: boolean | null;
            is_active: boolean | null;
            is_blocked: boolean | null;
          }
        | undefined;

      if (!sub || sub.is_blocked === true) {
        continue;
      }

      const wantEmail = sub.is_active !== false;
      const wantPush = sub.receive_push === true && hasToken.has(recipient.toLowerCase());
      if (!wantEmail && !wantPush) {
        if (row.mode === 'once') {
          await rescheduleUndeliveredOnceReminder(supabase, row, errors);
        }
        continue;
      }

      const prayerFor = (row.prayer_for_snapshot || 'someone').trim() || 'someone';
      const prayerTitle = (row.title_snapshot || '').trim();
      const descriptionRaw =
        descriptionsByKey.get(`${row.prayer_kind}:${row.prayer_id}`) || prayerTitle;
      const updateRaw = updatesByKey.get(`${row.prayer_kind}:${row.prayer_id}`) || '';
      const prayerDescriptionText =
        markdownToPlainText(descriptionRaw) || prayerTitle;
      const prayerDescriptionHtml =
        markdownToSafeHtml(descriptionRaw) || escapeHtml(prayerTitle);
      const updateContentText = markdownToPlainText(updateRaw);
      const updateContentHtml = markdownToSafeHtml(updateRaw);
      const updateBlockHtml = buildPrayerUpdateBlockHtml(updateContentHtml);
      const updateTextSection = updateContentText
        ? `\n\nLatest update:\n${updateContentText}\n`
        : '';
      const isPrompt = row.prayer_kind === 'prompt';
      const appLink = isPrompt
        ? `${appUrl}/?promptId=${encodeURIComponent(row.prayer_id)}`
        : `${appUrl}/?prayerId=${encodeURIComponent(row.prayer_id)}`;
      const emailHeading = isPrompt
        ? prayerTitle
          ? `Prayer prompt: ${prayerTitle}`
          : 'Prayer prompt'
        : `Prayer for ${prayerFor}`;
      const scheduled = formatScheduledTime(row.local_hour, row.local_minute ?? 0);
      const label = modeLabel(row.mode);

      const varsText: Record<string, string> = {
        appLink,
        emailHeading,
        prayerFor,
        prayerTitle,
        prayerDescription: prayerDescriptionText,
        prayerDescriptionText,
        modeLabel: label,
        scheduledTime: scheduled,
        prayerId: row.prayer_id,
        prayerKind: row.prayer_kind,
        updateContent: updateContentText,
        updateContentText,
        updateTextSection,
        updateBlockHtml: '',
        spotlightUpdateBlockHtml: '',
        spotlightLatestUpdateHtml: '',
      };
      const varsHtml: Record<string, string> = {
        ...varsText,
        emailHeading: escapeHtml(emailHeading),
        prayerFor: escapeHtml(prayerFor),
        prayerTitle: escapeHtml(prayerTitle),
        prayerDescription: prayerDescriptionHtml,
        prayerDescriptionHtml,
        modeLabel: escapeHtml(label),
        scheduledTime: escapeHtml(scheduled),
        updateContent: updateContentHtml,
        updateContentHtml,
        updateBlockHtml,
        spotlightUpdateBlockHtml: updateBlockHtml,
        spotlightLatestUpdateHtml: updateBlockHtml,
      };

      let pushDelivered = !wantPush;
      let emailDelivered = !wantEmail;
      const shouldSendPush = channelPendingForRow(row, 'push', wantPush);
      const shouldSendEmail = channelPendingForRow(row, 'email', wantEmail);

      if (!shouldSendPush && !shouldSendEmail) {
        if (row.mode === 'once') {
          const { error: delErr } = await supabase
            .from('user_prayer_item_reminders')
            .delete()
            .eq('id', row.id);
          if (delErr) {
            console.error('Failed to delete completed once reminder', row.id, delErr);
            errors.push(`${row.id} delete: ${delErr.message}`);
          }
        }
        continue;
      }

      pushDelivered = !shouldSendPush;
      emailDelivered = !shouldSendEmail;

      if (shouldSendPush) {
        const pushBody = isPrompt
          ? truncateText(
              prayerTitle ? `Prayer prompt — ${prayerTitle}` : 'Prayer prompt',
              140
            )
          : truncateText(
              prayerTitle
                ? `Prayer for ${prayerFor} — ${prayerTitle}`
                : `Prayer for ${prayerFor}`,
              140
            );
        const pushData: Record<string, string> = {
          type: 'prayer_item_reminder',
          prayerId: row.prayer_id,
          prayerKind: row.prayer_kind,
          url: appLink,
        };
        if (isPrompt) {
          pushData.promptId = row.prayer_id;
        }
        const { error: pushErr } = await supabase.functions.invoke('send-push-notification', {
          body: {
            emails: [recipient],
            title: 'Prayer reminder',
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

      if (shouldSendEmail) {
        let subject: string;
        let textBody: string;
        let htmlBody: string;
        if (template) {
          subject = applyTemplateVariables(template.subject, varsText);
          textBody = applyTemplateVariables(template.text_body, varsText);
          htmlBody = applyTemplateVariables(template.html_body, varsHtml);
        } else {
          const fb = fallbackParts(
            appLink,
            prayerFor,
            prayerTitle,
            prayerDescriptionText,
            prayerDescriptionHtml,
            updateContentText,
            updateBlockHtml
          );
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

      const now = new Date().toISOString();
      const channelPatch: Record<string, string> = {};
      if (shouldSendPush && pushDelivered) {
        channelPatch.last_push_sent_at = now;
      }
      if (shouldSendEmail && emailDelivered) {
        channelPatch.last_email_sent_at = now;
      }

      const pushSatisfied =
        !wantPush ||
        Boolean(row.last_push_sent_at) ||
        (shouldSendPush && pushDelivered);
      const emailSatisfied =
        !wantEmail ||
        Boolean(row.last_email_sent_at) ||
        (shouldSendEmail && emailDelivered);

      if (!pushSatisfied && !emailSatisfied) {
        if (row.mode === 'once') {
          await rescheduleUndeliveredOnceReminder(supabase, row, errors);
        }
        continue;
      }

      if (pushSatisfied && emailSatisfied) {
        if (row.mode === 'once') {
          const { error: delErr } = await supabase
            .from('user_prayer_item_reminders')
            .delete()
            .eq('id', row.id);
          if (delErr) {
            console.error('Failed to delete once reminder', row.id, delErr);
            errors.push(`${row.id} delete: ${delErr.message}`);
          }
        } else {
          const { error: updErr } = await supabase
            .from('user_prayer_item_reminders')
            .update({ ...channelPatch, last_sent_at: now })
            .eq('id', row.id);
          if (updErr) {
            console.error('Failed to stamp last_sent_at', row.id, updErr);
            errors.push(`${row.id} update: ${updErr.message}`);
          }
        }
      } else if (Object.keys(channelPatch).length > 0) {
        const { error: updErr } = await supabase
          .from('user_prayer_item_reminders')
          .update(channelPatch)
          .eq('id', row.id);
        if (updErr) {
          console.error('Failed to stamp channel delivery', row.id, updErr);
          errors.push(`${row.id} channel update: ${updErr.message}`);
        } else if (row.mode === 'once' && !(pushSatisfied && emailSatisfied)) {
          await rescheduleUndeliveredOnceReminder(
            supabase,
            { ...row, ...channelPatch },
            errors
          );
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Per-prayer reminders processed',
        matched: rows.length,
        skippedInactive,
        pushesSent,
        emailsSent,
        errors: errors.length ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('send-user-prayer-item-reminders failed:', err);
    return new Response(
      JSON.stringify({
        error: 'Unexpected error',
        details: err instanceof Error ? err.message : String(err),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
