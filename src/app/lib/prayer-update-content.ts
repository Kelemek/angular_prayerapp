import { markdownToPlainText } from '../../utils/markdown';

/** Default update body when the user marks a prayer answered without typing details. */
export const MARK_AS_ANSWERED_DEFAULT_UPDATE_CONTENT = 'Marked as answered';

/** Markdown image syntax (e.g. screenshots) has no plain text but is valid update content. */
function hasImageMarkdown(markdown: string): boolean {
  return /!\[[^\]]*\]\([^)]+\)/.test(markdown);
}

function hasSubstantivePrayerUpdateMarkdown(markdown: string): boolean {
  if (markdownToPlainText(markdown).trim()) {
    return true;
  }
  return hasImageMarkdown(markdown);
}

/** Normalize add/update prayer body text; optional default when marking answered. */
export function resolvePrayerUpdateContent(
  raw: string | null | undefined,
  markAsAnswered: boolean
): string {
  const markdown = (raw ?? '').trim();
  if (markdown && hasSubstantivePrayerUpdateMarkdown(markdown)) {
    return markdown;
  }
  if (markAsAnswered) {
    return MARK_AS_ANSWERED_DEFAULT_UPDATE_CONTENT;
  }
  return '';
}
