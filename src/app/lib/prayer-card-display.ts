import { isCommunityPrayerCard, isMemberPrayerId } from './prayer-card-kind';
import type { PrayerCardIdentity } from './prayer-card-kind';
import { isCurrentUserPrayerRequester } from './prayer-card-user-context';

export type PrayerCardActiveFilter =
  | 'current'
  | 'answered'
  | 'archived'
  | 'total'
  | 'prompts'
  | 'personal'
  | 'planning_center_list';

export function displayPrayerCardRequester(
  requester: string,
  isAnonymous: boolean | undefined
): string {
  return isAnonymous ? 'Anonymous' : requester;
}

export function showPrayerCardDescription(
  prayerId: string,
  description: string | null | undefined
): boolean {
  if (isMemberPrayerId(prayerId)) {
    return false;
  }
  return !!description?.trim();
}

export function showPrayerCardPrayedForBadge(
  prayedForCount: number | null | undefined,
  isPersonal: boolean,
  isMember: boolean,
  isAdmin: boolean,
  currentUserEmail: string,
  prayerEmail: string | null | undefined
): boolean {
  const count = prayedForCount ?? 0;
  if (count <= 0) return false;
  if (isPersonal) return true;
  if (isMember) return true;
  if (isAdmin) return true;
  return isCurrentUserPrayerRequester(currentUserEmail, prayerEmail);
}

export function prayedForCountLabelForPrayerCard(
  prayedForCount: number | null | undefined,
  isPersonal: boolean,
  isMember: boolean
): string {
  if (isPersonal || isMember) {
    return (prayedForCount ?? 0) === 1 ? 'Prayer' : 'Prayers';
  }
  return 'Praying';
}

export function showsCommunityPrayerCardUnreadBadges(
  activeFilter: PrayerCardActiveFilter
): boolean {
  return activeFilter === 'current' || activeFilter === 'answered';
}

export function showPrayerCardReminderButton(
  sessionEmail: string,
  prayerId: string | null | undefined,
  isPersonal: boolean,
  prayerCategory: string | null | undefined,
  prayerStatus: string
): boolean {
  if (!sessionEmail || !prayerId) {
    return false;
  }
  if (isPersonal) {
    return prayerCategory !== 'Answered';
  }
  if (isMemberPrayerId(prayerId)) {
    return true;
  }
  return prayerStatus === 'current';
}

export function showPrayerCardStatusPillInHeader(
  prayer: PrayerCardIdentity,
  isPersonal: boolean
): boolean {
  return isCommunityPrayerCard(prayer, isPersonal);
}

export function usesPrayerCardPersonalCooldown(
  isPersonal: boolean,
  prayerId: string
): boolean {
  return isPersonal || isMemberPrayerId(prayerId);
}
