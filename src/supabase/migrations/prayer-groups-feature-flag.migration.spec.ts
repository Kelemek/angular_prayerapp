import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 20261019220000_prayer_groups_feature_flag.sql', () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20261019220000_prayer_groups_feature_flag.sql',
    ),
    'utf8',
  );

  it('adds prayer_groups_enabled default false', () => {
    expect(sql).toContain(
      'ADD COLUMN IF NOT EXISTS prayer_groups_enabled boolean NOT NULL DEFAULT false',
    );
  });

  it('defines prayer_groups_enabled() for RLS and RPCs', () => {
    expect(sql).toContain(
      'CREATE OR REPLACE FUNCTION public.prayer_groups_enabled(p_email text DEFAULT NULL)',
    );
    expect(sql).toContain('SET search_path = public, pg_temp');
    expect(sql).toContain(
      'GRANT EXECUTE ON FUNCTION public.prayer_groups_enabled(text) TO authenticated, service_role',
    );
  });

  it('requires the flag inside is_prayer_group_member and create_prayer_group', () => {
    expect(sql).toContain('AND public.prayer_groups_enabled(m.user_email)');
    expect(sql).toContain('IF NOT public.prayer_groups_enabled(v_email) THEN');
  });

  it('stops self-insert or self-update from enabling prayer groups', () => {
    expect(sql).toContain('p_prayer_groups_enabled boolean');
    expect(sql).toContain(
      'es.prayer_groups_enabled IS NOT DISTINCT FROM p_prayer_groups_enabled',
    );
    expect(sql).toContain('AND coalesce(prayer_groups_enabled, false) = false');
    expect(sql).toContain(
      'DROP POLICY IF EXISTS "email_subscribers_update_own" ON public.email_subscribers',
    );
    expect(sql).toContain(
      'DROP FUNCTION IF EXISTS public.subscriber_self_update_keeps_privileges(text, boolean, boolean, uuid, boolean, timestamptz)',
    );
  });
});
