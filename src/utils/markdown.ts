import domPurifyImport from 'dompurify';
import { Marked } from 'marked';
import {
  normalizeMarkedDelToStrike,
  preprocessMarkdownForMarked,
  stripMarkdownSyntaxToPlainText,
} from '../lib/markdown-core';

const ALLOWED_TAGS = [
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

const ALLOWED_ATTR = ['href', 'title', 'target', 'rel', 'style', 'src', 'alt', 'width', 'height'];

const PASTED_BROADCAST_TAGS = [
  ...ALLOWED_TAGS,
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'td',
  'th',
  'div',
  'span',
  'h1',
  'h2',
  'center',
  'font',
];

const PASTED_BROADCAST_ATTR = [
  ...ALLOWED_ATTR,
  'role',
  'align',
  'valign',
  'bgcolor',
  'cellpadding',
  'cellspacing',
  'border',
  'colspan',
  'rowspan',
];

type HtmlSanitizeProfile = {
  allowedTags: readonly string[];
  allowedAttr: readonly string[];
  structuralMarkers: readonly string[];
};

const MARKDOWN_PROFILE: HtmlSanitizeProfile = {
  allowedTags: ALLOWED_TAGS,
  allowedAttr: ALLOWED_ATTR,
  structuralMarkers: ['<ul', '<ol', '<blockquote'],
};

const PASTED_BROADCAST_PROFILE: HtmlSanitizeProfile = {
  allowedTags: PASTED_BROADCAST_TAGS,
  allowedAttr: PASTED_BROADCAST_ATTR,
  structuralMarkers: ['<table', '<tr', '<td'],
};

const SANITIZE_FORBID_ATTR = ['class', 'id'];

function isSafeHref(value: string): boolean {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return false;
  if (trimmed.startsWith('javascript:')) return false;
  if (trimmed.startsWith('data:') && !trimmed.startsWith('data:text/plain')) return false;
  if (trimmed.startsWith('vbscript:')) return false;
  return true;
}

/** Images in email/broadcast HTML: https only, or root-relative paths (not protocol-relative). */
function isSafeImageSrc(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('javascript:') || lower.startsWith('vbscript:') || lower.startsWith('data:')) {
    return false;
  }
  if (lower.startsWith('https://')) return true;
  // Root-relative only (e.g. /marketing/…). Reject //evil.example or http:
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return true;
  return false;
}

// Inline styles matter for email clients that ignore <style>/class rules.
// Kept in sync with `RichTextViewComponent` styles so in-app rendering looks the
// same whether the CSS class applies (DOM-rendered) or the inline style wins
// (email HTML). Tags without a visible default in email clients are styled here.
const INLINE_STYLES: Record<string, string> = {
  BLOCKQUOTE:
    'margin: 0.5rem 0; padding: 0.25rem 0.75rem; border-left: 3px solid rgba(57, 112, 77, 0.5); opacity: 0.9;',
  /** Email clients often ignore default `u` styling; matches `RichTextViewComponent` */
  U: 'text-decoration: underline;',
  /** Subscriber broadcast / email screenshots — fluid width in narrow mail clients */
  IMG: 'display:block;max-width:100%;height:auto;border:0;border-radius:8px;margin:12px 0;',
};

type DomPurifyInstance = {
  sanitize: (dirty: string, config?: Record<string, unknown>) => string;
  isSupported?: boolean;
};

function isPassthroughPurify(purify: DomPurifyInstance): boolean {
  const probe = purify.sanitize('<script>alert(1)</script><p>ok</p>', {
    ALLOWED_TAGS: ['p'],
    KEEP_CONTENT: true,
  });
  return probe.includes('<script');
}

/** Some DOM implementations (e.g. happy-dom in Vitest) drop allowlisted parents but keep children. */
function sanitizeLostStructuralTags(
  rawHtml: string,
  sanitized: string,
  markers: readonly string[]
): boolean {
  const raw = rawHtml.toLowerCase();
  const out = sanitized.toLowerCase();
  return markers.some((marker) => raw.includes(marker) && !out.includes(marker));
}

