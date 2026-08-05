import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { UserSessionService, type UserSessionData } from './user-session.service';
import type {
  UserHourReminderKind,
  UserHourReminderSlot,
} from '../types/user-hour-reminder';

/** Revalidate cache in background after this many ms (stale-while-revalidate). */
const STALE_MS = 10 * 60 * 1000;

type HourReminderSessionKeys = {
  slotsKey: keyof Pick<
    UserSessionData,
    'prayerHourReminders' | 'memorizationHourReminders'
  >;
  fetchedAtKey: keyof Pick<
    UserSessionData,
    'prayerHourRemindersFetchedAt' | 'memorizationHourRemindersFetchedAt'
  >;
};

const CONFIG: Record<
  UserHourReminderKind,
  HourReminderSessionKeys & { table: string }
> = {
  prayer: {
    table: 'user_prayer_hour_reminders',
    slotsKey: 'prayerHourReminders',
    fetchedAtKey: 'prayerHourRemindersFetchedAt',
  },
  memorization: {
    table: 'user_memorization_hour_reminders',
    slotsKey: 'memorizationHourReminders',
    fetchedAtKey: 'memorizationHourRemindersFetchedAt',
  },
};

@Injectable({
  providedIn: 'root',
})
export class UserHourReminderService {
  /** Bumped on mutations and new fetches so stale in-flight responses are ignored. */
  private fetchGeneration: Record<UserHourReminderKind, number> = {
    prayer: 0,
    memorization: 0,
  };

  constructor(
    private supabase: SupabaseService,
    private userSession: UserSessionService
  ) {}

  /**
   * Return cached slots if fresh; if stale, return cache and refresh in background.
   * If never loaded, fetches from Supabase and updates session cache.
   */
  async ensureLoaded(
    kind: UserHourReminderKind,
    forceRefresh = false
  ): Promise<UserHourReminderSlot[]> {
    const session = this.userSession.getCurrentSession();
    if (!session?.email?.trim()) {
      return [];
    }
    const email = session.email.trim();
    const { slotsKey, fetchedAtKey } = CONFIG[kind];
    const cached = session[slotsKey];
    const fetchedAt = session[fetchedAtKey] ?? 0;
    const age = Date.now() - fetchedAt;

    if (!forceRefresh && cached !== undefined && age < STALE_MS) {
      return cached;
    }
    if (!forceRefresh && cached !== undefined && age >= STALE_MS) {
      void this.fetchAndUpdateSession(kind, email).catch(() => undefined);
      return cached;
    }
    return this.fetchAndUpdateSession(kind, email);
  }

  private async fetchAndUpdateSession(
    kind: UserHourReminderKind,
    email: string
  ): Promise<UserHourReminderSlot[]> {
    const generation = ++this.fetchGeneration[kind];
    const { table, slotsKey, fetchedAtKey } = CONFIG[kind];
    const { data, error } = await this.supabase.client
      .from(table)
      .select('id, iana_timezone, local_hour, local_minute')
      .eq('user_email', email)
      .order('local_hour', { ascending: true })
      .order('local_minute', { ascending: true });

    if (error) {
      throw error;
    }
    const slots = ((data ?? []) as UserHourReminderSlot[]).map((s) => ({
      ...s,
      local_minute: s.local_minute ?? 0,
    }));
    if (
      generation !== this.fetchGeneration[kind] ||
      !this.sessionStillMatches(email)
    ) {
      return slots;
    }
    await this.userSession.updateUserSession({
      [slotsKey]: slots,
      [fetchedAtKey]: Date.now(),
    });
    return slots;
  }

  /** Ignore stale fetches after logout or account switch. */
  private sessionStillMatches(email: string): boolean {
    const current = this.userSession.getCurrentSession()?.email?.trim();
    return !!current && current === email.trim();
  }

  async addSlot(
    kind: UserHourReminderKind,
    email: string,
    ianaTimezone: string,
    localHour: number,
    localMinute = 0
  ): Promise<UserHourReminderSlot[]> {
    this.fetchGeneration[kind]++;
    const { table } = CONFIG[kind];
    const { error } = await this.supabase.client.from(table).insert({
      user_email: email.trim(),
      iana_timezone: ianaTimezone,
      local_hour: localHour,
      local_minute: localMinute,
    });
    if (error) {
      throw error;
    }
    return this.fetchAndUpdateSession(kind, email.trim());
  }

  async removeSlot(
    kind: UserHourReminderKind,
    email: string,
    id: string
  ): Promise<UserHourReminderSlot[]> {
    this.fetchGeneration[kind]++;
    const { table } = CONFIG[kind];
    const { error } = await this.supabase.client
      .from(table)
      .delete()
      .eq('id', id)
      .eq('user_email', email.trim());
    if (error) {
      throw error;
    }
    return this.fetchAndUpdateSession(kind, email.trim());
  }

  /** Session cache keys for modal hydration guards. */
  sessionCacheKeys(kind: UserHourReminderKind): HourReminderSessionKeys {
    const { slotsKey, fetchedAtKey } = CONFIG[kind];
    return { slotsKey, fetchedAtKey };
  }
}