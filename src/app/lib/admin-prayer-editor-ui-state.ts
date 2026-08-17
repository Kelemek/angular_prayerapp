import {
  EMPTY_PRAYER_EDITOR_EDIT_FORM,
  EMPTY_PRAYER_EDITOR_EDIT_UPDATE_FORM,
  EMPTY_PRAYER_EDITOR_NEW_UPDATE,
  type PrayerEditorEditForm,
  type PrayerEditorEditUpdateForm,
  type PrayerEditorNewUpdate,
  type PrayerEditorPrayer,
  type PrayerEditorUpdate,
} from './admin-prayer-editor-types';
import { buildPrayerEditorEditFormFromPrayer, emptyPrayerEditorEditForm } from './admin-prayer-editor-tour';

export function prayerEditorToggleSetMember(
  set: Set<string>,
  id: string,
): Set<string> {
  const next = new Set(set);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}

export function prayerEditorToggleSelectAll(
  displayPrayers: PrayerEditorPrayer[],
  selectedPrayers: Set<string>,
): Set<string> {
  if (selectedPrayers.size === displayPrayers.length) {
    return new Set();
  }
  return new Set(displayPrayers.map((p) => p.id));
}

export function prayerEditorAllDisplaySelected(
  displayPrayers: PrayerEditorPrayer[],
  selectedPrayers: Set<string>,
): boolean {
  return (
    selectedPrayers.size === displayPrayers.length && displayPrayers.length > 0
  );
}

export function prayerEditorPrependPrayer(
  lists: PrayerEditorPrayer[],
  prayer: PrayerEditorPrayer,
): PrayerEditorPrayer[] {
  return [prayer, ...lists];
}

export function prayerEditorClearListState(): {
  allPrayers: PrayerEditorPrayer[];
  displayPrayers: PrayerEditorPrayer[];
  selectedPrayers: Set<string>;
  currentPage: number;
  totalItems: number;
} {
  return {
    allPrayers: [],
    displayPrayers: [],
    selectedPrayers: new Set(),
    currentPage: 1,
    totalItems: 0,
  };
}

export function prayerEditorStartEditState(
  prayer: PrayerEditorPrayer,
  expandedCards: Set<string>,
): {
  editForm: PrayerEditorEditForm;
  editingPrayer: string;
  expandedCards: Set<string>;
} {
  return {
    editForm: buildPrayerEditorEditFormFromPrayer(prayer),
    editingPrayer: prayer.id,
    expandedCards: new Set([...expandedCards, prayer.id]),
  };
}

export function prayerEditorCancelEditState(): {
  editingPrayer: null;
  editForm: PrayerEditorEditForm;
} {
  return {
    editingPrayer: null,
    editForm: emptyPrayerEditorEditForm(),
  };
}

export function prayerEditorStartAddUpdateState(prayerId: string): {
  addingUpdate: string;
  newUpdate: PrayerEditorNewUpdate;
} {
  return {
    addingUpdate: prayerId,
    newUpdate: { ...EMPTY_PRAYER_EDITOR_NEW_UPDATE },
  };
}

export function prayerEditorCancelAddUpdateState(): {
  addingUpdate: null;
  newUpdate: PrayerEditorNewUpdate;
} {
  return {
    addingUpdate: null,
    newUpdate: { ...EMPTY_PRAYER_EDITOR_NEW_UPDATE },
  };
}

export function prayerEditorStartEditUpdateState(
  prayerId: string,
  update: PrayerEditorUpdate,
): {
  editingUpdateId: string;
  editingUpdatePrayerId: string;
  editUpdateForm: PrayerEditorEditUpdateForm;
} {
  return {
    editingUpdateId: update.id,
    editingUpdatePrayerId: prayerId,
    editUpdateForm: {
      content: update.content,
      author: update.author,
      author_email: update.author_email || '',
    },
  };
}

export function prayerEditorCancelEditUpdateState(): {
  editingUpdateId: null;
  editingUpdatePrayerId: null;
  editUpdateForm: PrayerEditorEditUpdateForm;
} {
  return {
    editingUpdateId: null,
    editingUpdatePrayerId: null,
    editUpdateForm: { ...EMPTY_PRAYER_EDITOR_EDIT_UPDATE_FORM },
  };
}

export function prayerEditorResetTransientEditorState(): {
  editingPrayer: null;
  editForm: PrayerEditorEditForm;
  addingUpdate: null;
  newUpdate: PrayerEditorNewUpdate;
  editingUpdateId: null;
  editingUpdatePrayerId: null;
  editUpdateForm: PrayerEditorEditUpdateForm;
} {
  return {
    editingPrayer: null,
    editForm: { ...EMPTY_PRAYER_EDITOR_EDIT_FORM },
    addingUpdate: null,
    newUpdate: { ...EMPTY_PRAYER_EDITOR_NEW_UPDATE },
    editingUpdateId: null,
    editingUpdatePrayerId: null,
    editUpdateForm: { ...EMPTY_PRAYER_EDITOR_EDIT_UPDATE_FORM },
  };
}

export function prayerEditorShowNoSearchResultsEmpty(
  searching: boolean,
  allPrayersLength: number,
  searchTerm: string,
  statusFilter: string,
  approvalFilter: string,
): boolean {
  return (
    !searching &&
    allPrayersLength === 0 &&
    searchTerm.trim().length > 0 &&
    !statusFilter &&
    !approvalFilter
  );
}

export function prayerEditorShowInitialEmpty(
  searching: boolean,
  allPrayersLength: number,
  searchTerm: string,
  statusFilter: string,
  approvalFilter: string,
): boolean {
  return (
    !searching &&
    allPrayersLength === 0 &&
    !searchTerm.trim() &&
    !statusFilter &&
    !approvalFilter
  );
}
