import type { SupabaseService } from '../services/supabase.service';
import type { PrayerPrompt, PrayerTypeRecord } from '../types/prayer';

export async function fetchActivePrayerTypesForPrompts(
  supabase: SupabaseService,
): Promise<PrayerTypeRecord[]> {
  const { data, error } = await supabase.directQuery<PrayerTypeRecord>(
    'prayer_types',
    {
      select: '*',
      eq: { is_active: true },
      order: { column: 'display_order', ascending: true },
      timeout: 15000,
    },
  );

  if (error) throw error;
  return Array.isArray(data) ? data : data ? [data] : [];
}

export async function searchPrayerPrompts(
  supabase: SupabaseService,
  query: string,
): Promise<PrayerPrompt[]> {
  const { data, error } = await supabase.directQuery<PrayerPrompt>(
    'prayer_prompts',
    {
      select: '*',
      order: { column: 'type', ascending: true },
      limit: 500,
      timeout: 15000,
    },
  );

  if (error) throw error;

  let prompts = Array.isArray(data) ? data : data ? [data] : [];
  const normalized = query.trim().toLowerCase();

  if (normalized) {
    prompts = prompts.filter(
      (p) =>
        p.title.toLowerCase().includes(normalized) ||
        p.type.toLowerCase().includes(normalized) ||
        p.description.toLowerCase().includes(normalized),
    );
  }

  return prompts;
}
