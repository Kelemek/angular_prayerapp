import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 20261020210000_group_welcome_email_template.sql', () => {
  const sql = readFileSync(
    join(process.cwd(), 'supabase/migrations/20261020210000_group_welcome_email_template.sql'),
    'utf8',
  );

  it('inserts group_welcome with required placeholders', () => {
    expect(sql).toContain("'group_welcome'");
    expect(sql).toContain('Welcome to the Group - New Member');
    expect(sql).toContain('{{groupName}}');
    expect(sql).toContain('{{inviterName}}');
    expect(sql).toContain('{{appLink}}');
  });

  it('removes unused sparse group email templates and queue rows', () => {
    expect(sql).toContain('DELETE FROM public.email_queue');
    expect(sql).toContain('DELETE FROM public.email_templates');
    expect(sql).toContain("'group_invitation'");
    expect(sql).toContain("'group_prayer_added'");
    expect(sql).toContain("'group_prayer_update'");
  });
});
