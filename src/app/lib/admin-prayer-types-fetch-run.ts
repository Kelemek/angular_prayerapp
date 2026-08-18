import type { SupabaseService } from '../services/supabase.service';
import type { PrayerTypeRecord } from '../types/prayer';
import { fetchPrayerTypesList } from './admin-prayer-types-fetch';
import { adminErrorMessage } from './admin-error-message';

export interface PrayerTypesFetchRunSuccess {
  ok: true;
  types: PrayerTypeRecord[];
}

export interface PrayerTypesFetchRunFailure {
  ok: false;
  error: string;
}

export type PrayerTypesFetchRunOutcome =
  | PrayerTypesFetchRunSuccess
  | PrayerTypesFetchRunFailure;

export async function runPrayerTypesListFetch(
  supabase: SupabaseService,
): Promise<PrayerTypesFetchRunOutcome> {
  try {
    const types = await fetchPrayerTypesList(supabase);
    return { ok: true, types };
  } catch (err: unknown) {
    console.error('Error fetching prayer types:', err);
    return {
      ok: false,
      error: adminErrorMessage(err),
    };
  }
}
