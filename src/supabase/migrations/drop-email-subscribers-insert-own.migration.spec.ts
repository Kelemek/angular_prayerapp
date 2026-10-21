import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 20261021170000_drop_email_subscribers_insert_own.sql', () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20261021170000_drop_email_subscribers_insert_own.sql'
    ),
    'utf8'
  );
  const executable = sql.split('-- ROLLBACK')[0];

  it('drops the self-insert policy and does not revoke authenticated insert', () => {
    expect(executable).toContain(
      'DROP POLICY IF EXISTS "email_subscribers_insert_own"'
    );
    expect(executable).not.toContain('REVOKE INSERT');
  });
});
