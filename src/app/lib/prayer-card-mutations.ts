import type { PrayerUpdate } from '../services/prayer.service';
import type { PrayerCardAddUpdateEvent } from '../services/prayer-card-actions.facade';
import type { PrayerAddUpdatePayload } from '../components/prayer-add-update-modal/prayer-add-update-modal.component';
import type { PrayerUpdateActionsMode } from '../components/prayer-update-actions/prayer-update-actions.component';
import type { PersonalPrayerAnsweredStatusMode } from '../components/personal-prayer-answered-status-modal/personal-prayer-answered-status-modal.component';
import type { PrayerUpdateRecord } from './prayer-update-header';
import {
  getPrayerCardUserEmail,
  getPrayerCardUserNameFromStorage,
} from './prayer-card-user-context';
import type { UserSessionService } from '../services/user-session.service';

export function buildPrayerCardAddUpdateEvent(
  prayerId: string,
  payload: PrayerAddUpdatePayload,
  userSessionService: UserSessionService
): PrayerCardAddUpdateEvent {
  const userEmail = getPrayerCardUserEmail(userSessionService);
  const userSession = userSessionService.getCurrentSession();
  const authorName =
    userSession?.fullName || getPrayerCardUserNameFromStorage();

  return {
    prayer_id: prayerId,
    content: payload.content,
    author: authorName,
    author_email: userEmail,
    is_anonymous: payload.is_anonymous,
    mark_as_answered: payload.mark_as_answered,
  };
}

export function prayerUpdateFromRecord(
  update: PrayerUpdateRecord,
  prayerId: string
): PrayerUpdate {
  return {
    id: update.id,
    prayer_id: prayerId,
    content: update.content,
    author: update.author ?? '',
    created_at: update.created_at,
    updated_at: update.updated_at,
    is_answered: update.is_answered,
    is_anonymous: update.is_anonymous,
  };
}

export function prayerCardUpdateActionsMode(
  isPersonal: boolean,
  isMember: boolean
): PrayerUpdateActionsMode {
  if (isPersonal) {
    return 'personal';
  }
  if (isMember) {
    return 'member';
  }
  return 'readonly';
}

export function personalAnsweredStatusModalMode(
  category: string | null | undefined
): PersonalPrayerAnsweredStatusMode {
  return category === 'Answered' ? 'unmark' : 'mark';
}
