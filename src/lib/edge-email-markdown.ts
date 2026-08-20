/**
 * Edge reminder email markdown → safe HTML / plain text (Deno-compatible logic).
 * Keep in sync with inline helpers in:
 * - supabase/functions/send-user-prayer-item-reminders/index.ts
 * - supabase/functions/send-user-hourly-prayer-reminders/index.ts
 */
import { Marked } from 'marked';
import {
  normalizeMarkedDelToStrike,
  preprocessMarkdownForMarked,
  stripMarkdownSyntaxToPlainText,
} from './markdown-core';

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

export function markdownToSafeHtml(markdown: string | null | undefined): string {
  if (!markdown) return '';
  const preprocessed = preprocessMarkdownForMarked(String(markdown));
  const parsed = getMarked().parse(preprocessed, { async: false });
  const rawHtml = normalizeMarkedDelToStrike(
    typeof parsed === 'string' ? parsed : String(parsed)
  );
  return stripToAllowlistedHtml(rawHtml);
}

export function markdownToPlainText(markdown: string | null | undefined): string {
  if (!markdown) return '';
  return stripMarkdownSyntaxToPlainText(String(markdown));
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function truncateText(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen - 1)}…`;
}

export function buildPrayerUpdateBlockHtml(updateHtml: string): string {
  if (!updateHtml) return '';
  return `<p style="margin: 15px 0 10px 0;"><strong>Update</strong></p><div style="background-color:#ffffff;padding:15px;border-radius:6px;border-left:4px solid #3b82f6;margin:0;">${updateHtml}</div>`;
}

export interface SpotlightEmailCandidate {
  kindLabel: string;
  title: string;
  prayerFor: string;
  requester: string;
  description: string;
}

export interface SpotlightEmailTemplateVars {
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

export function buildSpotlightEmailTemplateVars(
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
