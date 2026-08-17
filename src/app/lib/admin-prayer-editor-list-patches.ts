import type {
  PrayerEditorEditForm,
  PrayerEditorEditUpdateForm,
  PrayerEditorPrayer,
  PrayerEditorUpdate,
} from './admin-prayer-editor-types';
import {
  appendPrayerEditorUpdate,
  mapPrayerEditorPrayerPatched,
  mapPrayerEditorPrayersWithStatus,
  patchPrayerEditorPrayerFromEditForm,
  patchPrayerEditorUpdateInList,
  removePrayerEditorPrayerById,
  removePrayerEditorPrayersByIds,
  removePrayerEditorUpdateFromList,
} from './admin-prayer-editor-commands';

export function prayerEditorListsAfterBulkStatus(
  searchResults: PrayerEditorPrayer[],
  allPrayers: PrayerEditorPrayer[],
  selectedPrayers: Set<string>,
  bulkStatus: string,
): {
  searchResults: PrayerEditorPrayer[];
  allPrayers: PrayerEditorPrayer[];
  selectedPrayers: Set<string>;
  bulkStatus: string;
} {
  return {
    searchResults: mapPrayerEditorPrayersWithStatus(
      searchResults,
      selectedPrayers,
      bulkStatus,
    ),
    allPrayers: mapPrayerEditorPrayersWithStatus(
      allPrayers,
      selectedPrayers,
      bulkStatus,
    ),
    selectedPrayers: new Set(),
    bulkStatus: '',
  };
}

export function prayerEditorListsAfterBulkDelete(
  searchResults: PrayerEditorPrayer[],
  allPrayers: PrayerEditorPrayer[],
  selectedPrayers: Set<string>,
): {
  searchResults: PrayerEditorPrayer[];
  allPrayers: PrayerEditorPrayer[];
  totalItems: number;
  currentPage: number;
  selectedPrayers: Set<string>;
} {
  const searchResultsPatched = removePrayerEditorPrayersByIds(
    searchResults,
    selectedPrayers,
  );
  const allPrayersPatched = removePrayerEditorPrayersByIds(
    allPrayers,
    selectedPrayers,
  );
  return {
    searchResults: searchResultsPatched,
    allPrayers: allPrayersPatched,
    totalItems: allPrayersPatched.length,
    currentPage: 1,
    selectedPrayers: new Set(),
  };
}

export function prayerEditorListsAfterSingleDelete(
  searchResults: PrayerEditorPrayer[],
  allPrayers: PrayerEditorPrayer[],
  prayerId: string,
  selectedPrayers: Set<string>,
): {
  searchResults: PrayerEditorPrayer[];
  allPrayers: PrayerEditorPrayer[];
  totalItems: number;
  selectedPrayers: Set<string>;
} {
  const nextSelected = new Set(selectedPrayers);
  nextSelected.delete(prayerId);
  const allPrayersPatched = removePrayerEditorPrayerById(allPrayers, prayerId);
  return {
    searchResults: removePrayerEditorPrayerById(searchResults, prayerId),
    allPrayers: allPrayersPatched,
    totalItems: allPrayersPatched.length,
    selectedPrayers: nextSelected,
  };
}

export function prayerEditorListsAfterPrayerSave(
  searchResults: PrayerEditorPrayer[],
  allPrayers: PrayerEditorPrayer[],
  prayerId: string,
  editForm: PrayerEditorEditForm,
  approvedAt: string,
): {
  searchResults: PrayerEditorPrayer[];
  allPrayers: PrayerEditorPrayer[];
} {
  const patch = (prayer: PrayerEditorPrayer) =>
    patchPrayerEditorPrayerFromEditForm(prayer, editForm, approvedAt);
  return {
    searchResults: mapPrayerEditorPrayerPatched(searchResults, prayerId, patch),
    allPrayers: mapPrayerEditorPrayerPatched(allPrayers, prayerId, patch),
  };
}

export function prayerEditorListsAfterNewUpdate(
  allPrayers: PrayerEditorPrayer[],
  prayerId: string,
  inserted: PrayerEditorUpdate,
): {
  allPrayers: PrayerEditorPrayer[];
  prayerTitle: string;
} {
  const allPrayersPatched = appendPrayerEditorUpdate(allPrayers, prayerId, inserted);
  const prayerTitle =
    allPrayersPatched.find((p) => p.id === prayerId)?.title || 'Prayer';
  return { allPrayers: allPrayersPatched, prayerTitle };
}

export function prayerEditorListsAfterUpdateDelete(
  allPrayers: PrayerEditorPrayer[],
  prayerId: string,
  updateId: string,
): PrayerEditorPrayer[] {
  return removePrayerEditorUpdateFromList(allPrayers, prayerId, updateId);
}

export function prayerEditorListsAfterEditUpdateSave(
  allPrayers: PrayerEditorPrayer[],
  prayerId: string,
  updateId: string,
  form: PrayerEditorEditUpdateForm,
  approvedAt: string,
): {
  allPrayers: PrayerEditorPrayer[];
  prayerTitle: string;
} {
  const allPrayersPatched = patchPrayerEditorUpdateInList(
    allPrayers,
    prayerId,
    updateId,
    {
      content: form.content.trim(),
      author: form.author.trim(),
      author_email: form.author_email.trim(),
      approved_at: approvedAt,
    },
  );
  const prayerTitle =
    allPrayersPatched.find((p) => p.id === prayerId)?.title || 'Prayer';
  return { allPrayers: allPrayersPatched, prayerTitle };
}
