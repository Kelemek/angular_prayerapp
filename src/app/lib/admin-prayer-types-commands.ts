import type { SupabaseClient } from '@supabase/supabase-js';
import type { SupabaseService } from '../services/supabase.service';
import type { PrayerTypeRecord } from '../types/prayer';

export async function deletePrayerType(
  supabase: SupabaseService,
  id: string,
): Promise<void> {
  const { error } = await supabase.client.from('prayer_types').delete().eq('id', id);
  if (error) throw error;
}

export async function togglePrayerTypeBooklet(
  supabase: SupabaseService,
  type: PrayerTypeRecord,
): Promise<void> {
  const { error } = await supabase.client
    .from('prayer_types')
    .update({ include_in_booklet: !type.include_in_booklet })
    .eq('id', type.id);
  if (error) throw error;
}

export async function togglePrayerTypeActive(
  supabase: SupabaseService,
  type: PrayerTypeRecord,
): Promise<void> {
  const { error } = await supabase.client
    .from('prayer_types')
    .update({ is_active: !type.is_active })
    .eq('id', type.id);
  if (error) throw error;
}

export async function reorderPrayerTypes(
  client: SupabaseClient,
  types: PrayerTypeRecord[],
): Promise<void> {
  const results = await Promise.all(
    types.map((type, index) =>
      client
        .from('prayer_types')
        .update({ display_order: index })
        .eq('id', type.id),
    ),
  );

  const errorResult = results.find((result) => result.error);
  if (errorResult?.error) throw errorResult.error;
}
