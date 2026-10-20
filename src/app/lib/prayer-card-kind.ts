import type { PrayerContentKind } from './prayer-types';

/** Minimal prayer identity for card-type helpers (home, presentation, print). */
export interface PrayerCardIdentity {
  id: string;
  user_email?: string | null;
  content_kind?: PrayerContentKind | null;
  group_name?: string | null;
}

export function isVerseMemorizationPrayer(
  prayer: PrayerCardIdentity | null | undefined
): boolean {
  return prayer?.content_kind === 'verse_memorization';
}

export function isMemberPrayerId(prayerId: string | null | undefined): boolean {
  return !!prayerId?.startsWith('pc-member-');
}

export function isPersonalPrayerCard(
  prayer: PrayerCardIdentity,
  isPersonalFlag = false
): boolean {
  return isPersonalFlag || !!prayer.user_email;
}

export function isCommunityPrayerCard(
  prayer: PrayerCardIdentity,
  isPersonal = false
): boolean {
  return !isPersonal && !isMemberPrayerId(prayer.id);
}

export type PrayerCardMutationKind = 'member' | 'group' | 'personal' | 'community';

export function isGroupPrayerCard(
  prayer: PrayerCardIdentity | null | undefined
): boolean {
  return !!prayer?.group_name?.trim();
}

export function memberPersonIdFromPrayerId(prayerId: string): string {
  return isMemberPrayerId(prayerId)
    ? prayerId.slice('pc-member-'.length)
    : prayerId;
}

export function getPrayerCardMutationKind(
  prayer: PrayerCardIdentity,
  isPersonalFlag = false
): PrayerCardMutationKind {
  if (isMemberPrayerId(prayer.id)) {
    return 'member';
  }
  if (isGroupPrayerCard(prayer)) {
    return 'group';
  }
  if (isPersonalPrayerCard(prayer, isPersonalFlag)) {
    return 'personal';
  }
  return 'community';
}
