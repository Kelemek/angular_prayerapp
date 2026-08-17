import { escapeForIlikePattern } from './admin-subscriber-pick';
import type { PrayerEditorPrayer } from './admin-prayer-editor-types';

export const PRAYER_EDITOR_MAIN_SEARCH_MIN_CHARS = 2;
export const PRAYER_EDITOR_MAIN_SEARCH_DEBOUNCE_MS = 350;
export const PRAYER_EDITOR_MAIN_SEARCH_RESULT_LIMIT = 100;

export const PRAYER_EDITOR_LIST_SELECT =
  'id,title,requester,email,status,created_at,denial_reason,description,approval_status,prayer_for,prayer_updates(id,content,author,author_email,created_at,denial_reason,approval_status)';

export function applyPrayerEditorListFilters(
  params: URLSearchParams,
  statusFilter: string,
  approvalFilter: string,
): void {
  if (statusFilter && statusFilter !== 'all') {
    params.set('status', `eq.${statusFilter}`);
  }
  if (
    approvalFilter &&
    approvalFilter !== 'all' &&
    approvalFilter !== 'denied' &&
    approvalFilter !== 'pending'
  ) {
    params.set('approval_status', `eq.${approvalFilter}`);
  }
}

export function filterPrayersByApprovalClient(
  prayers: PrayerEditorPrayer[],
  approvalFilter: string,
): PrayerEditorPrayer[] {
  if (approvalFilter === 'denied') {
    return prayers.filter((prayer) => {
      if (prayer.denial_reason) return true;
      if (prayer.prayer_updates && prayer.prayer_updates.length > 0) {
        return prayer.prayer_updates.some(
          (update) =>
            update.denial_reason !== null &&
            update.denial_reason !== undefined &&
            update.denial_reason !== '',
        );
      }
      return false;
    });
  }

  if (approvalFilter === 'pending') {
    return prayers.filter((prayer) => {
      const isPrayerPending =
        prayer.approval_status === 'pending' ||
        prayer.approval_status === null ||
        prayer.approval_status === undefined;
      const hasPendingUpdates =
        prayer.prayer_updates &&
        prayer.prayer_updates.length > 0 &&
        prayer.prayer_updates.some(
          (update) =>
            update.approval_status === 'pending' ||
            update.approval_status === null ||
            update.approval_status === undefined,
        );
      return isPrayerPending || hasPendingUpdates;
    });
  }

  return prayers;
}

/**
 * Sort prayers by most recent activity (creation or update).
 * Matches sorting used on the main site.
 */
export function sortPrayersByLatestActivity(
  prayers: PrayerEditorPrayer[],
): PrayerEditorPrayer[] {
  return prayers
    .map((prayer) => {
      const sortedUpdates =
        prayer.prayer_updates && prayer.prayer_updates.length > 0
          ? [...prayer.prayer_updates].sort(
              (a, b) =>
                new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
            )
          : [];

      return {
        ...prayer,
        prayer_updates: sortedUpdates,
        latestActivity: Math.max(
          new Date(prayer.created_at).getTime(),
          sortedUpdates.length > 0
            ? new Date(sortedUpdates[0].created_at).getTime()
            : 0,
        ),
      };
    })
    .sort((a, b) => b.latestActivity - a.latestActivity)
    .map(({ latestActivity, ...prayer }) => prayer);
}

export function slicePrayerEditorPage(
  allPrayers: PrayerEditorPrayer[],
  currentPage: number,
  pageSize: number,
): PrayerEditorPrayer[] {
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  return allPrayers.slice(startIndex, endIndex);
}

export function prayerEditorTotalPages(totalItems: number, pageSize: number): number {
  return Math.ceil(totalItems / pageSize);
}

