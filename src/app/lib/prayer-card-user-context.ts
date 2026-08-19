import type { UserSessionService } from '../services/user-session.service';

export function getPrayerCardUserEmail(
  userSessionService: UserSessionService
): string {
  const session = userSessionService.getCurrentSession();
  return session?.email || '';
}

export function getPrayerCardUserNameFromStorage(): string {
  const firstName = localStorage.getItem('userFirstName') || '';
  const lastName = localStorage.getItem('userLastName') || '';
  return `${firstName} ${lastName}`.trim();
}

export function isCurrentUserPrayerRequester(
  currentUserEmail: string,
  prayerEmail: string | null | undefined
): boolean {
  return currentUserEmail.toLowerCase() === (prayerEmail || '').toLowerCase();
}
