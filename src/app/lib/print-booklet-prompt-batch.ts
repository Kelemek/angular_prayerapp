import { escapeHtmlForPrint } from './print-html';
import { splitPromptsIntoTwoColumnsRowMajor } from './print-prompt-layout';
import { buildPrintPromptCardHtml } from './print-prompt-card-html';

export function buildBookletPromptBatchHtml(
  typeName: string,
  batchPrompts: Array<{ title: string }>,
  opts: { continued: boolean; totalCountInType: number },
): string {
const { col1, col2 } = splitPromptsIntoTwoColumnsRowMajor(batchPrompts);
const col1HTML = col1.map((prompt: any) => buildPrintPromptCardHtml(prompt)).join('');
const col2HTML = col2.map((prompt: any) => buildPrintPromptCardHtml(prompt)).join('');
const heading = opts.continued
  ? `<p class="booklet-prompt-continued-note">(continued)</p>`
  : `<h2 class="booklet-h2">${escapeHtmlForPrint(typeName)} Prompts (${opts.totalCountInType})</h2>`;
return `<div class="booklet-prompt-print-root"><div class="type-section">${heading}<div class="columns"><div class="col">${col1HTML}</div><div class="col">${col2HTML}</div></div></div></div>`;
}
