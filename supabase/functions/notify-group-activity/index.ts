import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.110.0';
import { Marked } from 'https://esm.sh/marked@15.0.12';

// ----- notify-group-activity imports (keep above inline when regenerating) -----

import {
  escapeIlikeExactEmail,
  normalizeSubscriberEmailForQuery,
  normalizeSubscriberEmailsForQuery,
  type SubscriberNotifyRow,
} from '../shared/safe-subscriber-email.ts';
import { consumeRateLimit, policyErrorToResponse } from '../shared/policy-rpc.ts';
import {
  assertInviteSendable,
  claimNotifyRecipients,
  insertGroupMail,
} from './gates.ts';
import {
  GROUP_WELCOME_TEMPLATE_KEY,
  buildGroupInviteAppLink,
  buildGroupPrayerAppLink,
  buildSubscriberTemplateVariables,
  claimedDelivery,
  memberEmailsExceptActor,
  normalizeAppUrl,
  planEmailRecipients,
  planPushForKind,
  planPushRecipients,
  uniqueNotifyRecipients,
  renderGroupWelcomeEmail,
  subscriberTemplateKeyForKind,
  updateContentForAnswered,
  type GroupActivityNotifyKind,
  type PrayerFields,
  type RenderedContent,
  type SubscriberDeliveryRow,
  type UpdateFields,
} from './plan.ts';

const NOTIFY_UPDATE_SENTINEL = '00000000-0000-0000-0000-000000000000';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type Kind = 'invite' | GroupActivityNotifyKind;

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
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const kind = body.kind as Kind;
    const url = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const authHeader = req.headers.get('Authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const adminForUser = createClient(url, serviceKey);
    const { data: userData, error: userError } = await adminForUser.auth.getUser(token);
    const actor = userData.user?.email?.trim().toLowerCase() ?? '';
    if (userError || !actor) {
      return json({ error: 'Not authorized' }, 401);
    }

    const admin = createClient(url, serviceKey);

    if (kind === 'invite') {
      return await handleInvite(admin, url, serviceKey, body, actor);
    }

    if (kind === 'prayer_added' || kind === 'prayer_update' || kind === 'prayer_answered') {
      return await handleGroupPrayerNotify(admin, url, serviceKey, kind, body, actor);
    }

    return json({ error: 'Unknown kind' }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});

