import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 20261021140000_email_queue_reject_group_only_church_mail.sql', () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20261021140000_email_queue_reject_group_only_church_mail.sql'
    ),
    'utf8'
  );
  const executable = sql.split('-- ROLLBACK')[0];

  it('rejects church mass templates for non-church recipients and allows service role', () => {
    expect(executable).toContain("auth.role() = 'service_role'");
    expect(executable).toContain("'approved_prayer'");
    expect(executable).toContain("'admin_subscriber_manual_broadcast'");
    expect(executable).toContain("RAISE EXCEPTION 'Not authorized'");
    expect(executable).toContain('SET search_path = public, pg_temp');
    expect(executable).toContain(
      'REVOKE ALL ON FUNCTION public.email_queue_reject_group_only_church_mail()'
    );
  });
});
