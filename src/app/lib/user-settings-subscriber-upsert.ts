import type { SupabaseClient } from '@supabase/supabase-js';

export async function fetchEmailSubscriberId(
  client: SupabaseClient,
  email: string,
): Promise<{ id: string } | null> {
  const { data, error } = await client
    .from('email_subscribers')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (error) {
    throw error;
  }
  return data;
}

/** Upsert a subscriber row keyed by email (update by id when present). */
export async function upsertEmailSubscriberByEmail(
  client: SupabaseClient,
  email: string,
  update: Record<string, unknown>,
  insert: Record<string, unknown>,
): Promise<void> {
  const existing = await fetchEmailSubscriberId(client, email);
  if (existing) {
    const { error } = await client
      .from('email_subscribers')
      .update(update)
      .eq('id', existing.id);
    if (error) {
      throw error;
    }
    return;
  }
  const { error } = await client.from('email_subscribers').insert({
    email,
    ...insert,
  });
  if (error) {
    throw error;
  }
}
