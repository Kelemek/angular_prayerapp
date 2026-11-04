import { Injectable, signal } from '@angular/core';
import { distinctUntilChanged, map } from 'rxjs';
import { capturePostHogException } from '../../lib/posthog';
import {
  bindPrayerJournalFeedLoader,
  resetPrayerJournalFeedForTests,
} from '../lib/prayer-journal-feed';
import {
  isPrayerJournalKind,
  journalNoteKey,
  sanitizeJournalNoteContent,
  type PrayerJournalFeedEntry,
  type PrayerJournalKind,
} from '../lib/prayer-journal-note';
import { SupabaseService } from './supabase.service';
import { UserSessionService } from './user-session.service';

const PRESENCE_CHUNK = 100;

interface JournalNoteRow {
  prayer_kind: string;
  prayer_id: string;
  content?: string;
}

/**
 * Private prayer notes. Text is passed only as query-builder values
 * (insert/update/upsert/filter arguments), never interpolated into SQL.
 */
@Injectable({ providedIn: 'root' })
export class PrayerJournalService {
  private readonly notedKeys = signal<ReadonlySet<string>>(new Set());
  private generation = 0;
  private loadedEmail: string | null | undefined = undefined;
  private lastSignature = '';
  private lastEntries: PrayerJournalFeedEntry[] = [];

  constructor(
    private readonly supabase: SupabaseService,
    private readonly userSession: UserSessionService
  ) {
    bindPrayerJournalFeedLoader((entries) => {
      void this.loadPresence(entries);
    });
    this.userSession.userSession$
      .pipe(
        map((session) => session?.email?.trim().toLowerCase() ?? null),
        distinctUntilChanged()
      )
      .subscribe((email) => {
        if (this.loadedEmail === undefined) {
          this.loadedEmail = email;
          return;
        }
        if (email === this.loadedEmail) {
          return;
        }
        this.loadedEmail = email;
        this.generation += 1;
        this.notedKeys.set(new Set());
        this.lastSignature = '';
        if (email && this.lastEntries.length > 0) {
          void this.loadPresence(this.lastEntries);
        }
      });
  }

  hasNote(kind: PrayerJournalKind, prayerId: string): boolean {
    return this.notedKeys().has(journalNoteKey(kind, prayerId));
  }

  async getNote(kind: PrayerJournalKind, prayerId: string): Promise<string> {
    if (!isPrayerJournalKind(kind) || !prayerId) {
      return '';
    }
    const userId = await this.sessionUserId();
    if (!userId) {
      return '';
    }
    const client = await this.supabase.db();
    const { data, error } = await client
      .from('prayer_journal_notes')
      .select('content')
      .eq('user_id', userId)
      .eq('prayer_kind', kind)
      .eq('prayer_id', prayerId)
      .maybeSingle();
    if (error) {
      capturePostHogException(error);
      return '';
    }
    const row = data as { content?: string } | null;
    return sanitizeJournalNoteContent(row?.content ?? '');
  }

  async save(kind: PrayerJournalKind, prayerId: string, raw: string): Promise<boolean> {
    const content = sanitizeJournalNoteContent(raw);
    if (!content) {
      return this.clear(kind, prayerId);
    }
    if (!isPrayerJournalKind(kind) || !prayerId || prayerId.length > 200) {
      return false;
    }
    const userId = await this.sessionUserId();
    if (!userId) {
      return false;
    }
    const client = await this.supabase.db();
    const { error } = await client.from('prayer_journal_notes').upsert(
      {
        user_id: userId,
        prayer_kind: kind,
        prayer_id: prayerId,
        content,
      },
      { onConflict: 'user_id,prayer_kind,prayer_id' }
    );
    if (error) {
      capturePostHogException(error);
      return false;
    }
    this.remember(kind, prayerId, true);
    return true;
  }

