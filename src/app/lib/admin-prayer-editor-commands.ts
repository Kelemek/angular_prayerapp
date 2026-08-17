import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  PrayerEditorEditForm,
  PrayerEditorEditUpdateForm,
  PrayerEditorNewUpdate,
  PrayerEditorPrayer,
  PrayerEditorUpdate,
} from './admin-prayer-editor-types';

export const PRAYER_EDITOR_REQUIRED_FIELDS_ERROR = 'All fields are required';
export const PRAYER_EDITOR_EDIT_REQUIRED_ERROR =
  'Title, description, and requester are required';

export function prayerEditorBulkStatusLabel(status: string): string {
  if (status === 'current') return 'Current';
  if (status === 'answered') return 'Answered';
  if (status === 'archived') return 'Archived';
  return status;
}

export function validatePrayerEditorEditForm(form: PrayerEditorEditForm): string | null {
  if (
    !form.title.trim() ||
    !form.description.trim() ||
    !form.requester.trim()
  ) {
    return PRAYER_EDITOR_EDIT_REQUIRED_ERROR;
  }
  return null;
}

export function isPrayerEditorNewUpdateValid(update: PrayerEditorNewUpdate): boolean {
  return !!(
    update.firstName.trim() &&
    update.lastName.trim() &&
    update.author_email.trim() &&
    update.content.trim()
  );
}

export function isPrayerEditorEditUpdateFormValid(
  form: PrayerEditorEditUpdateForm,
): boolean {
  return !!(
    form.content.trim() &&
    form.author.trim() &&
    form.author_email.trim()
  );
}

export function prayerEditorAuthorFullName(
  firstName: string,
  lastName: string,
): string {
  return `${firstName.trim()} ${lastName.trim()}`;
}

export function prayerEditorUpdateDeletePreview(content: string): string {
  const preview =
    content.substring(0, 50) + (content.length > 50 ? '...' : '');
  return `Are you sure you want to delete this update? "${preview}"\n\nThis action cannot be undone.`;
}

export function patchPrayerEditorPrayerFromEditForm(
  prayer: PrayerEditorPrayer,
  form: PrayerEditorEditForm,
  approvedAt: string,
): PrayerEditorPrayer {
  return {
    ...prayer,
    title: form.title.trim(),
    description: form.description.trim(),
    requester: form.requester.trim(),
    email: form.email.trim() || null,
    prayer_for: form.prayer_for.trim() || undefined,
    status: form.status,
    approved_at: approvedAt,
  };
}

export function mapPrayerEditorPrayerPatched(
  prayers: PrayerEditorPrayer[],
  prayerId: string,
  patch: (prayer: PrayerEditorPrayer) => PrayerEditorPrayer,
): PrayerEditorPrayer[] {
  return prayers.map((p) => (p.id === prayerId ? patch(p) : p));
}

export function mapPrayerEditorPrayersWithStatus(
  prayers: PrayerEditorPrayer[],
  prayerIds: Set<string>,
  status: string,
): PrayerEditorPrayer[] {
  return prayers.map((p) => (prayerIds.has(p.id) ? { ...p, status } : p));
}

export function removePrayerEditorPrayersByIds(
  prayers: PrayerEditorPrayer[],
  prayerIds: Set<string>,
): PrayerEditorPrayer[] {
  return prayers.filter((p) => !prayerIds.has(p.id));
}

export function removePrayerEditorPrayerById(
  prayers: PrayerEditorPrayer[],
  prayerId: string,
): PrayerEditorPrayer[] {
  return prayers.filter((p) => p.id !== prayerId);
}

export function appendPrayerEditorUpdate(
  prayers: PrayerEditorPrayer[],
  prayerId: string,
  update: PrayerEditorUpdate,
): PrayerEditorPrayer[] {
  return prayers.map((p) =>
    p.id === prayerId
      ? { ...p, prayer_updates: [...(p.prayer_updates || []), update] }
      : p,
  );
}

export function patchPrayerEditorUpdateInList(
  prayers: PrayerEditorPrayer[],
  prayerId: string,
  updateId: string,
  patch: Partial<PrayerEditorUpdate>,
): PrayerEditorPrayer[] {
  return prayers.map((p) => {
    if (p.id !== prayerId || !p.prayer_updates) {
      return p;
    }
    return {
      ...p,
      prayer_updates: p.prayer_updates.map((u) =>
        u.id === updateId ? { ...u, ...patch } : u,
      ),
    };
  });
}