async function handleInvite(
  admin: ReturnType<typeof createClient>,
  url: string,
  serviceKey: string,
  body: Record<string, unknown>,
  actor: string,
): Promise<Response> {
  const groupId = String(body.groupId ?? '');
  if (!groupId) {
    return json({ error: 'Not authorized' }, 401);
  }

  const { data: group, error: groupError } = await admin
    .from('prayer_groups')
    .select('id, name')
    .eq('id', groupId)
    .maybeSingle();
  if (groupError) return json({ error: groupError.message }, 500);
  if (!group) return json({ error: 'Group not found' }, 404);

  const { data: members } = await admin
    .from('prayer_group_members')
    .select('user_email, role, is_active, name')
    .eq('group_id', groupId)
    .eq('is_active', true);
  const actorRow = (members ?? []).find(
    (member) => String(member.user_email).toLowerCase() === actor,
  );
  if (!actorRow) return json({ error: 'Not authorized' }, 403);
  if (actorRow.role !== 'owner') {
    return json({ error: 'Only the owner can invite' }, 403);
  }

  const appBase = normalizeAppUrl(Deno.env.get('APP_URL'), 'https://cpprayer.cp-church.org');
  const appLink = buildGroupInviteAppLink(appBase, groupId);
  const inviteEmail = normalizeSubscriberEmailForQuery(String(body.email ?? ''));
  if (!inviteEmail) {
    return json({ error: 'Invalid email address' }, 400);
  }

  const subscriber = await lookupSubscriberByEmail(admin, inviteEmail);
  if (
    subscriber &&
    (subscriber.is_blocked === true || subscriber.is_active === false)
  ) {
    return json({ error: 'That address cannot receive invitations.' }, 400);
  }

  const deliveryEmail = subscriber?.email ?? inviteEmail;
  const receivePush = subscriber?.receive_push === true;
  const inviterName = String(actorRow.name ?? '').trim() || 'A group owner';
  const groupName = String(group.name ?? 'your group');

  let subject = `You are invited to ${groupName}`;
  let text = `You have been invited to the prayer group ${groupName}. Sign in: ${appLink}`;
  let htmlBody = `<p>${escapeHtml(text)}</p>`;

  const { data: welcomeTemplate, error: templateError } = await admin
    .from('email_templates')
    .select('subject, html_body, text_body')
    .eq('template_key', GROUP_WELCOME_TEMPLATE_KEY)
    .maybeSingle();
  if (templateError) {
    return json({ error: templateError.message }, 500);
  }
  if (welcomeTemplate) {
    const rendered = renderGroupWelcomeEmail(welcomeTemplate, {
      groupName,
      inviterName,
      appLink,
      escapeHtml,
    });
    subject = rendered.subject;
    text = rendered.textBody;
    htmlBody = rendered.htmlBody;
  }

  try {
    await assertInviteSendable(admin, groupId, actor, inviteEmail);
    if (!(await consumeRateLimit(admin, 'invite_owner', actor, 10))) {
      return json({ error: 'Too many invitations. Try again later.' }, 429);
    }
    if (!(await consumeRateLimit(admin, 'invite_recipient', inviteEmail, 5))) {
      return json(
        { error: 'That address was invited too many times. Try later.' },
        429,
      );
    }
  } catch (error) {
    return policyErrorToResponse(error);
  }

  const emailResponse = await fetch(`${url}/functions/v1/send-email`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: deliveryEmail,
      subject,
      textBody: text,
      htmlBody,
    }),
  });
  if (!emailResponse.ok) {
    const detail = (await emailResponse.text()).slice(0, 300);
    return json({ error: `Invitation email could not be sent. ${detail}` }, 502);
  }
  if (receivePush) {
    await fetch(`${url}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emails: [deliveryEmail],
        title: subject,
        body: String(body.title ?? group.name),
      }),
    });
  }

  return json({ success: true, notified: 1 });
}

async function handleGroupPrayerNotify(
  admin: ReturnType<typeof createClient>,
  url: string,
  serviceKey: string,
  kind: GroupActivityNotifyKind,
  body: Record<string, unknown>,
  actor: string,
): Promise<Response> {
  const prayerId = String(body.prayerId ?? '');
  if (!prayerId) {
    return json({ error: 'prayerId is required' }, 400);
  }

  const { data: prayerRow, error: prayerError } = await admin
    .from('group_prayers')
    .select('id, group_id, title, description, prayer_for, requester, status')
    .eq('id', prayerId)
    .maybeSingle();
  if (prayerError) return json({ error: prayerError.message }, 500);
  if (!prayerRow) return json({ error: 'Prayer not found' }, 404);

  const prayer = prayerRow as PrayerFields;
  const groupId = prayer.group_id;

  if (kind === 'prayer_added') {
    const bodyGroupId = String(body.groupId ?? '');
    if (!bodyGroupId || bodyGroupId !== groupId) {
      return json({ error: 'Group mismatch' }, 400);
    }
  }

  const updateId = body.updateId != null ? String(body.updateId) : '';
  if (kind === 'prayer_update' && !updateId) {
    return json({ error: 'updateId is required' }, 400);
  }

  const { data: members } = await admin
    .from('prayer_group_members')
    .select('user_email, role, is_active, name')
    .eq('group_id', groupId)
    .eq('is_active', true);
  const actorRow = (members ?? []).find(
    (member) => String(member.user_email).toLowerCase() === actor,
  );
  if (!actorRow) return json({ error: 'Not authorized' }, 403);

  const memberEmails = normalizeSubscriberEmailsForQuery(
    (members ?? []).map((member) => String(member.user_email)),
  );
  const recipientEmails = memberEmailsExceptActor(memberEmails, actor);
  if (recipientEmails.length === 0) {
    return json({ success: true, notified: 0, queued: 0 });
  }

  const subscribers = await lookupSubscribersByEmails(admin, recipientEmails);
  const deliveryRows: SubscriberDeliveryRow[] = subscribers.map((row) => ({
    email: row.email,
    is_active: row.is_active,
    is_blocked: row.is_blocked,
    receive_push: row.receive_push,
  }));

  const emailRecipients = planEmailRecipients(deliveryRows);
  const pushRecipients = planPushRecipients(deliveryRows);

  let update: UpdateFields | null = null;
  if (updateId) {
    const { data: updateRow, error: updateError } = await admin
      .from('group_prayer_updates')
      .select('id, content, author, group_prayer_id')
      .eq('id', updateId)
      .maybeSingle();
    if (updateError) return json({ error: updateError.message }, 500);
    if (!updateRow || updateRow.group_prayer_id !== prayerId) {
      return json({ error: 'Update not found' }, 404);
    }
    update = {
      id: String(updateRow.id),
      content: String(updateRow.content ?? ''),
      author: String(updateRow.author ?? 'Group member'),
    };
  } else if (kind === 'prayer_answered') {
    const { data: latest } = await admin
      .from('group_prayer_updates')
      .select('id, content, author')
      .eq('group_prayer_id', prayerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest) {
      update = {
        id: String(latest.id),
        content: String(latest.content ?? ''),
        author: String(latest.author ?? 'Group member'),
      };
    }
  }

  const actorDisplayName =
    String(actorRow.name ?? '').trim() ||
    subscribers.find((row) => row.email.toLowerCase() === actor)?.name?.trim() ||
    'Group member';

  const descriptionRaw = prayer.description ?? '';
  const renderedPrayer: RenderedContent = {
    prayerDescription: descriptionRaw,
    prayerDescriptionText: markdownToPlainText(descriptionRaw),
    prayerDescriptionHtml: markdownToSafeHtml(descriptionRaw),
  };

  let authorName = prayer.requester;
  let updatePlain = '';
  const rendered: RenderedContent = { ...renderedPrayer };

  if (kind === 'prayer_update' && update) {
    authorName = update.author;
    rendered.updateContent = update.content;
    rendered.updateContentText = markdownToPlainText(update.content);
    rendered.updateContentHtml = markdownToSafeHtml(update.content);
    updatePlain = rendered.updateContentText;
  } else if (kind === 'prayer_answered') {
    const answered = updateContentForAnswered(update, actorDisplayName);
    authorName = answered.authorName;
    rendered.updateContent = answered.content;
    rendered.updateContentText = markdownToPlainText(answered.content);
    rendered.updateContentHtml = markdownToSafeHtml(answered.content);
    updatePlain = rendered.updateContentText;
  }

  const appBase = normalizeAppUrl(Deno.env.get('APP_URL'), 'https://cpprayer.cp-church.org');
  const appLink = buildGroupPrayerAppLink(appBase, groupId, prayerId);
  const templateKey = subscriberTemplateKeyForKind(kind);
  const templateVariables = buildSubscriberTemplateVariables({
    kind,
    prayer: { ...prayer, status: kind === 'prayer_answered' ? 'answered' : prayer.status },
    appLink,
    authorName,
    rendered,
  });

  const notifyUpdateId =
    kind === 'prayer_update' ? updateId : NOTIFY_UPDATE_SENTINEL;
  const deliveryRecipients = uniqueNotifyRecipients(
    emailRecipients,
    pushRecipients,
  );
  let claimed: string[] = [];
  if (deliveryRecipients.length > 0) {
    try {
      if (!(await consumeRateLimit(admin, 'group_notify_actor', actor, 20))) {
        return json({ error: 'Too many notifications. Try again later.' }, 429);
      }
      claimed = await claimNotifyRecipients(
        admin,
        kind,
        prayerId,
        notifyUpdateId,
        deliveryRecipients,
      );
    } catch (error) {
      return policyErrorToResponse(error);
    }
  }
  const emailNow = claimedDelivery(emailRecipients, claimed);
  const pushNow = claimedDelivery(pushRecipients, claimed);

  let queuedCount = 0;
  if (emailNow.length > 0) {
    try {
      const queued = await insertGroupMail(admin, {
        recipients: emailNow,
        templateKey,
        templateVariables,
      });
      if (queued.error) {
        if (queued.queued > 0) {
          await triggerEmailProcessor(url, serviceKey);
        }
        return json({ error: queued.error }, 500);
      }
      queuedCount = queued.queued;
    } catch (error) {
      return policyErrorToResponse(error);
    }
    if (queuedCount > 0) {
      await triggerEmailProcessor(url, serviceKey);
    }
  }

  if (pushNow.length > 0) {
    const pushPlan = planPushForKind(
      kind,
      prayer,
      rendered.prayerDescriptionText,
      updatePlain,
    );
    await fetch(`${url}/functions/v1/send-push-notification`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emails: pushNow,
        title: pushPlan.title,
        body: pushPlan.body,
        data: {
          type: pushPlan.pushType,
          prayerId,
          groupId,
        },
      }),
    });
  }

  return json({
    success: true,
    notified: queuedCount,
    queued: queuedCount,
    pushed: pushNow.length,
  });
}

async function triggerEmailProcessor(supabaseUrl: string, serviceKey: string): Promise<void> {
  try {
    await fetch(`${supabaseUrl}/functions/v1/trigger-email-processor`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
    });
  } catch {
    // Queue rows remain pending; processor can be triggered manually.
  }
}

async function lookupSubscriberByEmail(
  admin: ReturnType<typeof createClient>,
  email: string,
): Promise<SubscriberNotifyRow | null> {
  const { data: exact, error: exactError } = await admin
    .from('email_subscribers')
    .select('email, is_active, is_blocked, receive_push, name')
    .eq('email', email)
    .maybeSingle();
  if (exactError) {
    throw exactError;
  }
  if (exact) {
    return exact as SubscriberNotifyRow;
  }
  const { data: matches, error: ilikeError } = await admin
    .from('email_subscribers')
    .select('email, is_active, is_blocked, receive_push, name')
    .ilike('email', escapeIlikeExactEmail(email))
    .limit(2);
  if (ilikeError) {
    throw ilikeError;
  }
  const rows = (matches ?? []) as SubscriberNotifyRow[];
  if (rows.length === 0) {
    return null;
  }
  const canonical = rows.find((row) => row.email.toLowerCase() === email);
  return canonical ?? (rows.length === 1 ? rows[0] : null);
}

async function lookupSubscribersByEmails(
  admin: ReturnType<typeof createClient>,
  emails: string[],
): Promise<SubscriberNotifyRow[]> {
  const rows: SubscriberNotifyRow[] = [];
  for (const email of emails) {
    const row = await lookupSubscriberByEmail(admin, email);
    if (row) {
      rows.push(row);
    }
  }
  return rows;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