  async clear(kind: PrayerJournalKind, prayerId: string): Promise<boolean> {
    if (!isPrayerJournalKind(kind) || !prayerId) {
      return false;
    }
    const userId = await this.sessionUserId();
    if (!userId) {
      return false;
    }
    const client = await this.supabase.db();
    const { error } = await client
      .from('prayer_journal_notes')
      .delete()
      .eq('user_id', userId)
      .eq('prayer_kind', kind)
      .eq('prayer_id', prayerId);
    if (error) {
      capturePostHogException(error);
      return false;
    }
    this.remember(kind, prayerId, false);
    return true;
  }

  async loadPresence(entries: readonly PrayerJournalFeedEntry[]): Promise<void> {
    const email = this.userSession.getUserEmail()?.trim().toLowerCase() ?? null;
    const unique = dedupeEntries(entries);
    this.lastEntries = unique;
    const signature = `${email ?? ''}|${unique
      .map((entry) => journalNoteKey(entry.kind, entry.prayerId))
      .sort()
      .join(',')}`;
    if (signature === this.lastSignature) {
      return;
    }
    const gen = this.generation;
    const userId = await this.sessionUserId();
    if (gen !== this.generation) {
      return;
    }
    if (!userId || !email) {
      this.notedKeys.set(new Set());
      this.lastSignature = signature;
      return;
    }
    try {
      const rows = await this.selectPresence(userId, unique);
      if (gen !== this.generation) {
        return;
      }
      const allowed = new Set(
        unique.map((entry) => journalNoteKey(entry.kind, entry.prayerId))
      );
      const next = new Set(this.notedKeys());
      for (const entry of unique) {
        next.delete(journalNoteKey(entry.kind, entry.prayerId));
      }
      for (const row of rows) {
        if (!isPrayerJournalKind(row.prayer_kind)) {
          continue;
        }
        const key = journalNoteKey(row.prayer_kind, row.prayer_id);
        if (allowed.has(key)) {
          next.add(key);
        }
      }
      this.notedKeys.set(next);
      this.lastSignature = signature;
    } catch (error) {
      capturePostHogException(error);
    }
  }

  private async selectPresence(
    userId: string,
    entries: readonly PrayerJournalFeedEntry[]
  ): Promise<JournalNoteRow[]> {
    if (entries.length === 0) {
      return [];
    }
    const client = await this.supabase.db();
    const ids = [...new Set(entries.map((entry) => entry.prayerId))];
    const rows: JournalNoteRow[] = [];
    for (let index = 0; index < ids.length; index += PRESENCE_CHUNK) {
      const slice = ids.slice(index, index + PRESENCE_CHUNK);
      const kinds = [
        ...new Set(
          entries
            .filter((entry) => slice.includes(entry.prayerId))
            .map((entry) => entry.kind)
        ),
      ];
      const { data, error } = await client
        .from('prayer_journal_notes')
        .select('prayer_kind, prayer_id')
        .eq('user_id', userId)
        .in('prayer_id', slice)
        .in('prayer_kind', kinds);
      if (error) {
        throw error;
      }
      rows.push(...((data ?? []) as JournalNoteRow[]));
    }
    return rows;
  }

  private async sessionUserId(): Promise<string | null> {
    const client = await this.supabase.db();
    const { data } = await client.auth.getSession();
    const id = data.session?.user?.id;
    return typeof id === 'string' && id.length > 0 ? id : null;
  }

  private remember(kind: PrayerJournalKind, prayerId: string, present: boolean): void {
    this.generation += 1;
    const key = journalNoteKey(kind, prayerId);
    const next = new Set(this.notedKeys());
    if (present) {
      next.add(key);
    } else {
      next.delete(key);
    }
    this.notedKeys.set(next);
  }
}

function dedupeEntries(entries: readonly PrayerJournalFeedEntry[]): PrayerJournalFeedEntry[] {
  const map = new Map<string, PrayerJournalFeedEntry>();
  for (const entry of entries) {
    if (!entry.prayerId || !isPrayerJournalKind(entry.kind)) {
      continue;
    }
    map.set(journalNoteKey(entry.kind, entry.prayerId), entry);
  }
  return [...map.values()];
}

export function resetPrayerJournalServiceForTests(): void {
  resetPrayerJournalFeedForTests();
}
