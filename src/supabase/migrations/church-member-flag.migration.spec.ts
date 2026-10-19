import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 20261018180000_church_member_flag.sql', () => {
  const sql = readFileSync(
    join(process.cwd(), 'supabase/migrations/20261018180000_church_member_flag.sql'),
    'utf8',
  );
  const executable = sql.split('-- ROLLBACK')[0];

  it('adds the church-member flag with a true default and backfill', () => {
    expect(executable).toContain(
      'ADD COLUMN IF NOT EXISTS is_church_member boolean NOT NULL DEFAULT true',
    );
    expect(executable).toContain(
      'ADD COLUMN IF NOT EXISTS church_downgraded_at timestamptz',
    );
    expect(executable).toContain('SET is_church_member = true');
  });

  it('grants is_church_member to signed-in users and the service role only', () => {
    expect(executable).toContain(
      'CREATE OR REPLACE FUNCTION public.is_church_member(p_email text DEFAULT NULL)',
    );
    expect(executable).toContain('SET search_path = public, pg_temp');
    expect(executable).toContain(
      'REVOKE ALL ON FUNCTION public.is_church_member(text) FROM PUBLIC, anon',
    );
    expect(executable).toContain(
      'GRANT EXECUTE ON FUNCTION public.is_church_member(text) TO authenticated, service_role',
    );
    expect(executable).not.toContain('GRANT EXECUTE ON FUNCTION public.is_church_member(text) TO anon');
  });

  it('requires church membership inside is_admin', () => {
    const isAdmin = executable.slice(executable.indexOf('FUNCTION public.is_admin'));
    expect(isAdmin).toContain('es.is_church_member IS TRUE');
    expect(isAdmin).toContain('es.is_admin IS TRUE');
  });

  it('stops a self-insert or self-update from setting the flag', () => {
    expect(executable).toContain('AND is_church_member = false');
    expect(executable).toContain('AND church_downgraded_at IS NULL');
    expect(executable).toContain('p_is_church_member boolean');
    expect(executable).toContain('p_church_downgraded_at timestamptz');
    expect(executable).toContain(
      'es.is_church_member IS NOT DISTINCT FROM p_is_church_member',
    );
    expect(executable).toContain(
      'DROP FUNCTION IF EXISTS public.subscriber_self_update_keeps_privileges(text, boolean, boolean, uuid)',
    );
    expect(executable).toContain(
      'REVOKE ALL ON FUNCTION public.subscriber_self_update_keeps_privileges(text, boolean, boolean, uuid, boolean, timestamptz) FROM PUBLIC, anon',
    );
  });
});
