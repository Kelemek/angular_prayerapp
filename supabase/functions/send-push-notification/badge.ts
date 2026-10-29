export type IconBadgeReport = {
  unread: number;
  badgesEnabled: boolean;
  reportedAt: string;
} | null;

/**
 * Absolute icon number for one recipient.
 * Null means the push omits the badge (never reported).
 */
export function computeIconBadge(
  report: IconBadgeReport,
  isAdmin: boolean,
  newSince: number,
  pendingTotal: number,
): number | null {
  if (report === null) {
    return null;
  }
  const unreadPart = report.badgesEnabled ? report.unread + newSince : 0;
  const pendingPart = isAdmin ? pendingTotal : 0;
  return Math.max(0, unreadPart + pendingPart);
}
