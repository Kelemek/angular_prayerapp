import { PRINT_BOOKLET_PROMPT_SECTION_HEADING_WEIGHT } from './print-booklet-constants';

/** Default accent colors for prayer prompt categories (matches standalone Prayer Prompts print). */
export function getPrintPromptTypeColors(): Record<string, string> {
  return {
    Praise: '#39704D',
    Confession: '#C9A961',
    Thanksgiving: '#0047AB',
    Supplication: '#8b5cf6',
  };
}

export function getPrintPromptTypeColor(typeName: string): string {
  return getPrintPromptTypeColors()[typeName] ?? '#6b7280';
}

/**
 * Shared CSS for prayer prompt blocks (standalone Prayer Prompts print + saddle-stitch booklet).
 * Optional `scopedRoot` prefixes selectors for booklet (e.g. `.booklet-prompt-print-root`).
 */
export function getPrintablePromptBlockStyles(options?: {
  scopedRoot?: string;
  includeStandaloneResponsive?: boolean;
}): string {
  const root = options?.scopedRoot?.trim();
  const p = root ? `${root} ` : '';
  let css = `
    ${p}.type-section {
      margin-bottom: 3px;
    }

    ${p}.prompt-item {
      background: transparent;
      border: 1px solid #e6e6e6;
      padding: 3px 6px;
      margin-bottom: 3px;
      border-radius: 2px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    ${p}.prompt-text {
      font-size: 13px;
      color: #374151;
      line-height: 1.3;
      display: inline;
      word-wrap: break-word;
      overflow-wrap: break-word;
    }

    ${p}.columns {
      display: flex;
      gap: 8px;
      align-items: flex-start;
    }

    ${p}.col {
      flex: 1 1 0;
      min-width: 0;
    }

    ${p}.booklet-prompt-continued-note {
      font-size: 12px;
      font-weight: 600;
      color: #1d4ed8;
      margin: 0 0 4px 0;
      page-break-after: avoid;
      break-after: avoid;
    }

    @media print {
      ${p}.prompt-item {
        page-break-inside: avoid;
        break-inside: avoid;
      }

      ${p}.type-section > h2 {
        page-break-after: avoid;
        break-after: avoid;
      }
    }`;

  if (options?.includeStandaloneResponsive) {
    css += `
    @media screen and (max-width: 768px) {
      ${p}.prompt-text {
        font-size: 16px;
      }
    }`;
  }

  return css;
}

/** Within a category, A→Z by title (case-insensitive) for printable prompts and booklet. */
export function sortPromptsAlphabeticalByTitle<T extends { title?: string }>(prompts: T[]): T[] {
  return [...prompts].sort((a, b) =>
    String(a?.title ?? '')
      .trim()
      .localeCompare(String(b?.title ?? '').trim(), undefined, { sensitivity: 'base' }),
  );
}

/**
 * Split prompts into two `.col` stacks in **reading order**: row 1 (left, right), row 2 (left, right), …
 */
export function splitPromptsIntoTwoColumnsRowMajor<T>(prompts: T[]): { col1: T[]; col2: T[] } {
  const col1: T[] = [];
  const col2: T[] = [];
  for (let i = 0; i < prompts.length; i++) {
    if (i % 2 === 0) {
      col1.push(prompts[i]!);
    } else {
      col2.push(prompts[i]!);
    }
  }
  return { col1, col2 };
}

/** Heuristic height budget for one prompt title card in the booklet (matches packing splits). */
export function estimateBookletPromptTitleWeight(title: string): number {
  const t = typeof title === 'string' ? title : '';
  return Math.ceil(t.length * 1.15) + 130;
}

export function estimateBookletPromptBatchWeight(batch: Array<{ title?: string }>): number {
  const w = batch.reduce((sum, p) => sum + estimateBookletPromptTitleWeight(p?.title ?? ''), 0);
  return w + PRINT_BOOKLET_PROMPT_SECTION_HEADING_WEIGHT;
}
