import type {
  PrayerCardDeletionRequest,
  PrayerCardUpdateDeletionRequest,
} from '../services/prayer-card-actions.facade';
import { getPrayerCardUserEmail, getPrayerCardUserNameFromStorage } from './prayer-card-user-context';
import type { UserSessionService } from '../services/user-session.service';

function requesterFieldsFromStorage(): {
  requester_first_name: string;
  requester_last_name: string;
} {
  const nameParts = getPrayerCardUserNameFromStorage().split(' ');
  return {
    requester_first_name: nameParts[0] || '',
    requester_last_name: nameParts.slice(1).join(' ') || '',
  };
}

export function buildPrayerCardDeletionRequest(
  prayerId: string,
  reason: string,
  userSessionService: UserSessionService
): PrayerCardDeletionRequest {
  return {
    prayer_id: prayerId,
    ...requesterFieldsFromStorage(),
    requester_email: getPrayerCardUserEmail(userSessionService),
    reason,
  };
}

export function buildPrayerCardUpdateDeletionRequest(
  updateId: string,
  reason: string,
  userSessionService: UserSessionService
): PrayerCardUpdateDeletionRequest {
  return {
    update_id: updateId,
    ...requesterFieldsFromStorage(),
    requester_email: getPrayerCardUserEmail(userSessionService),
    reason,
  };
}
