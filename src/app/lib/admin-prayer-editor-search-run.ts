import { fetchPrayerEditorPrayers } from './admin-prayer-editor-search';
import type { PrayerEditorPrayer } from './admin-prayer-editor-types';

export const PRAYER_EDITOR_SEARCH_TIMEOUT_MS = 15000;

export async function runPrayerEditorSearch(params: {
  supabaseUrl: string;
  supabaseKey: string;
  searchTerm: string;
  statusFilter: string;
  approvalFilter: string;
  resultLimit: number;
  timeoutMs?: number;
}): Promise<PrayerEditorPrayer[]> {
  const controller = new AbortController();
  const timeoutMs = params.timeoutMs ?? PRAYER_EDITOR_SEARCH_TIMEOUT_MS;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchPrayerEditorPrayers({
      supabaseUrl: params.supabaseUrl,
      supabaseKey: params.supabaseKey,
      searchTerm: params.searchTerm,
      statusFilter: params.statusFilter,
      approvalFilter: params.approvalFilter,
      resultLimit: params.resultLimit,
      abortSignal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
