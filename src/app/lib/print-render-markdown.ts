import { markdownToSafeHtml } from '../../utils/markdown';

/** Render markdown to sanitized HTML for printable pages. */
export function renderPrintMarkdown(text: string | null | undefined): string {
  return markdownToSafeHtml(text || '');
}
