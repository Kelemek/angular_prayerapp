export type PrayerGroupRole = 'owner' | 'member';

export type PrayerGroupInvitePayload = {
  createdSubscriber: boolean;
  alreadyOwner: boolean;
  wasMember: boolean;
};

export type PrayerGroupOwnerNotice = {
  tone: 'success' | 'info';
  text: string;
};

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

export function readPrayerGroupInvitePayload(data: unknown): PrayerGroupInvitePayload {
  const row = data !== null && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  return {
    createdSubscriber: row['created_subscriber'] === true,
    alreadyOwner: row['already_owner'] === true,
    wasMember: row['was_member'] === true,
  };
}

/** Copy for the add-owner-by-email result. emailSent is false when the welcome email failed. */
export function prayerGroupOwnerInviteNotice(
  email: string,
  result: PrayerGroupInvitePayload,
  emailSent: boolean,
): PrayerGroupOwnerNotice {
  if (result.alreadyOwner) {
    return { tone: 'info', text: `${email} is already an owner.` };
  }
  if (result.createdSubscriber) {
    return {
      tone: emailSent ? 'success' : 'info',
      text: emailSent
        ? `No account for ${email} yet. An invite was sent. They will be an owner when they sign up.`
        : `No account for ${email} yet. They will be an owner when they sign up.`,
    };
  }
  return { tone: 'success', text: `${email} is now an owner.` };
}