function stylePropertyNames(style: string): Set<string> {
  const names = new Set<string>();
  for (const declaration of style.split(';')) {
    const colon = declaration.indexOf(':');
    if (colon <= 0) {
      continue;
    }
    const name = declaration.slice(0, colon).trim().toLowerCase();
    if (name) {
      names.add(name);
    }
  }
  return names;
}

function fillMissingStyleProperties(existing: string | null, defaults: string): string {
  const current = existing ?? '';
  const have = stylePropertyNames(current);
  const missing: string[] = [];
  for (const declaration of defaults.split(';')) {
    const trimmed = declaration.trim();
    if (!trimmed) {
      continue;
    }
    const colon = trimmed.indexOf(':');
    if (colon <= 0) {
      continue;
    }
    const name = trimmed.slice(0, colon).trim().toLowerCase();
    if (!have.has(name)) {
      missing.push(trimmed);
    }
  }
  if (!current.trim()) {
    return missing.join(';');
  }
  if (missing.length === 0) {
    return current;
  }
  return `${current.trim().replace(/;\s*$/, '')};${missing.join(';')}`;
}

function createWindowBoundPurify(win: Window): DomPurifyInstance {
  const boundWindow = win as unknown as typeof globalThis;
  const mod = domPurifyImport as unknown as
    | DomPurifyInstance
    | ((root: typeof globalThis) => DomPurifyInstance);

  if (typeof mod === 'function') {
    return mod(boundWindow);
  }

  if (mod.isSupported === false) {
    const recreate = domPurifyImport as unknown as (root: typeof globalThis) => DomPurifyInstance;
    return recreate(boundWindow);
  }

  if (isPassthroughPurify(mod)) {
    const recreate = domPurifyImport as unknown as (root: typeof globalThis) => DomPurifyInstance;
    if (typeof recreate === 'function') {
      return recreate(boundWindow);
    }
  }

  return mod;
}

function getDomPurify(): DomPurifyInstance {
  const win = typeof window !== 'undefined' ? window : undefined;
  if (!win) {
    throw new Error('markdownToSafeHtml requires a DOM (browser or jsdom)');
  }

  const purify = createWindowBoundPurify(win);
  if (!isPassthroughPurify(purify)) {
    return purify;
  }

  const retry = createWindowBoundPurify(win);
  if (!isPassthroughPurify(retry)) {
    return retry;
  }

  return retry;
}

let markedParser: Marked | null = null;

function getMarked(): Marked {
  if (!markedParser) {
    markedParser = new Marked({ gfm: true, breaks: true });
  }
  return markedParser;
}

function applyRichHtmlEnhancements(root: ParentNode | null | undefined): void {
  if (!root || typeof root.querySelectorAll !== 'function') {
    return;
  }

  root.querySelectorAll('a').forEach((anchor) => {
    const href = anchor.getAttribute('href') || '';
    if (!isSafeHref(href)) {
      anchor.removeAttribute('href');
    } else {
      anchor.setAttribute('target', '_blank');
      anchor.setAttribute('rel', 'noopener noreferrer');
    }
  });

  root.querySelectorAll('u').forEach((node) => {
    if (!node.getAttribute('style')) {
      node.setAttribute('style', INLINE_STYLES['U']);
    }
  });

  root.querySelectorAll('blockquote').forEach((node) => {
    if (!node.getAttribute('style')) {
      node.setAttribute('style', INLINE_STYLES['BLOCKQUOTE']);
    }
  });

  root.querySelectorAll('img').forEach((node) => {
    const src = node.getAttribute('src') || '';
    if (!isSafeImageSrc(src)) {
      node.remove();
      return;
    }
    if (!node.getAttribute('alt')) {
      node.setAttribute('alt', '');
    }
    const filledStyle = fillMissingStyleProperties(node.getAttribute('style'), INLINE_STYLES['IMG']);
    if (node.getAttribute('style') !== filledStyle) {
      node.setAttribute('style', filledStyle);
    }
  });
}

