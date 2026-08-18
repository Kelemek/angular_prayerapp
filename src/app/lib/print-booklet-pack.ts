import {
  PRINT_BOOKLET_CARD_FRAME_CHARS,
  PRINT_BOOKLET_COMPACT_UPDATE_BOX_CHROME_CHARS,
  PRINT_BOOKLET_MARKDOWN_CHARS_PER_PANEL,
  PRINT_BOOKLET_MARKDOWN_LIST_LINE_PREMIUM,
  PRINT_BOOKLET_MARKDOWN_TO_HTML_WEIGHT,
  PRINT_BOOKLET_MAX_UNITS_PER_PANEL_CHUNK,
  PRINT_BOOKLET_SOFT_NEWLINE_VERTICAL_PREMIUM,
  PRINT_BOOKLET_UPDATES_MARKDOWN_FACTOR,
} from './print-booklet-constants';
import type { BookletPackUnit, Prayer } from './print-types';

/** UTF-8 JSON payload for inlined booklet layout script. */
export function encodePrintUtf8Base64(raw: string): string {
try {
  const bytes = new TextEncoder().encode(raw);
  let binary = '';
  bytes.forEach(b => (binary += String.fromCharCode(b)));
  return typeof btoa === 'function' ? btoa(binary) : '';
} catch {
  return '';
}
}

export function getBookletSortedFirstUpdateMarkdown(prayer: Prayer): string | null {
const list = prayer.prayer_updates;
if (!Array.isArray(list) || list.length === 0) {
  return null;
}
const sorted = [...list].sort(
  (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
);
const c = sorted[0]?.content;
return typeof c === 'string' && c.trim().length ? c.trim() : null;
}

export function estimateBookletCompactUpdatesBlockWeight(updateMarkdown: string): number {
const m = updateMarkdown ?? '';
if (!m.length) {
  return PRINT_BOOKLET_COMPACT_UPDATE_BOX_CHROME_CHARS;
}
const newlineCount = m.match(/\r?\n/g)?.length ?? 0;
const listLineHints =
  m.match(/(?:^|\r?\n)[ \t]{0,3}(?:[-*+] |\d+[.)]\s)/g) ?? [];
const listHeadCount = listLineHints.length;
/** ~chars per line scales with column width; narrower panel padding widens the text box vs older 52-char est. */
const narrowColumnWrapPremium = Math.ceil((m.length / 57) * 14);

return (
  PRINT_BOOKLET_COMPACT_UPDATE_BOX_CHROME_CHARS +
  Math.ceil(m.length * PRINT_BOOKLET_UPDATES_MARKDOWN_FACTOR) +
  newlineCount * PRINT_BOOKLET_SOFT_NEWLINE_VERTICAL_PREMIUM +
  listHeadCount * PRINT_BOOKLET_MARKDOWN_LIST_LINE_PREMIUM +
  narrowColumnWrapPremium
);
}

export function getBookletDescriptionSegmentMaxChars(firstUpdateMarkdown: string | null): number {
if (!firstUpdateMarkdown) {
  return PRINT_BOOKLET_MARKDOWN_CHARS_PER_PANEL;
}
const updateBlockWeight = estimateBookletCompactUpdatesBlockWeight(firstUpdateMarkdown);
const shave = Math.min(
  Math.floor(PRINT_BOOKLET_MARKDOWN_CHARS_PER_PANEL * 0.58),
  Math.max(0, Math.floor((updateBlockWeight - 420) * 0.52))
);
return Math.max(260, PRINT_BOOKLET_MARKDOWN_CHARS_PER_PANEL - shave);
}

export function estimateBookletUnitWeight(descriptionMarkdown: string, compactUpdatesMarkdown: string | null): number {
const markdown = descriptionMarkdown ?? '';
const newlineCount = markdown.match(/\r?\n/g)?.length ?? 0;
const listLineHints =
  markdown.match(/(?:^|\r?\n)[ \t]{0,3}(?:[-*+] |\d+[.)]\s)/g) ?? [];
const listHeadCount = listLineHints.length;