export function prayerEditorPaginationRange(
  currentPage: number,
  totalPages: number,
  maxPages = 5,
): number[] {
  let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
  let endPage = Math.min(totalPages, startPage + maxPages - 1);

  if (endPage - startPage + 1 < maxPages) {
    startPage = Math.max(1, endPage - maxPages + 1);
  }

  const pages: number[] = [];
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }
  return pages;
}

export function prayerEditorShowingRange(
  currentPage: number,
  pageSize: number,
  totalItems: number,
): { start: number; end: number } {
  if (totalItems === 0) {
    return { start: 0, end: 0 };
  }
  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);
  return { start, end };
}

interface PrayerEditorFetchConfig {
  supabaseUrl: string;
  supabaseKey: string;
  searchTerm: string;
  statusFilter: string;
  approvalFilter: string;
  resultLimit?: number;
  abortSignal?: AbortSignal;
}

async function restGetJson<T>(
  url: string,
  supabaseKey: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Query failed: ${response.status} ${errorText}`);
  }

  return response.json() as Promise<T>;
}

/** Load prayers for Admin Prayer Editor with optional text search and filters. */
export async function fetchPrayerEditorPrayers(
  config: PrayerEditorFetchConfig,
): Promise<PrayerEditorPrayer[]> {
  const {
    supabaseUrl,
    supabaseKey,
    searchTerm,
    statusFilter,
    approvalFilter,
    resultLimit = PRAYER_EDITOR_MAIN_SEARCH_RESULT_LIMIT,
    abortSignal,
  } = config;

  const trimmedSearch = searchTerm.trim();

  const params = new URLSearchParams();
  params.set('select', PRAYER_EDITOR_LIST_SELECT);
  params.set('order', 'created_at.desc');
  params.set('limit', String(resultLimit));

  if (trimmedSearch) {
    const escaped = escapeForIlikePattern(trimmedSearch);
    const pattern = `%${escaped}%`;
    params.set(
      'or',
      `(requester.ilike.${pattern},email.ilike.${pattern},title.ilike.${pattern},description.ilike.${pattern},denial_reason.ilike.${pattern})`,
    );
  }

  applyPrayerEditorListFilters(params, statusFilter, approvalFilter);

  const url = `${supabaseUrl}/rest/v1/prayers?${params.toString()}`;
  let results: PrayerEditorPrayer[] = await restGetJson(url, supabaseKey, abortSignal);

  if (trimmedSearch) {
    const escaped = escapeForIlikePattern(trimmedSearch);
    const pattern = `%${escaped}%`;

    const idParams = new URLSearchParams();
    idParams.set('select', 'id,prayer_updates!inner(id)');
    idParams.set('prayer_updates.content', `ilike.${pattern}`);
    idParams.set('limit', String(resultLimit));
    applyPrayerEditorListFilters(idParams, statusFilter, approvalFilter);

    const idUrl = `${supabaseUrl}/rest/v1/prayers?${idParams.toString()}`;
    const idRows = await restGetJson<{ id: string }[]>(idUrl, supabaseKey, abortSignal);
    const resultIds = new Set(results.map((p) => p.id));
    const missingIds = [
      ...new Set((idRows || []).map((r) => r.id).filter(Boolean)),
    ].filter((id) => !resultIds.has(id));

    if (missingIds.length > 0) {
      const fullParams = new URLSearchParams();
      fullParams.set('select', PRAYER_EDITOR_LIST_SELECT);
      fullParams.set('id', `in.(${missingIds.join(',')})`);
      applyPrayerEditorListFilters(fullParams, statusFilter, approvalFilter);

      const fullUrl = `${supabaseUrl}/rest/v1/prayers?${fullParams.toString()}`;
      const fullData = await restGetJson<PrayerEditorPrayer[]>(
        fullUrl,
        supabaseKey,
        abortSignal,
      );
      for (const row of fullData || []) {
        results.push(row);
      }
    }
  }

  results = filterPrayersByApprovalClient(results, approvalFilter);
  return sortPrayersByLatestActivity(results);
}
