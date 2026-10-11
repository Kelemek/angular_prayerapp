import { Injectable } from '@angular/core';
import { BehaviorSubject, distinctUntilChanged } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';
import { UserSessionService } from './user-session.service';
import {
  bibleBooksPlainText,
  bibleBooksReferenceLabel,
  type BibleBooksMemorizationScope,
} from '../lib/memorization/bibleBooksMemorization';
import type {
  BibleTranslation,
  MemorizationInProgress,
  MemorizationInProgressSavePayload,
  MemorizationPracticeSessionRecord,
  MemorizedItem,
  MemorizedItemRow,
} from '../types/memorization';
import { isBibleTranslation } from '../types/memorization';
import { emitClientPreferencesLocalChange } from '../lib/client-preferences-notify';

export type AddMemorizedItemOutcome =
  | { ok: true; item: MemorizedItem }
  | { ok: false; reason: 'empty_reference' | 'empty_text' | 'duplicate' | 'no_user' | 'db_error' };

export interface PracticeSessionResult {
  wrongAttempts: number;
  correctKeystrokes: number;
  completed: boolean;
}

const PREFERRED_TRANSLATION_KEY = 'prayer_app_preferred_bible_translation';

@Injectable({
  providedIn: 'root',
})
export class MemorizationService {
  private itemsSubject = new BehaviorSubject<MemorizedItem[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(true);

  readonly memorizedItems$ = this.itemsSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();

  constructor(
    private supabase: SupabaseService,
    private toast: ToastService,
    private userSession: UserSessionService
  ) {
    this.userSession.userSession$
      .pipe(distinctUntilChanged((a, b) => a?.email === b?.email))
      .subscribe((session) => {
        if (session?.email) {
          void this.loadItems();
        } else {
          this.itemsSubject.next([]);
          this.loadingSubject.next(false);
        }
      });
  }

  get items(): MemorizedItem[] {
    return this.itemsSubject.value;
  }

  getPreferredTranslation(): BibleTranslation {
    try {
      const stored = localStorage.getItem(PREFERRED_TRANSLATION_KEY);
      if (isBibleTranslation(stored)) return stored;
    } catch {
      /* ignore */
    }
    return 'esv';
  }

  setPreferredTranslation(translation: BibleTranslation): void {
    try {
      localStorage.setItem(PREFERRED_TRANSLATION_KEY, translation);
      emitClientPreferencesLocalChange();
    } catch {
      /* ignore */
    }
  }

  async loadItems(): Promise<void> {
    const userEmail = await this.getUserEmail();
    if (!userEmail) {
      this.itemsSubject.next([]);
      this.loadingSubject.next(false);
      return;
    }

    this.loadingSubject.next(true);
    try {
      const { data, error } = await this.supabase.client
        .from('memorized_items')
        .select('*')
        .ilike('user_email', userEmail)
        .order('date_added', { ascending: false });

      if (error) throw error;
      const items = (data as MemorizedItemRow[] | null)?.map((row) => this.rowToItem(row)) ?? [];
      this.itemsSubject.next(items);
    } catch (err) {
      console.error('[MemorizationService] loadItems failed:', err);
      this.toast.error('Failed to load memorization list');
    } finally {
      this.loadingSubject.next(false);
    }
  }

  async addVerse(
    reference: string,
    translation: BibleTranslation = 'esv'
  ): Promise<AddMemorizedItemOutcome> {
    const normalizedRef = reference.trim();
    if (!normalizedRef) return { ok: false, reason: 'empty_reference' };

    const dup = this.items.some(
      (v) =>
        (v.kind === 'verse' || v.kind == null) &&
        v.reference === normalizedRef &&
        v.translation === translation
    );
    if (dup) return { ok: false, reason: 'duplicate' };

    const userEmail = await this.getUserEmail();
    if (!userEmail) return { ok: false, reason: 'no_user' };

    const { data, error } = await this.supabase.client
      .from('memorized_items')
      .insert({
        user_email: userEmail,
        reference: normalizedRef,
        text: '',
        translation,
        kind: 'verse',
        bible_books_scope: null,
        practice_sessions: [],
        in_progress_practice: null,
      })
      .select('*')
      .single();

    if (error || !data) {
      console.error('[MemorizationService] addVerse failed:', error);
      return { ok: false, reason: 'db_error' };
    }

    const item = this.rowToItem(data as MemorizedItemRow);
    this.itemsSubject.next([item, ...this.items]);
    return { ok: true, item };
  }

  async addBibleBooks(
    scope: BibleBooksMemorizationScope,
    translation: BibleTranslation = 'esv'
  ): Promise<AddMemorizedItemOutcome> {
    const plain = bibleBooksPlainText(scope);
    if (!plain) return { ok: false, reason: 'empty_text' };

    const dup = this.items.some((v) => v.kind === 'bibleBooks' && v.bibleBooksScope === scope);
    if (dup) return { ok: false, reason: 'duplicate' };

    const userEmail = await this.getUserEmail();
    if (!userEmail) return { ok: false, reason: 'no_user' };

    const { data, error } = await this.supabase.client
      .from('memorized_items')
      .insert({
        user_email: userEmail,
        reference: bibleBooksReferenceLabel(scope),
        text: plain,
        translation,
        kind: 'bibleBooks',
        bible_books_scope: scope,
        practice_sessions: [],
        in_progress_practice: null,
      })
      .select('*')
      .single();

    if (error || !data) {
      console.error('[MemorizationService] addBibleBooks failed:', error);
      return { ok: false, reason: 'db_error' };
    }

    const item = this.rowToItem(data as MemorizedItemRow);
    this.itemsSubject.next([item, ...this.items]);
    return { ok: true, item };
  }

  async removeItem(id: string): Promise<boolean> {
    const { error } = await this.supabase.client.from('memorized_items').delete().eq('id', id);
    if (error) {
      console.error('[MemorizationService] removeItem failed:', error);
      this.toast.error('Failed to remove item');
      return false;
    }
    this.itemsSubject.next(this.items.filter((v) => v.id !== id));
    return true;
  }

  async updatePracticeStats(id: string, result: PracticeSessionResult): Promise<MemorizedItem | null> {
    const existing = this.items.find((v) => v.id === id);
    if (!existing) return null;

    const session: MemorizationPracticeSessionRecord = {
      date: Date.now(),
      wrongAttempts: result.wrongAttempts,
      correctKeystrokes: result.correctKeystrokes,
      completed: result.completed,
    };

    const updated: MemorizedItem = {
      ...existing,
      inProgressPractice: null,
      lastPracticedAt: Date.now(),
      practiceSessions: [...existing.practiceSessions, session],
    };

    const { error } = await this.supabase.client
      .from('memorized_items')
      .update({
        practice_sessions: updated.practiceSessions,
        last_practiced_at: new Date(updated.lastPracticedAt!).toISOString(),
        in_progress_practice: null,
      })
      .eq('id', id);

    if (error) {
      console.error('[MemorizationService] updatePracticeStats failed:', error);
      return null;
    }

    this.itemsSubject.next(this.items.map((v) => (v.id === id ? updated : v)));
    return updated;
  }

  async saveInProgress(id: string, payload: MemorizationInProgressSavePayload): Promise<void> {
    const inProgress: MemorizationInProgress = {
      ...payload,
      updatedAt: Date.now(),
    };
    const { error } = await this.supabase.client
      .from('memorized_items')
      .update({ in_progress_practice: inProgress })
      .eq('id', id);

    if (error) {
      console.error('[MemorizationService] saveInProgress failed:', error);
      return;
    }

    this.itemsSubject.next(
      this.items.map((v) => (v.id === id ? { ...v, inProgressPractice: inProgress } : v))
    );
  }

  async clearInProgress(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('memorized_items')
      .update({ in_progress_practice: null })
      .eq('id', id);

    if (error) {
      console.error('[MemorizationService] clearInProgress failed:', error);
      return;
    }

    this.itemsSubject.next(
      this.items.map((v) => (v.id === id ? { ...v, inProgressPractice: null } : v))
    );
  }

  private rowToItem(row: MemorizedItemRow): MemorizedItem {
    const translation = isBibleTranslation(row.translation) ? row.translation : 'esv';
    return {
      id: row.id,
      reference: row.reference,
      text: row.text,
      translation,
      dateAdded: new Date(row.date_added).getTime(),
      lastPracticedAt: row.last_practiced_at
        ? new Date(row.last_practiced_at).getTime()
        : null,
      practiceSessions: Array.isArray(row.practice_sessions) ? row.practice_sessions : [],
      inProgressPractice: row.in_progress_practice ?? null,
      kind: row.kind ?? 'verse',
      bibleBooksScope: row.bible_books_scope ?? undefined,
    };
  }

  private async getUserEmail(): Promise<string | null> {
    const session = this.userSession.getCurrentSession();
    if (session?.email) return session.email.toLowerCase();
    const { data } = await this.supabase.client.auth.getUser();
    return data.user?.email?.toLowerCase() ?? null;
  }
}
