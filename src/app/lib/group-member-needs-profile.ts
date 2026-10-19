export interface GroupMemberProfileSession {
  isChurchMember?: boolean;
  fullName?: string;
}

/** Group-only accounts must set a display name before using the app. */
export function groupMemberNeedsProfile(
  session: GroupMemberProfileSession | null | undefined,
): boolean {
  return session?.isChurchMember === false && !(session.fullName?.trim());
}
