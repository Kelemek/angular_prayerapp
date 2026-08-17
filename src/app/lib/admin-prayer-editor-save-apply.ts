import type { SupabaseClient } from '@supabase/supabase-js';
import {
  EMPTY_PRAYER_EDITOR_NEW_UPDATE,
  type PrayerEditorEditForm,
  type PrayerEditorEditUpdateForm,
  type PrayerEditorNewUpdate,
  type PrayerEditorPrayer,
} from './admin-prayer-editor-types';
import {
  mutatePrayerEditorDeleteUpdate,
  mutatePrayerEditorEditUpdateSave,
  mutatePrayerEditorInsertUpdate,
  mutatePrayerEditorPrayerSave,
} from './admin-prayer-editor-mutations';

export interface PrayerEditorPrayerSaveApplyResult {
  searchResults: PrayerEditorPrayer[];
  allPrayers: PrayerEditorPrayer[];
  toastSuccess: string;
  needsLoadPageData: boolean;
  refreshMainSite: boolean;
  notifyPrayer: { prayerId: string; title: string };
}

export interface PrayerEditorNewUpdateApplyResult {
  allPrayers: PrayerEditorPrayer[];
  toastSuccess: string;
  needsLoadPageData: boolean;
  refreshMainSite: boolean;
  clearAddUpdate: {
    newUpdate: PrayerEditorNewUpdate;
    addingUpdate: null;
  };
  notifyUpdate: {
    prayerId: string;
    updateId: string;
    title: string;
  };
}

export interface PrayerEditorEditUpdateApplyResult {
  allPrayers: PrayerEditorPrayer[];
  toastSuccess: string;
  needsLoadPageData: boolean;
  refreshMainSite: boolean;
  notifyUpdate: {
    prayerId: string;
    updateId: string;
    title: string;
  };
}

export interface PrayerEditorDeleteUpdateApplyResult {
  allPrayers: PrayerEditorPrayer[];
  toastSuccess: string;
  needsLoadPageData: boolean;
  refreshMainSite: boolean;
}

export async function applyPrayerEditorPrayerSave(
  client: SupabaseClient,
  searchResults: PrayerEditorPrayer[],
  allPrayers: PrayerEditorPrayer[],
  prayerId: string,
  editForm: PrayerEditorEditForm,
): Promise<PrayerEditorPrayerSaveApplyResult> {
  const result = await mutatePrayerEditorPrayerSave(
    client,
    searchResults,
    allPrayers,
    prayerId,
    editForm,
  );

  return {
    searchResults: result.searchResults,
    allPrayers: result.allPrayers,
    toastSuccess: 'Prayer updated successfully',
    needsLoadPageData: true,
    refreshMainSite: true,
    notifyPrayer: { prayerId, title: editForm.title },
  };
}

export async function applyPrayerEditorNewUpdateSave(
  client: SupabaseClient,
  allPrayers: PrayerEditorPrayer[],
  prayerId: string,
  newUpdate: PrayerEditorNewUpdate,
): Promise<PrayerEditorNewUpdateApplyResult> {
  const result = await mutatePrayerEditorInsertUpdate(
    client,
    allPrayers,
    prayerId,
    newUpdate,
  );

  return {
    allPrayers: result.allPrayers,
    toastSuccess: 'Update added successfully',
    needsLoadPageData: true,
    refreshMainSite: true,
    clearAddUpdate: {
      newUpdate: { ...EMPTY_PRAYER_EDITOR_NEW_UPDATE },
      addingUpdate: null,
    },
    notifyUpdate: {
      prayerId,
      updateId: result.inserted.id,
      title: result.prayerTitle,
    },
  };
}

export async function applyPrayerEditorEditUpdateSave(
  client: SupabaseClient,
  allPrayers: PrayerEditorPrayer[],
  prayerId: string,
  updateId: string,
  editUpdateForm: PrayerEditorEditUpdateForm,
): Promise<PrayerEditorEditUpdateApplyResult> {
  const result = await mutatePrayerEditorEditUpdateSave(
    client,
    allPrayers,
    prayerId,
    updateId,
    editUpdateForm,
  );

  return {
    allPrayers: result.allPrayers,
    toastSuccess: 'Update saved successfully',
    needsLoadPageData: true,
    refreshMainSite: true,
    notifyUpdate: {
      prayerId,
      updateId,
      title: result.prayerTitle,
    },
  };
}

export async function applyPrayerEditorDeleteUpdate(
  client: SupabaseClient,
  allPrayers: PrayerEditorPrayer[],
  prayerId: string,
  updateId: string,
): Promise<PrayerEditorDeleteUpdateApplyResult> {
  const rows = await mutatePrayerEditorDeleteUpdate(
    client,
    allPrayers,
    prayerId,
    updateId,
  );

  return {
    allPrayers: rows,
    toastSuccess: 'Update deleted successfully',
    needsLoadPageData: true,
    refreshMainSite: true,
  };
}
