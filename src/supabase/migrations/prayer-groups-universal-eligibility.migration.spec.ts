import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, it } from 'vitest';

const migrationPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../supabase/migrations/20261105040000_prayer_groups_universal_eligibility.sql',
);

describe('20261105040000_prayer_groups_universal_eligibility.sql', () => {
  const sql = readFileSync(migrationPath, 'utf-8');

  it('documents deferred column removal', () => {
    expect(sql.toLowerCase()).toContain('deferred');
    expect(sql).toContain('prayer_groups_enabled');
  });

  it('backfills prayer_groups_enabled and sets default true', () => {
    expect(sql).toContain('SET DEFAULT true');
    expect(sql).toContain('SET prayer_groups_enabled = true');
  });

  it('defines prayer_groups_enabled() from unblocked subscriber rows only', () => {
    expect(sql).toContain(
      'CREATE OR REPLACE FUNCTION public.prayer_groups_enabled(p_email text DEFAULT NULL)',
    );
    expect(sql).not.toContain('es.prayer_groups_enabled IS TRUE');
    expect(sql).toContain('coalesce(es.is_blocked, false) IS NOT TRUE');
  });
});
