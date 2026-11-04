import {
  type PrayerJournalFeedEntry,
  type PrayerJournalKind,
  journalNoteKey,
} from './prayer-journal-note';

type JournalFeedLoader = (entries: PrayerJournalFeedEntry[]) => void;

const tracked = new Map<string, PrayerJournalFeedEntry>();
let loader: JournalFeedLoader | null = null;
let scheduled = false;
let lastSent = '';

function schedule(): void {
  if (scheduled) {
    return;
  }
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    const signature = [...tracked.keys()].sort().join('|');
    if (signature === lastSent) {
      return;
    }
    if (!loader) {
      return;
    }
    lastSent = signature;
    loader([...tracked.values()]);
  });
}

/** One batch for the mounted feeds. Kinds named in `replaceKinds` are replaced even when empty. */
export function syncPrayerJournalFeed(
  entries: readonly PrayerJournalFeedEntry[],
  replaceKinds: readonly PrayerJournalKind[]
): void {
  if (replaceKinds.length === 0) {
    return;
  }
  const kinds = new Set(replaceKinds);
  for (const [key, entry] of tracked) {
    if (kinds.has(entry.kind)) {
      tracked.delete(key);
    }
  }
  for (const entry of entries) {
    if (!entry.prayerId || !kinds.has(entry.kind)) {
      continue;
    }
    tracked.set(journalNoteKey(entry.kind, entry.prayerId), entry);
  }
  schedule();
}

export function bindPrayerJournalFeedLoader(next: JournalFeedLoader | null): void {
  loader = next;
  if (!next) {
    return;
  }
  lastSent = '';
  schedule();
}

export function resetPrayerJournalFeedForTests(): void {
  tracked.clear();
  loader = null;
  scheduled = false;
  lastSent = '';
}
