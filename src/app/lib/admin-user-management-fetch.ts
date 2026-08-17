import type { SupabaseClient } from '@supabase/supabase-js';
import type { AdminUser } from './admin-user-management';

export async function fetchAdminUsers(
  client: SupabaseClient,
): Promise<AdminUser[]> {
  const { data, error } = await client
    .from('email_subscribers')
    .select('email,name,created_at,receive_admin_emails,receive_admin_push')
    .eq('is_admin', true)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}
