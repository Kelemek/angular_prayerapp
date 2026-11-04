import type { PrayerCardIdentity, PrayerCardMutationKind } from './prayer-card-kind';
import { getPrayerCardMutationKind, isVerseMemorizationPrayer } from './prayer-card-kind';
import { markdownToSafeHtml } from '../../utils/markdown';

export type PrayerJournalKind = PrayerCardMutationKind;

const JOURNAL_KINDS: readonly PrayerJournalKind[] = [
  'member',
  'group',
  'personal',
  'community',
];

const RAW_HTML_TAG = /<\/?[a-z][^>]*>/i;

export const PRAYER_JOURNAL_CONTENT_MAX = 20000;

export function isPrayerJournalKind(value: string): value is PrayerJournalKind {
  return (JOURNAL_KINDS as readonly string[]).includes(value);
}

export function journalNoteKey(kind: PrayerJournalKind, prayerId: string): string {
  return `${kind}:${prayerId}`;
}

/**
 * Run the shared markdown sanitizer, then keep plain text unchanged.
 * Raw HTML is replaced with the sanitized HTML. SQL-like punctuation is not HTML,
 * so it stays the exact stored text.
 */
export function sanitizeJournalNoteContent(raw: string | null | undefined): string {
  const source = String(raw ?? '').replace(/\0/g, '').trim();
  if (!source) {
    return '';
  }
  const safeHtml = markdownToSafeHtml(source).trim();
  if (!RAW_HTML_TAG.test(source)) {
    return source.length > PRAYER_JOURNAL_CONTENT_MAX
      ? source.slice(0, PRAYER_JOURNAL_CONTENT_MAX)
      : source;
  }
  return safeHtml.length > PRAYER_JOURNAL_CONTENT_MAX
    ? safeHtml.slice(0, PRAYER_JOURNAL_CONTENT_MAX)
    : safeHtml;
}

export interface PrayerJournalFeedEntry {
  kind: PrayerJournalKind;
  prayerId: string;
}

export function journalEntriesForPrayers(
  prayers: readonly PrayerCardIdentity[],
  isPersonal = false
): PrayerJournalFeedEntry[] {
  const entries: PrayerJournalFeedEntry[] = [];
  for (const prayer of prayers) {
    if (!prayer?.id || isVerseMemorizationPrayer(prayer)) {
      continue;
    }
    entries.push({
      kind: getPrayerCardMutationKind(prayer, isPersonal),
      prayerId: prayer.id,
    });
  }
  return entries;
}

export function journalKindForCard(
  prayer: PrayerCardIdentity,
  isPersonal: boolean,
  groupName: string | null | undefined
): PrayerJournalKind {
  return getPrayerCardMutationKind(
    {
      id: prayer.id,
      user_email: prayer.user_email,
      content_kind: prayer.content_kind,
      group_name: prayer.group_name ?? groupName,
    },
    isPersonal
  );
}
