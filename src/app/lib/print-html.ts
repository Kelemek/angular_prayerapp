/**
 * Escape HTML special characters for printable documents.
 * Falls back to manual escaping when `document` is unavailable (tests).
 */
export function escapeHtmlForPrint(text: string): string {
  if (typeof document !== 'undefined') {
    const div = document.createElement('div');
    div.textContent = text;
    const html = div.innerHTML;
    if (html != null) {
      return html;
    }
  }
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
