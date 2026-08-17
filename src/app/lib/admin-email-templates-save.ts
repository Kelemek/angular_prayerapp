import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  EmailTemplateEditableFields,
  EmailTemplateRow,
} from './admin-email-templates';

export async function saveEmailTemplate(
  client: SupabaseClient,
  template: EmailTemplateEditableFields,
): Promise<EmailTemplateRow> {
  const { data, error } = await client
    .from('email_templates')
    .update({
      name: template.name,
      subject: template.subject,
      html_body: template.html_body,
      text_body: template.text_body,
      description: template.description,
    })
    .eq('id', template.id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Template save returned no data');
  }

  return data as EmailTemplateRow;
}
