import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 20261017150000_rls_phase3_revoke_anon_table_grants.sql', () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20261017150000_rls_phase3_revoke_anon_table_grants.sql'
    ),
    'utf8'
  );
  const executable = sql.split('-- ROLLBACK')[0];

  it('revokes anon on the three relations and narrows the recite policy', () => {
    expect(executable).toMatch(/REVOKE ALL ON TABLE public\.%I FROM anon/);
    expect(executable).toContain("'scripture_cache'");
    expect(executable).toContain("'memorization_recite_usage'");
    expect(executable).toContain("'backup_tables'");
    expect(executable).toMatch(
      /ALTER POLICY memorization_recite_usage_admin_select[\s\S]*TO authenticated/
    );
    expect(executable).toMatch(/RAISE EXCEPTION 'missing policy memorization_recite_usage_admin_select'/);
    expect(executable).not.toMatch(/admin_settings/);
    expect(executable).not.toMatch(/FROM authenticated/);
    expect(executable).not.toMatch(/FROM service_role/);
  });

  it('comments a rollback that restores anon grants and the anon policy role', () => {
    const rollback = sql.split('-- ROLLBACK')[1] ?? '';
    expect(rollback).toMatch(/GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public\.scripture_cache TO anon/);
    expect(rollback).toMatch(/GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLE public\.memorization_recite_usage TO anon/);
    expect(rollback).toMatch(/GRANT SELECT ON TABLE public\.backup_tables TO anon/);
    expect(rollback).toMatch(
      /ALTER POLICY memorization_recite_usage_admin_select ON public\.memorization_recite_usage TO anon, authenticated/
    );
  });
});
