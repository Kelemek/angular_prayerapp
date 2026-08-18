import type { PrayerEditorPrayer } from './admin-prayer-editor-types';
import { runPrayerEditorSearch } from './admin-prayer-editor-search-run';
import { prayerEditorSearchResultsState } from './admin-prayer-editor-pagination-state';

export interface PrayerEditorSearchRunParams {
  supabaseUrl: string;
  supabaseKey: string;
  searchTerm: string;
  statusFilter: string;
  approvalFilter: string;
  resultLimit: number;
}

export interface PrayerEditorSearchRunSuccess {
  ok: true;
  allPrayers: PrayerEditorPrayer[];
  totalItems: number;
  currentPage: number;
}

export interface PrayerEditorSearchRunFailure {
  ok: false;
  error: unknown;
}

export type PrayerEditorSearchRunOutcome =
  | PrayerEditorSearchRunSuccess
  | PrayerEditorSearchRunFailure;

export async function runPrayerEditorSearchWithOutcome(
  params: PrayerEditorSearchRunParams,
): Promise<PrayerEditorSearchRunOutcome> {
  try {
    const results = await runPrayerEditorSearch({
      supabaseUrl: params.supabaseUrl,
      supabaseKey: params.supabaseKey,
      searchTerm: params.searchTerm,
      statusFilter: params.statusFilter,
      approvalFilter: params.approvalFilter,
      resultLimit: params.resultLimit,
    });
    const searchState = prayerEditorSearchResultsState(results);
    return {
      ok: true,
      allPrayers: searchState.allPrayers,
      totalItems: searchState.totalItems,
      currentPage: searchState.currentPage,
    };
  } catch (error) {
    console.error('Error searching prayers:', error);
    return { ok: false, error };
  }
}
