import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 20261017160000_rls_phase3_is_admin_policy_roles.sql', () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20261017160000_rls_phase3_is_admin_policy_roles.sql'
    ),
    'utf8'
  );
  const executable = sql.split('-- ROLLBACK')[0];

  it('moves the four public admin policies to authenticated without rewriting USING', () => {
    expect(executable).toMatch(/ALTER POLICY %I ON public\.%I TO authenticated/);
    expect(executable).toContain('Admins can manage deletion_requests');
    expect(executable).toContain('Admins can manage prayer_updates');
    expect(executable).toContain('Admins can modify all prayers');
    expect(executable).toContain('Admins can view all prayers');
    expect(executable).toMatch(/RAISE EXCEPTION 'missing policy/);
    expect(executable).not.toMatch(/\bUSING\b/);
    expect(executable).not.toMatch(/rls_phase2_admin_select/);
    expect(executable).not.toMatch(/DROP POLICY/);
  });

  it('comments a rollback that restores TO public', () => {
    const rollback = sql.split('-- ROLLBACK')[1] ?? '';
    expect(rollback).toMatch(
      /ALTER POLICY "Admins can manage deletion_requests" ON public\.deletion_requests TO public/
    );
    expect(rollback).toMatch(
      /ALTER POLICY "Admins can manage prayer_updates" ON public\.prayer_updates TO public/
    );
    expect(rollback).toMatch(
      /ALTER POLICY "Admins can modify all prayers" ON public\.prayers TO public/
    );
    expect(rollback).toMatch(
      /ALTER POLICY "Admins can view all prayers" ON public\.prayers TO public/
    );
  });
});
