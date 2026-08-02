/** Minimal prayer identity for card-type helpers (home, presentation, print). */
export interface PrayerCardIdentity {
  id: string;
  user_email?: string | null;
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