function stripToAllowlistedHtml(html: string, doc: Document, profile: HtmlSanitizeProfile): string {
  if (typeof doc.createElement !== 'function') {
    return html;
  }

  const allowedTags = new Set(profile.allowedTags.map((tag) => tag.toUpperCase()));
  const allowedAttr = new Set(profile.allowedAttr);
  const template = doc.createElement('template');
  template.innerHTML = html;
  const source = template.content ?? template;

  const cloneCleanTree = (node: Node): Node | DocumentFragment | null => {
    if (node.nodeType === Node.TEXT_NODE) {
      return doc.createTextNode(node.textContent ?? '');
    }
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return null;
    }

    const el = node as Element;
    const tag = el.tagName;
    if (!allowedTags.has(tag)) {
      const fragment = doc.createDocumentFragment();
      Array.from(el.childNodes).forEach((child) => {
        const cleaned = cloneCleanTree(child);
        if (cleaned) {
          fragment.appendChild(cleaned);
        }
      });
      return fragment;
    }

    const out = doc.createElement(tag.toLowerCase());
    Array.from(el.attributes).forEach((attr) => {
      if (!allowedAttr.has(attr.name)) {
        return;
      }
      if (attr.name === 'href' && !isSafeHref(attr.value)) {
        return;
      }
      if (attr.name === 'src' && !isSafeImageSrc(attr.value)) {
        return;
      }
      out.setAttribute(attr.name, attr.value);
    });
    Array.from(el.childNodes).forEach((child) => {
      const cleaned = cloneCleanTree(child);
      if (cleaned) {
        out.appendChild(cleaned);
      }
    });
    return out;
  };

  const container = doc.createElement('div');
  Array.from(source.childNodes).forEach((child) => {
    const cleaned = cloneCleanTree(child);
    if (cleaned) {
      container.appendChild(cleaned);
    }
  });
  applyRichHtmlEnhancements(container);
  return container.innerHTML;
}

function postProcessHtml(html: string): string {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return html;
  }

  const container = document.createElement('div');
  container.innerHTML = html;
  applyRichHtmlEnhancements(container);
  return container.innerHTML;
}

function sanitizeWithProfile(rawHtml: string, profile: HtmlSanitizeProfile): string {
  const purify = getDomPurify();
  let out = purify.sanitize(rawHtml, {
    ALLOWED_TAGS: [...profile.allowedTags],
    ALLOWED_ATTR: [...profile.allowedAttr],
    FORBID_ATTR: SANITIZE_FORBID_ATTR,
    KEEP_CONTENT: true,
  });

  const useAllowlistFallback =
    typeof document !== 'undefined' &&
    (isPassthroughPurify(purify) ||
      sanitizeLostStructuralTags(rawHtml, out, profile.structuralMarkers));

  if (useAllowlistFallback) {
    out = stripToAllowlistedHtml(rawHtml, document, profile);
  } else {
    out = postProcessHtml(out);
  }

  return out;
}

/**
 * Sanitize pasted HTML for the admin subscriber broadcast.
 * Wider tag list than {@link markdownToSafeHtml}. Href and image src checks still apply.
 */
export function sanitizeEmailHtml(html: string | null | undefined): string {
  if (!html) return '';
  return sanitizeWithProfile(String(html), PASTED_BROADCAST_PROFILE);
}

export function markdownToSafeHtml(markdown: string | null | undefined): string {
  if (!markdown) return '';
  const preprocessed = preprocessMarkdownForMarked(markdown);
  const parsed = getMarked().parse(preprocessed, { async: false });
  const rawHtml = normalizeMarkedDelToStrike(
    typeof parsed === 'string' ? parsed : String(parsed)
  );
  return sanitizeWithProfile(rawHtml, MARKDOWN_PROFILE);
}

/**
 * Strip tags from HTML for the plain-text MIME part of emails.
 */
export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return '';
  const raw = String(html);
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return raw
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  const el = document.createElement('div');
  el.innerHTML = raw;
  el.querySelectorAll('script,style').forEach((node) => node.remove());
  const text = (el.textContent ?? '').replace(/\u00a0/g, ' ');
  return text.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').replace(/[ \t]{2,}/g, ' ').trim();
}

/**
 * Strip markdown syntax to a human-readable plain text string.
 * Used for push notification bodies, email subject/preview lines, and
 * character-count heuristics (e.g. presentation pagination).
 */
export function markdownToPlainText(markdown: string | null | undefined): string {
  if (!markdown) return '';
  return stripMarkdownSyntaxToPlainText(String(markdown));
}
