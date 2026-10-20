import { isPublicAreaFilter } from './home-community-filter';
import type { HomeActiveFilter } from '../services/home-deep-link-host.adapter';

export interface PrayerGroupsFeatureSession {
  prayerGroupsEnabled?: boolean;
  isChurchMember?: boolean;
  defaultPrayerView?: 'current' | 'personal' | 'groups';
}

export function isPrayerGroupsFeatureEnabled(
  session: PrayerGroupsFeatureSession | null | undefined,
): boolean {
  return session?.prayerGroupsEnabled === true;
}

export function sanitizeHomeAreaFilter(
  filter: HomeActiveFilter,
  session: PrayerGroupsFeatureSession,
): HomeActiveFilter {
  if (filter === 'groups' && !isPrayerGroupsFeatureEnabled(session)) {
    return session.isChurchMember !== false ? 'current' : 'personal';
  }
  return filter;
}

/** Pick the Home tab after session load, deep links, or default view preference. */
export function resolveHomeFilterFromSession(
  requested: HomeActiveFilter | null | undefined,
  session: PrayerGroupsFeatureSession,
): HomeActiveFilter {
  let next = (requested ??
    session.defaultPrayerView ??
    'current') as HomeActiveFilter;
  if (session.isChurchMember === false && isPublicAreaFilter(next)) {
    next = isPrayerGroupsFeatureEnabled(session) ? 'groups' : 'personal';
  }
  return sanitizeHomeAreaFilter(next, session);
}
