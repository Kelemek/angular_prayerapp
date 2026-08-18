import type { SupabaseService } from '../services/supabase.service';

export async function deletePrayerPrompt(
  supabase: SupabaseService,
  id: string,
): Promise<void> {
  const { error } = await supabase.client
    .from('prayer_prompts')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
