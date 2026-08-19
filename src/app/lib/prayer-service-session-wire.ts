export type UserSessionEmailSnapshot = { email?: string | null } | null | undefined;

export function userSessionEmailDistinctEqual(
  prev: UserSessionEmailSnapshot,
  curr: UserSessionEmailSnapshot
): boolean {
  return prev?.email === curr?.email;
}

export type PersonalPrayerSessionAction = 'load' | 'clear';

export function personalPrayerSessionAction(
  session: UserSessionEmailSnapshot
): PersonalPrayerSessionAction {
  return session?.email ? 'load' : 'clear';
}
