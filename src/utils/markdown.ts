import domPurifyImport from 'dompurify';
import { Marked } from 'marked';

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

const SANITIZE_CONFIG = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  FORBID_ATTR: ['class', 'id'],
  KEEP_CONTENT: true,
};

const ALLOWED_TAG_SET = new Set(ALLOWED_TAGS.map((tag) => tag.toUpperCase()));

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
function sanitizeLostStructuralTags(rawHtml: string, sanitized: string): boolean {
  const raw = rawHtml.toLowerCase();
  const out = sanitized.toLowerCase();
  const markers = ['<ul', '<ol', '<blockquote'];
  return markers.some((marker) => raw.includes(marker) && !out.includes(marker));
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

/**
 * TipTap's Underline mark serializes as ++text++. Common Markdown parsers do not
 * treat that as underline, so we expand to &lt;u&gt; before `marked` (skipping
 * fenced code blocks so literal ++ in code is preserved).
 */
function expandTiptapUnderlineForMarked(markdown: string): string {
  const segments = markdown.split(/(```[\s\S]*?```)/g);
  return segments
    .map((segment) => {
      if (segment.startsWith('```')) {
        return segment;
      }
      return segment.replace(/\+\+([\s\S]+?)\+\+/g, '<u>$1</u>');
    })
    .join('');
}

/** marked emits `<del>` for GFM strikethrough; our allowlist uses `<s>`. */
function normalizeMarkedDelToStrike(html: string): string {
  return html.replace(/<\/?del\b([^>]*)>/gi, (tag) => tag.replace(/del/gi, 's'));
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
    if (!node.getAttribute('style')) {
      node.setAttribute('style', INLINE_STYLES['IMG']);
    }
  });
}

function stripToAllowlistedHtml(html: string, doc: Document): string {
  if (typeof doc.createElement !== 'function') {
    return html;
  }

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
    if (!ALLOWED_TAG_SET.has(tag)) {
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
      if (!ALLOWED_ATTR.includes(attr.name)) {
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

/**
 * Sanitize already-authored HTML for email (Admin broadcast HTML paste).
 * Same allowlist as {@link markdownToSafeHtml} (including safe HTTPS / root-relative images).
 */
export function sanitizeEmailHtml(html: string | null | undefined): string {
  if (!html) return '';
  const rawHtml = String(html);

  const purify = getDomPurify();
  let out = purify.sanitize(rawHtml, SANITIZE_CONFIG);

  const useAllowlistFallback =
    typeof document !== 'undefined' &&
    (isPassthroughPurify(purify) || sanitizeLostStructuralTags(rawHtml, out));

  if (useAllowlistFallback) {
    out = stripToAllowlistedHtml(rawHtml, document);
  } else {
    out = postProcessHtml(out);
  }

  return out;
}

export function markdownToSafeHtml(markdown: string | null | undefined): string {
  if (!markdown) return '';
  const preprocessed = expandTiptapUnderlineForMarked(markdown);
  const parsed = getMarked().parse(preprocessed, { async: false });
  const rawHtml = normalizeMarkedDelToStrike(
    typeof parsed === 'string' ? parsed : String(parsed)
  );
  return sanitizeEmailHtml(rawHtml);
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
  let text = String(markdown);
  // Code fences
  text = text.replace(/```[\s\S]*?```/g, (m) => m.replace(/```/g, '').trim());
  // Inline code
  text = text.replace(/`([^`]+)`/g, '$1');
  // Images ![alt](url)
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1');
  // Links [text](url)
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
  // Bold / italic / strikethrough / underline-ish markers
  text = text.replace(/(\*\*|__)(.*?)\1/g, '$2');
  text = text.replace(/(\*|_)(.*?)\1/g, '$2');
  text = text.replace(/~~(.*?)~~/g, '$1');
  text = text.replace(/\+\+([\s\S]+?)\+\+/g, '$1');
  // Headings
  text = text.replace(/^\s{0,3}#{1,6}\s+/gm, '');
  // Blockquote markers
  text = text.replace(/^\s{0,3}>\s?/gm, '');
  // List bullets / numbers
  text = text.replace(/^\s*[-*+]\s+/gm, '');
  text = text.replace(/^\s*\d+\.\s+/gm, '');
  // Collapse >2 blank lines
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}
