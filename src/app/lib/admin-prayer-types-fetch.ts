import type { SupabaseService } from '../services/supabase.service';
import type { PrayerTypeRecord } from '../types/prayer';

export async function fetchPrayerTypesList(
  supabase: SupabaseService,
): Promise<PrayerTypeRecord[]> {
  const { data, error } = await supabase.directQuery<PrayerTypeRecord>(
    'prayer_types',
    {
      select: '*',
      order: { column: 'display_order', ascending: true },
      timeout: 15000,
    },
  );

  if (error) throw error;
  return Array.isArray(data) ? data : data ? [data] : [];
}
