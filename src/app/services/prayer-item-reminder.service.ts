import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { UserSessionService } from './user-session.service';
import type {
  CreatePrayerItemReminderInput,
  PrayerItemReminder,
  PrayerItemReminderKind,
} from '../types/prayer-item-reminder';
import { prayerItemReminderSchedulesMatch } from '../types/prayer-item-reminder';

const STALE_MS = 10 * 60 * 1000;

const SELECT_COLS =
  'id, user_email, prayer_kind, prayer_id, title_snapshot, prayer_for_snapshot, mode, iana_timezone, local_hour, local_minute, local_date, local_weekday, last_sent_at, created_at';

@Injectable({
  providedIn: 'root',
})
export class PrayerItemReminderService {
  private fetchGeneration = 0;
  private refreshInFlight: Promise<PrayerItemReminder[]> | null = null;
  private refreshInFlightEmail: string | null = null;

  constructor(
    private supabase: SupabaseService,
    private userSession: UserSessionService
  ) {}

  async ensureLoaded(forceRefresh = false): Promise<PrayerItemReminder[]> {
    const session = this.userSession.getCurrentSession();
    if (!session?.email?.trim()) {
      return [];
    }
    const email = session.email.trim();
    const cached = session.prayerItemReminders;
    const fetchedAt = session.prayerItemRemindersFetchedAt ?? 0;
    const age = Date.now() - fetchedAt;

    if (!forceRefresh && cached !== undefined && age < STALE_MS) {
      return cached;
    }
    if (!forceRefresh && cached !== undefined && age >= STALE_MS) {
      return this.refreshInFlightFor(email);
    }
    if (!forceRefresh && cached === undefined) {
      return this.refreshInFlightFor(email);
    }
    return this.fetchAndUpdateSession(email);
  }

  private refreshInFlightFor(email: string): Promise<PrayerItemReminder[]> {
    if (this.refreshInFlight && this.refreshInFlightEmail === email) {
      return this.refreshInFlight;
    }
    this.refreshInFlightEmail = email;
    this.refreshInFlight = this.fetchAndUpdateSession(email).finally(() => {
      this.refreshInFlight = null;
      this.refreshInFlightEmail = null;
    });
    return this.refreshInFlight;
  }

  remindersForPrayer(
    all: PrayerItemReminder[],
    prayerId: string,
    prayerKind: PrayerItemReminderKind
  ): PrayerItemReminder[] {
    return all.filter(
      (r) => r.prayer_id === prayerId && r.prayer_kind === prayerKind
    );
  }

  /**
   * Drop session-cached reminders for a prayer after delete/archive/answered.
   * DB rows are purged by triggers; this keeps the bell UI in sync without a refetch.
   */
  dropRemindersForPrayer(
    prayerId: string,
    prayerKind: PrayerItemReminderKind
  ): void {
    const session = this.userSession.getCurrentSession();
    const cached = session?.prayerItemReminders;
    if (!cached?.length) {
      return;
    }
    const next = cached.filter(
      (r) => !(r.prayer_id === prayerId && r.prayer_kind === prayerKind)
    );
    if (next.length === cached.length) {
      return;
    }
    this.fetchGeneration++;
    void this.userSession.updateUserSession({ prayerItemReminders: next });
  }

  private async fetchAndUpdateSession(email: string): Promise<PrayerItemReminder[]> {
    const generation = ++this.fetchGeneration;
    const { data, error } = await this.supabase.client
      .from('user_prayer_item_reminders')
      .select(SELECT_COLS)
      .eq('user_email', email)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }
    const rows = ((data ?? []) as PrayerItemReminder[]).map((r) => ({
      ...r,
      local_minute: r.local_minute ?? 0,
    }));
    if (generation !== this.fetchGeneration || !this.sessionStillMatches(email)) {
      const session = this.userSession.getCurrentSession();
      return session?.prayerItemReminders ?? [];
    }
    await this.userSession.updateUserSession({
      prayerItemReminders: rows,
      prayerItemRemindersFetchedAt: Date.now(),
    });
    return rows;
  }

  private sessionStillMatches(email: string): boolean {
    const current = this.userSession.getCurrentSession()?.email?.trim();
    return !!current && current === email.trim();
  }

  async addReminder(
    email: string,
    input: CreatePrayerItemReminderInput
  ): Promise<PrayerItemReminder[]> {
    this.fetchGeneration++;
    const session = this.userSession.getCurrentSession();
    const cached = session?.prayerItemReminders;
    if (
      cached?.some((r) => prayerItemReminderSchedulesMatch(r, input))
    ) {
      throw Object.assign(new Error('Duplicate reminder schedule'), {
        code: '23505',
      });
    }
    const row = {
      user_email: email.trim(),
      prayer_kind: input.prayer_kind,
      prayer_id: input.prayer_id,
      title_snapshot: input.title_snapshot,
      prayer_for_snapshot: input.prayer_for_snapshot,
      mode: input.mode,
      iana_timezone: input.iana_timezone,
      local_hour: input.local_hour,
      local_minute: input.local_minute,
      local_date: input.mode === 'once' ? input.local_date ?? null : null,
      local_weekday: input.mode === 'weekly' ? input.local_weekday ?? null : null,
    };
    const { error } = await this.supabase.client
      .from('user_prayer_item_reminders')
      .insert(row);
    if (error) {
      if (error.code === '23505') {
        throw Object.assign(new Error('Duplicate reminder schedule'), {
          code: '23505',
        });
      }
      throw error;
    }
    return this.fetchAndUpdateSession(email.trim());
  }

  async removeReminder(email: string, id: string): Promise<PrayerItemReminder[]> {
    this.fetchGeneration++;
    const { error } = await this.supabase.client
      .from('user_prayer_item_reminders')
      .delete()
      .eq('id', id)
      .eq('user_email', email.trim());
    if (error) {
      throw error;
    }
    return this.fetchAndUpdateSession(email.trim());
  }
}
