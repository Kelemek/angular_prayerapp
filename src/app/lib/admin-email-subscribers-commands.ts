import type { SupabaseClient } from '@supabase/supabase-js';

export async function commandSetEmailSubscriberActive(
  client: SupabaseClient,
  id: string,
  isActive: boolean,
): Promise<void> {
  const { error } = await client
    .from('email_subscribers')
    .update({ is_active: isActive })
    .eq('id', id);
  if (error) {
    throw error;
  }
}

export async function commandSetEmailSubscriberReceivePush(
  client: SupabaseClient,
  id: string,
  receivePush: boolean,
): Promise<void> {
  const { error } = await client
    .from('email_subscribers')
    .update({ receive_push: receivePush })
    .eq('id', id);
  if (error) {
    throw error;
  }
}

export async function commandSetEmailSubscriberBlocked(
  client: SupabaseClient,
  id: string,
  isBlocked: boolean,
): Promise<void> {
  const { error } = await client
    .from('email_subscribers')
    .update({ is_blocked: isBlocked })
    .eq('id', id);
  if (error) {
    throw error;
  }
}

export async function commandUnsubscribeAdminEmailSubscriber(
  client: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await client
    .from('email_subscribers')
    .update({ is_active: false })
    .eq('id', id);
  if (error) {
    throw error;
  }
}

export async function commandDeleteEmailSubscriber(
  client: SupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await client.from('email_subscribers').delete().eq('id', id);
  if (error) {
    throw error;
  }
}
