import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 20261021150000_drop_email_subscribers_delete_own.sql', () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20261021150000_drop_email_subscribers_delete_own.sql'
    ),
    'utf8'
  );
  const executable = sql.split('-- ROLLBACK')[0];

  it('drops self-delete and freezes privilege columns on update', () => {
    expect(executable).toContain(
      'DROP POLICY IF EXISTS "email_subscribers_delete_own"'
    );
    expect(executable).toContain('NEW.is_blocked IS DISTINCT FROM OLD.is_blocked');
    expect(executable).toContain(
      'NEW.church_downgraded_at IS DISTINCT FROM OLD.church_downgraded_at'
    );
    expect(executable).toContain(
      'NEW.is_church_member IS DISTINCT FROM OLD.is_church_member'
    );
    expect(executable).not.toContain('REVOKE DELETE');
  });
});