export function removePrayerEditorUpdateFromList(
  prayers: PrayerEditorPrayer[],
  prayerId: string,
  updateId: string,
): PrayerEditorPrayer[] {
  return prayers.map((p) => {
    if (p.id !== prayerId || !p.prayer_updates) {
      return p;
    }
    return {
      ...p,
      prayer_updates: p.prayer_updates.filter((u) => u.id !== updateId),
    };
  });
}

export async function commandBulkUpdatePrayerEditorStatus(
  client: SupabaseClient,
  prayerIds: string[],
  status: string,
): Promise<void> {
  const { error } = await client
    .from('prayers')
    .update({ status })
    .in('id', prayerIds);
  if (error) {
    throw new Error(`Failed to update prayer statuses: ${error.message}`);
  }
}

export async function commandDeletePrayerEditorPrayers(
  client: SupabaseClient,
  prayerIds: string[],
): Promise<void> {
  const { error: updatesError } = await client
    .from('prayer_updates')
    .delete()
    .in('prayer_id', prayerIds);
  if (updatesError) {
    throw new Error(`Failed to delete prayer updates: ${updatesError.message}`);
  }

  const { error: prayersError } = await client.from('prayers').delete().in('id', prayerIds);
  if (prayersError) {
    throw new Error(`Failed to delete prayers: ${prayersError.message}`);
  }
}

export async function commandDeletePrayerEditorPrayer(
  client: SupabaseClient,
  prayerId: string,
): Promise<void> {
  const { error: updatesError } = await client
    .from('prayer_updates')
    .delete()
    .eq('prayer_id', prayerId);
  if (updatesError) {
    throw new Error(`Failed to delete prayer updates: ${updatesError.message}`);
  }

  const { error: prayerError } = await client.from('prayers').delete().eq('id', prayerId);
  if (prayerError) {
    throw new Error(`Failed to delete prayer: ${prayerError.message}`);
  }
}

export async function commandUpdatePrayerEditorPrayer(
  client: SupabaseClient,
  prayerId: string,
  form: PrayerEditorEditForm,
): Promise<{ approvedAt: string }> {
  const approvedAt = new Date().toISOString();
  const { error } = await client
    .from('prayers')
    .update({
      title: form.title.trim(),
      description: form.description.trim(),
      requester: form.requester.trim(),
      email: form.email.trim() || null,
      prayer_for: form.prayer_for.trim() || null,
      status: form.status,
      approved_at: approvedAt,
    })
    .eq('id', prayerId);

  if (error) {
    throw new Error(`Failed to update prayer: ${error.message}`);
  }

  return { approvedAt };
}

export async function commandInsertPrayerEditorUpdate(
  client: SupabaseClient,
  prayerId: string,
  update: PrayerEditorNewUpdate,
): Promise<PrayerEditorUpdate> {
  const approvedAt = new Date().toISOString();
  const author = prayerEditorAuthorFullName(update.firstName, update.lastName);

  const { data, error } = await client
    .from('prayer_updates')
    .insert({
      prayer_id: prayerId,
      content: update.content.trim(),
      author,
      author_email: update.author_email.trim(),
      approval_status: 'approved',
      approved_at: approvedAt,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create update: ${error.message}`);
  }

  return data as PrayerEditorUpdate;
}

export async function commandUpdatePrayerEditorUpdate(
  client: SupabaseClient,
  updateId: string,
  form: PrayerEditorEditUpdateForm,
): Promise<{ approvedAt: string }> {
  const approvedAt = new Date().toISOString();
  const { error } = await client
    .from('prayer_updates')
    .update({
      content: form.content.trim(),
      author: form.author.trim(),
      author_email: form.author_email.trim(),
      approved_at: approvedAt,
    })
    .eq('id', updateId);

  if (error) {
    throw new Error(`Failed to update: ${error.message}`);
  }

  return { approvedAt };
}

export async function commandDeletePrayerEditorUpdate(
  client: SupabaseClient,
  updateId: string,
): Promise<void> {
  const { error } = await client.from('prayer_updates').delete().eq('id', updateId);
  if (error) {
    throw new Error(`Failed to delete update: ${error.message}`);
  }
}
