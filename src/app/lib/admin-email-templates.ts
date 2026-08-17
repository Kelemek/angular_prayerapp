export interface EmailTemplateRow {
  id: string;
  name: string;
  template_key: string;
  subject: string;
  html_body: string;
  text_body: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export type EmailTemplateEditableFields = Pick<
  EmailTemplateRow,
  'id' | 'name' | 'subject' | 'html_body' | 'text_body' | 'description'
>;

export function emailTemplateErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}

export function patchEmailTemplateInList(
  templates: EmailTemplateRow[],
  updated: EmailTemplateRow,
): EmailTemplateRow[] {
  return templates.map((t) => (t.id === updated.id ? updated : t));
}