let w =
  Math.ceil(markdown.length * PRINT_BOOKLET_MARKDOWN_TO_HTML_WEIGHT) +
  PRINT_BOOKLET_CARD_FRAME_CHARS +
  newlineCount * PRINT_BOOKLET_SOFT_NEWLINE_VERTICAL_PREMIUM +
  listHeadCount * PRINT_BOOKLET_MARKDOWN_LIST_LINE_PREMIUM;

if (compactUpdatesMarkdown && compactUpdatesMarkdown.length > 0) {
  w += estimateBookletCompactUpdatesBlockWeight(compactUpdatesMarkdown);
}
return w;
}

export function partitionBookletUnitsIntoChunks(units: { html: string; weight: number }[], panelBudget: number, sectionH2Reserve: number, bottomMarginSlack: number): BookletPackUnit[][] {
const partitions: { html: string; weight: number }[][] = [];
let idx = 0;
let pendingHeading = true;

while (idx < units.length) {
  const cap =
    (pendingHeading ? panelBudget - sectionH2Reserve : panelBudget) - bottomMarginSlack;
  const chunk: { html: string; weight: number }[] = [];
  let sum = 0;

  while (idx < units.length) {
    const u = units[idx]!;
    if (chunk.length === 0) {
      chunk.push(u);
      sum += u.weight;
      idx++;
      continue;
    }
    if (
      chunk.length >= PRINT_BOOKLET_MAX_UNITS_PER_PANEL_CHUNK ||
      !(sum + u.weight <= cap)
    ) {
      break;
    }
    chunk.push(u);
    sum += u.weight;
    idx++;
  }

  partitions.push(chunk);
  pendingHeading = false;
}

return partitions;
}

export function packBookletUnitsIntoPageChunks(units: { html: string; weight: number }[], sectionH2: string, panelBudget: number, sectionH2Reserve: number, bottomMarginSlack: number): string[] {
const partitions = partitionBookletUnitsIntoChunks(
  units,
  panelBudget,
  sectionH2Reserve,
  bottomMarginSlack
);
const out: string[] = [];
/** First emitted chunk carries the colored section heading */
let pendingHeading = true;

for (const chunk of partitions) {
  const heading = pendingHeading ? sectionH2 : '';
  pendingHeading = false;

  const body = chunk.map(u => u.html).join('');

  out.push(`<div class="booklet-chunk">${heading}${body}</div>`);
}

return out;
}

export function splitBookletMarkdownIntoPanelParts(markdown: string, maxChars: number): string[] {
const t = markdown.trimEnd();
if (!t.length) {
  return [''];
}
if (t.length <= maxChars) {
  return [t];
}
const paragraphs = t.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 0);
const chunks: string[] = [];
let cur = '';

for (const para of paragraphs) {
  if (para.length > maxChars) {
    if (cur.trim()) {
      chunks.push(cur.trim());
      cur = '';
    }
    chunks.push(...hardSplitBookletMarkdown(para, maxChars));
    continue;
  }
  const joiner = cur.trim() ? '\n\n' : '';
  const next = `${cur}${joiner}${para}`;
  if (next.length <= maxChars) {
    cur = next;
  } else {
    if (cur.trim()) {
      chunks.push(cur.trim());
    }
    cur = para;
  }
}
if (cur.trim()) {
  chunks.push(cur.trim());
}

const out = chunks.filter(c => c.length > 0);
return out.length ? out : [''];
}

export function hardSplitBookletMarkdown(text: string, maxChars: number): string[] {
const pieces: string[] = [];
let rest = text.trim();
const minChunk = Math.max(200, Math.floor(maxChars * 0.35));
while (rest.length > maxChars) {
  let cut = rest.lastIndexOf('\n', maxChars);
  if (cut < minChunk) {
    cut = rest.lastIndexOf(' ', maxChars);
  }
  if (cut < minChunk || cut <= 0) {
    cut = Math.min(maxChars, rest.length);
  }
  const head = rest.slice(0, cut).trimEnd();
  if (head.length) {
    pieces.push(head);
  }
  rest = rest.slice(cut).trimStart();
}
if (rest.length) {
  pieces.push(rest);
}
return pieces.length ? pieces : [text.slice(0, maxChars)];
}
