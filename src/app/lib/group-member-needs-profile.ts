import { isPrayerGroupsFeatureEnabled } from './prayer-groups-feature';

export interface GroupMemberProfileSession {
  isChurchMember?: boolean;
  fullName?: string;
  email?: string;
}

/** Group-only accounts must set a display name before using the app. */
export function groupMemberNeedsProfile(
  session: GroupMemberProfileSession | null | undefined,
): boolean {
  return (
    isPrayerGroupsFeatureEnabled(session) &&
    session?.isChurchMember === false &&
    !(session.fullName?.trim())
  );
}
