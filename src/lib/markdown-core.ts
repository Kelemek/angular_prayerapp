/**
 * Pure TipTap/Markdown string transforms shared by Angular (`markdown.ts`) and Edge email jobs.
 * Edge functions inline the same logic — edit `src/lib/edge-email-markdown.ts`, then run
 * `node scripts/inline-edge-email-helpers.mjs`.
 */

/** TipTap hard breaks: `\` + newline or two spaces + newline → plain newline. */
export function normalizeMarkdownHardBreaks(markdown: string): string {
  return markdown.replace(/\\(\r?\n)/g, '\n').replace(/ {2,}(\r?\n)/g, '\n');
}

/**
 * TipTap's Underline mark serializes as ++text++. Expand to `<u>` before `marked`
 * (skipping fenced code blocks so literal ++ in code is preserved).
 */
export function expandTiptapUnderlineForMarked(markdown: string): string {
  const segments = markdown.split(/(```[\s\S]*?```)/g);
  return segments
    .map((segment) => {
      if (segment.startsWith('```')) return segment;
      return segment.replace(/\+\+([\s\S]+?)\+\+/g, '<u>$1</u>');
    })
    .join('');
}

/** marked emits `<del>` for GFM strikethrough; our allowlist uses `<s>`. */
export function normalizeMarkedDelToStrike(html: string): string {
  return html.replace(/<\/?del\b([^>]*)>/gi, (tag) => tag.replace(/del/gi, 's'));
}

export function preprocessMarkdownForMarked(markdown: string): string {
  return expandTiptapUnderlineForMarked(normalizeMarkdownHardBreaks(markdown));
}

/**
 * Strip markdown syntax to plain text; preserves paragraph breaks (does not collapse whitespace).
 */
export function stripMarkdownSyntaxToPlainText(markdown: string): string {
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
