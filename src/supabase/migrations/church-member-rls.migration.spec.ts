import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 20261018190000_church_member_rls.sql', () => {
  const sql = readFileSync(
    join(process.cwd(), 'supabase/migrations/20261018190000_church_member_rls.sql'),
    'utf8',
  );
  const executable = sql.split('-- ROLLBACK')[0];

  it('requires is_church_member on church read and write policies', () => {
    const policies = [
      'prayers_select_approved_authenticated',
      'prayers_insert_member',
      'prayer_updates_select_approved',
      'prayer_updates_insert_pending',
      'prayer_prompts_select_authenticated',
      'prayer_types_select_authenticated',
      'member_prayer_updates_select_authenticated',
      'member_prayer_updates_insert_authenticated',
      'member_prayer_updates_update_own',
      'member_prayer_updates_delete_own',
      'Allow select on member_prayed_for_counts',
      'Allow select own prompt prayed counts',
      'booklet_insert_pages_authenticated_read',
    ];
    for (const name of policies) {
      const start = executable.indexOf(`"${name}"`);
      expect(start, name).toBeGreaterThan(-1);
      const body = executable.slice(start, start + 500);
      expect(body, name).toContain('public.is_church_member()');
    }
  });

  it('raises Not authorized from church counters and badge writes', () => {
    const functions = [
      'public.increment_prayed_for_count(prayer_id uuid)',
      'public.increment_member_prayed_for_count(p_person_id text)',
      'public.get_prompt_prayed_for_counts(',
      'public.increment_prompt_prayed_for_count(',
      'public.upsert_user_badge_read_state(',
    ];
    for (const signature of functions) {
      const start = executable.indexOf(signature);
      expect(start, signature).toBeGreaterThan(-1);
      const body = executable.slice(start, start + 700);
      expect(body, signature).toContain("RAISE EXCEPTION 'Not authorized'");
      expect(body, signature).toContain('SET search_path = public, pg_temp');
    }
  });

  it('does not grant the church counters to anon', () => {
    expect(executable).toContain(
      'REVOKE ALL ON FUNCTION public.increment_prayed_for_count(uuid) FROM PUBLIC, anon',
    );
    expect(executable).toContain(
      'GRANT EXECUTE ON FUNCTION public.increment_prayed_for_count(uuid) TO authenticated, service_role',
    );
    expect(executable).not.toMatch(
      /GRANT EXECUTE ON FUNCTION public\.increment_prayed_for_count\(uuid\) TO anon/,
    );
    expect(executable).not.toMatch(
      /GRANT EXECUTE ON FUNCTION public\.get_prompt_prayed_for_counts\(uuid\[\], text\) TO anon/,
    );
  });
});
