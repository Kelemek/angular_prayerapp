import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('migration 20261105020000_prayer_group_owner_trigger_definer.sql', () => {
  const sql = readFileSync(
    join(process.cwd(), 'supabase/migrations/20261105020000_prayer_group_owner_trigger_definer.sql'),
    'utf8',
  );
  const fn = sql.slice(sql.indexOf('FUNCTION public.prayer_group_members_keep_an_owner'));

  it('runs the commit-time owner check as the function owner', () => {
    const definer = fn.indexOf('SECURITY DEFINER');
    const lookup = fn.indexOf('is_prayer_group_member_row');
    expect(definer).toBeGreaterThan(-1);
    expect(lookup).toBeGreaterThan(definer);
    expect(fn).toContain('SET search_path = public, pg_temp');
    expect(sql).toContain(
      'REVOKE ALL ON FUNCTION public.prayer_group_members_keep_an_owner() FROM PUBLIC, anon, authenticated',
    );
    expect(sql).not.toMatch(/EXECUTE\s+format/i);
    expect(sql).not.toMatch(/EXECUTE\s+\$/);
    expect(sql).not.toMatch(/EXECUTE\s+'/);
  });
});
