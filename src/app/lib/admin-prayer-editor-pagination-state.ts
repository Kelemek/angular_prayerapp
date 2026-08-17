import { prayerEditorPaginationRange, prayerEditorTotalPages } from './admin-prayer-editor-search';
import type { PrayerEditorPrayer } from './admin-prayer-editor-types';

export function prayerEditorClampPage(
  page: number,
  totalItems: number,
  pageSize: number,
): number {
  return Math.max(
    1,
    Math.min(page, prayerEditorTotalPages(totalItems, pageSize)),
  );
}

export function prayerEditorPageView(
  totalItems: number,
  pageSize: number,
  currentPage: number,
): {
  totalPages: number;
  isFirstPage: boolean;
  isLastPage: boolean;
  paginationRange: number[];
} {
  const totalPages = prayerEditorTotalPages(totalItems, pageSize);
  return {
    totalPages,
    isFirstPage: currentPage === 1,
    isLastPage: currentPage >= totalPages,
    paginationRange: prayerEditorPaginationRange(currentPage, totalPages),
  };
}

export function prayerEditorSearchResultsState(
  prayers: PrayerEditorPrayer[],
): {
  allPrayers: PrayerEditorPrayer[];
  totalItems: number;
  currentPage: number;
} {
  return {
    allPrayers: prayers,
    totalItems: prayers.length,
    currentPage: 1,
  };
}
