import type { SelectablePresentationContentType } from '../types/presentation';
import {
  parsePresentationHomeHandoffFromQueryParams,
} from '../types/presentation';
import type { PrayerGroupsFeatureSession } from './prayer-groups-feature';
import { isPrayerGroupsFeatureEnabled } from './prayer-groups-feature';

const GROUP_ONLY_PRESENTATION_TYPES: readonly SelectablePresentationContentType[] =
  ['groups', 'personal'];

export type HomeFilterRedirect = {
  commands: ['/'];
  queryParams: { filter: 'groups' | 'personal' };
};

export function groupOnlyHomeRedirect(
  session: PrayerGroupsFeatureSession
): HomeFilterRedirect {
  return {
    commands: ['/'],
    queryParams: {
      filter: isPrayerGroupsFeatureEnabled(session) ? 'groups' : 'personal',
    },
  };
}

export type PresentationAccessResult =
  | { kind: 'allow'; contentTypes: SelectablePresentationContentType[] }
  | { kind: 'redirect'; redirect: HomeFilterRedirect };

export function permittedPresentationTypesForSession(
  session: PrayerGroupsFeatureSession,
  requested: SelectablePresentationContentType[] | null
): PresentationAccessResult {
  if (session.isChurchMember !== false) {
    return {
      kind: 'allow',
      contentTypes: requested && requested.length > 0 ? requested : ['prayers'],
    };
  }
  const allowed = (requested ?? []).filter((type) =>
    GROUP_ONLY_PRESENTATION_TYPES.includes(type)
  );
  if (allowed.length === 0) {
    return { kind: 'redirect', redirect: groupOnlyHomeRedirect(session) };
  }
  return { kind: 'allow', contentTypes: allowed };
}

export function presentationTypesFromQuery(
  getter: (key: string) => string | null | undefined
): SelectablePresentationContentType[] | null {
  return parsePresentationHomeHandoffFromQueryParams(getter)?.contentTypes ?? null;
}

/** Mid-session downgrade: leave /admin and church presentation. Stay on mixed-use Pray. */
export function groupOnlyChurchSurfaceRedirect(input: {
  path: string;
  session: PrayerGroupsFeatureSession;
  query: (key: string) => string | null | undefined;
}): HomeFilterRedirect | null {
  if (input.session.isChurchMember !== false) {
    return null;
  }
  const path = (input.path.split(/[?#]/)[0] ?? '').replace(/\/+$/, '') || '/';
  if (path === '/' || path === '') {
    return null;
  }
  if (path.startsWith('/admin')) {
    return groupOnlyHomeRedirect(input.session);
  }
  if (!path.startsWith('/presentation')) {
    return null;
  }
  const access = permittedPresentationTypesForSession(
    input.session,
    presentationTypesFromQuery(input.query)
  );
  return access.kind === 'redirect' ? access.redirect : null;
}
