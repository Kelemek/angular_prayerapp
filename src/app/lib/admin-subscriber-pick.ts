import type { SupabaseClient } from '@supabase/supabase-js';

export interface SubscriberPickRow {
  email: string;
  name: string;
}

export const SUBSCRIBER_PICK_MIN_CHARS = 2;
export const SUBSCRIBER_PICK_RESULT_LIMIT = 20;
export const SUBSCRIBER_PICK_DEBOUNCE_MS = 350;
export const SUBSCRIBER_PICK_BLUR_MS = 180;

export function escapeForIlikePattern(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export function splitSubscriberName(name: string): { firstName: string; lastName: string } {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? '',
    lastName: parts.length > 1 ? parts.slice(1).join(' ') : '',
  };
}

export async function fetchSubscriberPickRows(
  client: SupabaseClient,
  trimmed: string,
  limit = SUBSCRIBER_PICK_RESULT_LIMIT,
): Promise<SubscriberPickRow[]> {
  const escaped = escapeForIlikePattern(trimmed);
  const pattern = `%${escaped}%`;

  const { data, error } = await client
    .from('email_subscribers')
    .select('email,name')
    .or(`email.ilike.${pattern},name.ilike.${pattern}`)
    .order('name', { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }
  return (data ?? []) as SubscriberPickRow[];
}
