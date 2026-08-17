import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  PrayerEditorEditForm,
  PrayerEditorEditUpdateForm,
  PrayerEditorNewUpdate,
  PrayerEditorPrayer,
  PrayerEditorUpdate,
} from './admin-prayer-editor-types';
import {
  commandBulkUpdatePrayerEditorStatus,
  commandDeletePrayerEditorPrayer,
  commandDeletePrayerEditorPrayers,
  commandDeletePrayerEditorUpdate,
  commandInsertPrayerEditorUpdate,
  commandUpdatePrayerEditorPrayer,
  commandUpdatePrayerEditorUpdate,
  prayerEditorBulkStatusLabel,
} from './admin-prayer-editor-commands';
import {
  prayerEditorListsAfterBulkDelete,
  prayerEditorListsAfterBulkStatus,
  prayerEditorListsAfterEditUpdateSave,
  prayerEditorListsAfterNewUpdate,
  prayerEditorListsAfterPrayerSave,
  prayerEditorListsAfterSingleDelete,
  prayerEditorListsAfterUpdateDelete,
} from './admin-prayer-editor-list-patches';

export async function mutatePrayerEditorBulkStatus(
  client: SupabaseClient,
  searchResults: PrayerEditorPrayer[],
  allPrayers: PrayerEditorPrayer[],
  selectedPrayers: Set<string>,
  bulkStatus: string,
): Promise<{
  searchResults: PrayerEditorPrayer[];
  allPrayers: PrayerEditorPrayer[];
  selectedPrayers: Set<string>;
  bulkStatus: string;
  statusLabel: string;
  prayerCount: number;
}> {
  const prayerIds = Array.from(selectedPrayers);
  await commandBulkUpdatePrayerEditorStatus(client, prayerIds, bulkStatus);
  const lists = prayerEditorListsAfterBulkStatus(
    searchResults,
    allPrayers,
    selectedPrayers,
    bulkStatus,
  );
  return {
    ...lists,
    statusLabel: prayerEditorBulkStatusLabel(bulkStatus),
    prayerCount: prayerIds.length,
  };
}

export async function mutatePrayerEditorBulkDelete(
  client: SupabaseClient,
  searchResults: PrayerEditorPrayer[],
  allPrayers: PrayerEditorPrayer[],
  selectedPrayers: Set<string>,
): Promise<{
  searchResults: PrayerEditorPrayer[];
  allPrayers: PrayerEditorPrayer[];
  totalItems: number;
  currentPage: number;
  selectedPrayers: Set<string>;
  prayerCount: number;
}> {
  const prayerIds = Array.from(selectedPrayers);
  await commandDeletePrayerEditorPrayers(client, prayerIds);
  const lists = prayerEditorListsAfterBulkDelete(
    searchResults,
    allPrayers,
    selectedPrayers,
  );
  return { ...lists, prayerCount: prayerIds.length };
}

export async function mutatePrayerEditorSingleDelete(
  client: SupabaseClient,
  searchResults: PrayerEditorPrayer[],
  allPrayers: PrayerEditorPrayer[],
  prayerId: string,
  selectedPrayers: Set<string>,
): Promise<{
  searchResults: PrayerEditorPrayer[];
  allPrayers: PrayerEditorPrayer[];
  totalItems: number;
  selectedPrayers: Set<string>;
}> {
  await commandDeletePrayerEditorPrayer(client, prayerId);
  return prayerEditorListsAfterSingleDelete(
    searchResults,
    allPrayers,
    prayerId,
    selectedPrayers,
  );
}

export async function mutatePrayerEditorPrayerSave(
  client: SupabaseClient,
  searchResults: PrayerEditorPrayer[],
  allPrayers: PrayerEditorPrayer[],
  prayerId: string,
  editForm: PrayerEditorEditForm,
): Promise<{
  searchResults: PrayerEditorPrayer[];
  allPrayers: PrayerEditorPrayer[];
  approvedAt: string;
}> {
  const { approvedAt } = await commandUpdatePrayerEditorPrayer(
    client,
    prayerId,
    editForm,
  );
  const lists = prayerEditorListsAfterPrayerSave(
    searchResults,
    allPrayers,
    prayerId,
    editForm,
    approvedAt,
  );
  return { ...lists, approvedAt };
}

export async function mutatePrayerEditorInsertUpdate(
  client: SupabaseClient,
  allPrayers: PrayerEditorPrayer[],
  prayerId: string,
  newUpdate: PrayerEditorNewUpdate,
): Promise<{
  allPrayers: PrayerEditorPrayer[];
  inserted: PrayerEditorUpdate;
  prayerTitle: string;
}> {
  const inserted = await commandInsertPrayerEditorUpdate(
    client,
    prayerId,
    newUpdate,
  );
  const lists = prayerEditorListsAfterNewUpdate(allPrayers, prayerId, inserted);
  return { ...lists, inserted };
}

export async function mutatePrayerEditorDeleteUpdate(
  client: SupabaseClient,
  allPrayers: PrayerEditorPrayer[],
  prayerId: string,
  updateId: string,
): Promise<PrayerEditorPrayer[]> {
  await commandDeletePrayerEditorUpdate(client, updateId);
  return prayerEditorListsAfterUpdateDelete(allPrayers, prayerId, updateId);
}

export async function mutatePrayerEditorEditUpdateSave(
  client: SupabaseClient,
  allPrayers: PrayerEditorPrayer[],
  prayerId: string,
  updateId: string,
  editUpdateForm: PrayerEditorEditUpdateForm,
): Promise<{
  allPrayers: PrayerEditorPrayer[];
  prayerTitle: string;
  approvedAt: string;
}> {
  const { approvedAt } = await commandUpdatePrayerEditorUpdate(
    client,
    updateId,
    editUpdateForm,
  );
  const lists = prayerEditorListsAfterEditUpdateSave(
    allPrayers,
    prayerId,
    updateId,
    editUpdateForm,
    approvedAt,
  );
  return { ...lists, approvedAt };
}
