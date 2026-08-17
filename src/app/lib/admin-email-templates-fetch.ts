import type { SupabaseClient } from '@supabase/supabase-js';
import type { EmailTemplateRow } from './admin-email-templates';

export async function fetchEmailTemplates(
  client: SupabaseClient,
): Promise<EmailTemplateRow[]> {
  const { data, error } = await client
    .from('email_templates')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return (data as EmailTemplateRow[]) || [];
}
