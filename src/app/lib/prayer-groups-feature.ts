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

/** Distinct key for group catalog loads (email + feature flag). */
export function prayerGroupCatalogSessionGateKey(
  session: (PrayerGroupsFeatureSession & { email?: string }) | null | undefined,
): string | null {
  const email = session?.email?.trim().toLowerCase();
  if (!email) {
    return null;
  }
  return `${email}:${isPrayerGroupsFeatureEnabled(session)}`;
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

export function churchContentVisible(input: {
  sessionInitialized: boolean;
  isChurchMember: boolean | null | undefined;
}): boolean {
  return input.sessionInitialized && input.isChurchMember !== false;
}

export type ChurchPushTarget =
  | { kind: 'church_prayer'; prayerId: string }
  | { kind: 'groups'; prayerId?: string }
  | { kind: 'personal' }
  | { kind: 'prompt'; promptId: string };

export function churchPushTarget(input: {
  event: 'prayer_item_reminder' | 'prayer_reminder';
  prayerKind: string | null;
  prayerId: string | null;
  promptId: string | null;
  session: PrayerGroupsFeatureSession;
}): ChurchPushTarget {
  if (input.prayerKind === 'group') {
    return input.prayerId
      ? { kind: 'groups', prayerId: input.prayerId }
      : { kind: 'groups' };
  }

  const churchContent =
    input.event === 'prayer_reminder' ||
    (input.prayerKind !== 'group' && input.prayerKind !== 'personal');
  if (input.session.isChurchMember === false && churchContent) {
    const home = resolveHomeFilterFromSession('current', input.session);
    return home === 'personal' ? { kind: 'personal' } : { kind: 'groups' };
  }

  if (
    input.prayerKind === 'prompt' &&
    input.promptId &&
    input.session.isChurchMember !== false
  ) {
    return { kind: 'prompt', promptId: input.promptId };
  }

  if (input.prayerKind === 'personal') {
    return { kind: 'personal' };
  }

  if (input.prayerId) {
    return { kind: 'church_prayer', prayerId: input.prayerId };
  }

  return { kind: 'church_prayer', prayerId: '' };
}
