import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClientPreferences } from '../types/client-preferences';

/** Update `client_preferences` by email without a prior select. */
export async function persistClientPreferencesByEmail(
  client: SupabaseClient,
  email: string,
  preferences: ClientPreferences
): Promise<void> {
  const normalized = email.toLowerCase().trim();

  const { data: updated, error: updateError } = await client
    .from('email_subscribers')
    .update({ client_preferences: preferences })
    .eq('email', normalized)
    .select('email');

  if (updateError) {
    throw updateError;
  }

  if (updated && updated.length > 0) {
    return;
  }

  const { error: insertError } = await client.from('email_subscribers').insert({
    email: normalized,
    name: '',
    client_preferences: preferences,
  });

  if (!insertError) {
    return;
  }

  const code = (insertError as { code?: string }).code;
  if (code === '23505') {
    return;
  }

  throw insertError;
}
