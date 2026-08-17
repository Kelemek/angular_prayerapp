import type { SupabaseClient } from '@supabase/supabase-js';
import type { PrayerEditorPrayer } from './admin-prayer-editor-types';
import {
  mutatePrayerEditorBulkDelete,
  mutatePrayerEditorBulkStatus,
  mutatePrayerEditorSingleDelete,
} from './admin-prayer-editor-mutations';

export interface PrayerEditorConfirmationListState {
  searchResults: PrayerEditorPrayer[];
  allPrayers: PrayerEditorPrayer[];
  selectedPrayers: Set<string>;
  bulkStatus: string;
  totalItems: number;
  currentPage: number;
}

export interface PrayerEditorConfirmationApplyResult {
  searchResults: PrayerEditorPrayer[];
  allPrayers: PrayerEditorPrayer[];
  selectedPrayers: Set<string>;
  bulkStatus: string;
  totalItems: number;
  currentPage: number;
  toastSuccess: string;
  needsLoadPageData: boolean;
  refreshMainSite: boolean;
}

export async function applyPrayerEditorBulkStatusConfirmation(
  client: SupabaseClient,
  state: PrayerEditorConfirmationListState,
): Promise<PrayerEditorConfirmationApplyResult> {
  const result = await mutatePrayerEditorBulkStatus(
    client,
    state.searchResults,
    state.allPrayers,
    state.selectedPrayers,
    state.bulkStatus,
  );

  return {
    searchResults: result.searchResults,
    allPrayers: result.allPrayers,
    selectedPrayers: result.selectedPrayers,
    bulkStatus: result.bulkStatus,
    totalItems: state.totalItems,
    currentPage: state.currentPage,
    toastSuccess: `${result.prayerCount} prayers updated to ${result.statusLabel}`,
    needsLoadPageData: true,
    refreshMainSite: true,
  };
}

export async function applyPrayerEditorBulkDeleteConfirmation(
  client: SupabaseClient,
  state: PrayerEditorConfirmationListState,
): Promise<PrayerEditorConfirmationApplyResult> {
  const result = await mutatePrayerEditorBulkDelete(
    client,
    state.searchResults,
    state.allPrayers,
    state.selectedPrayers,
  );

  return {
    searchResults: result.searchResults,
    allPrayers: result.allPrayers,
    selectedPrayers: result.selectedPrayers,
    bulkStatus: state.bulkStatus,
    totalItems: result.totalItems,
    currentPage: result.currentPage,
    toastSuccess: `${result.prayerCount} prayers deleted successfully`,
    needsLoadPageData: true,
    refreshMainSite: true,
  };
}

export async function applyPrayerEditorSingleDeleteConfirmation(
  client: SupabaseClient,
  state: PrayerEditorConfirmationListState,
  prayerId: string,
): Promise<PrayerEditorConfirmationApplyResult> {
  const result = await mutatePrayerEditorSingleDelete(
    client,
    state.searchResults,
    state.allPrayers,
    prayerId,
    state.selectedPrayers,
  );

  return {
    searchResults: result.searchResults,
    allPrayers: result.allPrayers,
    selectedPrayers: result.selectedPrayers,
    bulkStatus: state.bulkStatus,
    totalItems: result.totalItems,
    currentPage: state.currentPage,
    toastSuccess: 'Prayer deleted successfully',
    needsLoadPageData: true,
    refreshMainSite: true,
  };
}

export function prayerEditorConfirmationListState(input: {
  searchResults: PrayerEditorPrayer[];
  allPrayers: PrayerEditorPrayer[];
  selectedPrayers: Set<string>;
  bulkStatus: string;
  totalItems: number;
  currentPage: number;
}): PrayerEditorConfirmationListState {
  return {
    searchResults: input.searchResults,
    allPrayers: input.allPrayers,
    selectedPrayers: input.selectedPrayers,
    bulkStatus: input.bulkStatus,
    totalItems: input.totalItems,
    currentPage: input.currentPage,
  };
}

export function applyPrayerEditorConfirmationResult(
  target: PrayerEditorConfirmationListState & {
    searchResults: PrayerEditorPrayer[];
    allPrayers: PrayerEditorPrayer[];
    selectedPrayers: Set<string>;
    bulkStatus: string;
    totalItems: number;
    currentPage: number;
  },
  result: PrayerEditorConfirmationApplyResult,
): void {
  target.searchResults = result.searchResults;
  target.allPrayers = result.allPrayers;
  target.selectedPrayers = result.selectedPrayers;
  target.bulkStatus = result.bulkStatus;
  target.totalItems = result.totalItems;
  target.currentPage = result.currentPage;
}
