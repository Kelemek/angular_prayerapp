import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 20261021160000_group_prayer_updates_keep_identity.sql', () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20261021160000_group_prayer_updates_keep_identity.sql'
    ),
    'utf8'
  );
  const executable = sql.split('-- ROLLBACK')[0];

  it('requires current membership and freezes prayer id and author email', () => {
    expect(executable).toContain('NEW.group_prayer_id IS DISTINCT FROM OLD.group_prayer_id');
    expect(executable).toContain(
      'public.is_prayer_group_member(gp.group_id)'
    );
    expect(executable).toContain('WITH CHECK');
    expect(executable).toContain('SET search_path = public, pg_temp');
  });
});
