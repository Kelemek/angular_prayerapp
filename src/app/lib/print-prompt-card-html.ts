import { escapeHtmlForPrint } from './print-html';

export function buildPrintPromptCardHtml(prompt: { title: string }): string {
return `
  <div class="prompt-item">
    <span class="prompt-text">${escapeHtmlForPrint(prompt.title)}</span>
  </div>
`;
}
