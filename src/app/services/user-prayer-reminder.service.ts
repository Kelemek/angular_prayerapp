import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { UserSessionService } from './user-session.service';
import type { UserPrayerHourReminderSlot } from '../types/user-prayer-hour-reminder';

/** Revalidate cache in background after this many ms (stale-while-revalidate). */
const STALE_MS = 10 * 60 * 1000;

@Injectable({
  providedIn: 'root',
})
export class UserPrayerReminderService {
  constructor(
    private supabase: SupabaseService,
    private userSession: UserSessionService
  ) {}

  /**
   * Return cached slots if fresh; if stale, return cache and refresh in background.
   * If never loaded, fetches from Supabase and updates session cache.
   */
  async ensureLoaded(forceRefresh = false): Promise<UserPrayerHourReminderSlot[]> {
    const session = this.userSession.getCurrentSession();
    if (!session?.email?.trim()) {
      return [];
    }
    const email = session.email.trim();
    const cached = session.prayerHourReminders;
    const fetchedAt = session.prayerHourRemindersFetchedAt ?? 0;
    const age = Date.now() - fetchedAt;

    if (!forceRefresh && cached !== undefined && age < STALE_MS) {
      return cached;
    }
    if (!forceRefresh && cached !== undefined && age >= STALE_MS) {
      void this.fetchAndUpdateSession(email).catch(() => undefined);
      return cached;
    }
    return this.fetchAndUpdateSession(email);
  }

  private async fetchAndUpdateSession(email: string): Promise<UserPrayerHourReminderSlot[]> {
    const { data, error } = await this.supabase.client
      .from('user_prayer_hour_reminders')
      .select('id, iana_timezone, local_hour')
      .eq('user_email', email)
      .order('local_hour', { ascending: true });

    if (error) {
      throw error;
    }
    const slots = (data ?? []) as UserPrayerHourReminderSlot[];
    await this.userSession.updateUserSession({
      prayerHourReminders: slots,
      prayerHourRemindersFetchedAt: Date.now(),
    });
    return slots;
  }

  async addSlot(email: string, ianaTimezone: string, localHour: number): Promise<UserPrayerHourReminderSlot[]> {
    const { error } = await this.supabase.client.from('user_prayer_hour_reminders').insert({
      user_email: email.trim(),
      iana_timezone: ianaTimezone,
      local_hour: localHour,
    });
    if (error) {
      throw error;
    }
    return this.fetchAndUpdateSession(email.trim());
  }

  async removeSlot(email: string, id: string): Promise<UserPrayerHourReminderSlot[]> {
    const { error } = await this.supabase.client.from('user_prayer_hour_reminders').delete().eq('id', id);
    if (error) {
      throw error;
    }
    return this.fetchAndUpdateSession(email.trim());
  }
}
