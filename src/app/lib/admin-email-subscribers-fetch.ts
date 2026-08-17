import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  EmailSubscriberRow,
  EmailSubscriberSortColumn,
} from './admin-email-subscribers';
import { escapeEmailSubscriberIlikePattern } from './admin-email-subscribers';

export async function fetchEmailSubscriberList(
  client: SupabaseClient,
  params: {
    searchQuery: string;
    sortBy: EmailSubscriberSortColumn;
    sortDirection: 'asc' | 'desc';
  },
): Promise<{ rows: EmailSubscriberRow[]; count: number }> {
  let query = client
    .from('email_subscribers')
    .select('*', { count: 'exact' })
    .order(params.sortBy, { ascending: params.sortDirection === 'asc' });

  const trimmedQuery = params.searchQuery.trim();
  if (trimmedQuery) {
    const escaped = escapeEmailSubscriberIlikePattern(trimmedQuery);
    const pattern = `%${escaped}%`;
    query = query.or(`email.ilike.${pattern},name.ilike.${pattern}`);
  }

  const { data, error, count } = await query;
  if (error) {
    throw error;
  }

  return {
    rows: (data as EmailSubscriberRow[]) || [],
    count: count || 0,
  };
}

export async function loadEmailSubscriberEmail(
  client: SupabaseClient,
  id: string,
): Promise<string> {
  const { data, error } = await client
    .from('email_subscribers')
    .select('email')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }
  if (!data?.email) {
    throw new Error('Subscriber not found');
  }
  return data.email;
}

export async function loadEmailSubscriberAdminFlag(
  client: SupabaseClient,
  id: string,
): Promise<boolean> {
  const { data, error } = await client
    .from('email_subscribers')
    .select('is_admin')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data?.is_admin === true;
}
