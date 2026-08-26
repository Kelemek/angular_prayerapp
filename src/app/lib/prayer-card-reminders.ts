import type { PrayerItemReminderService } from '../services/prayer-item-reminder.service';
import type { UserSessionService } from '../services/user-session.service';
import {
  resolvePrayerItemKind,
  type PrayerItemReminder,
} from '../types/prayer-item-reminder';

export async function loadPrayerCardItemReminders(
  prayerItemReminderService: PrayerItemReminderService
): Promise<PrayerItemReminder[]> {
  try {
    return await prayerItemReminderService.ensureLoaded();
  } catch (err) {
    console.error('[PrayerCard] Failed to load prayer item reminders:', err);
    try {
      return await prayerItemReminderService.ensureLoaded(true);
    } catch (retryErr) {
      console.error(
        '[PrayerCard] Retry load prayer item reminders failed:',
        retryErr
      );
      return [];
    }
  }
}

/** Session cache first; network load only when reminders are not already on session. */
export async function ensurePrayerCardItemRemindersLoaded(
  userSessionService: UserSessionService,
  prayerItemReminderService: PrayerItemReminderService
): Promise<PrayerItemReminder[]> {
  const sessionRows =
    userSessionService.getCurrentSession()?.prayerItemReminders;
  if (sessionRows !== undefined) {
    return sessionRows;
  }
  return loadPrayerCardItemReminders(prayerItemReminderService);
}

export function remindersForPrayerCard(
  prayerItemReminderService: PrayerItemReminderService,
  userSessionService: UserSessionService,
  allPrayerItemReminders: PrayerItemReminder[],
  prayerId: string,
  isPersonal: boolean,
  isPrompt = false
): PrayerItemReminder[] {
  if (!prayerId) return [];
  const sessionRows =
    userSessionService.getCurrentSession()?.prayerItemReminders;
  const all = sessionRows ?? allPrayerItemReminders;
  const kind = resolvePrayerItemKind({
    prayerId,
    isPersonal,
    isPrompt,
  });
  return prayerItemReminderService.remindersForPrayer(all, prayerId, kind);
}
