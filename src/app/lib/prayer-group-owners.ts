export type PrayerGroupRole = 'owner' | 'member';

/** Owners grant ownership. Members do not. Site admins are not owners unless they hold the role. */
export function canGrantGroupOwnership(viewerRole: PrayerGroupRole): boolean {
  return viewerRole === 'owner';
}

export function activeOwnerCount(roles: readonly PrayerGroupRole[]): number {
  return roles.filter((role) => role === 'owner').length;
}

/** The last owner leaves only through transfer. A co-owner may leave. */
export function mustTransferBeforeLeaving(
  viewerRole: PrayerGroupRole,
  owners: number,
): boolean {
  return viewerRole === 'owner' && owners <= 1;
}

/** Another owner can be demoted or removed only when one owner would remain. */
export function canChangeOtherOwner(input: {
  viewerRole: PrayerGroupRole;
  viewerEmail: string;
  memberEmail: string;
  memberRole: PrayerGroupRole;
  owners: number;
}): boolean {
  if (!canGrantGroupOwnership(input.viewerRole)) return false;
  if (input.memberRole !== 'owner') return false;
  if (normalizeGroupEmail(input.viewerEmail) === normalizeGroupEmail(input.memberEmail)) {
    return false;
  }
  return input.owners > 1;
}

export function normalizeGroupEmail(email: string): string {
  return email.trim().toLowerCase();
}
