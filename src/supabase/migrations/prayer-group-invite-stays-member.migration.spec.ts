import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('migration 20261105001000_prayer_group_invite_stays_member.sql', () => {
  const sql = readFileSync(
    join(process.cwd(), 'supabase/migrations/20261105001000_prayer_group_invite_stays_member.sql'),
    'utf8',
  );

  it('drops the owner invite and inserts a member', () => {
    const drop = sql.indexOf(
      'DROP FUNCTION IF EXISTS public.invite_prayer_group_member(uuid, text, text)',
    );
    const create = sql.indexOf('CREATE FUNCTION public.invite_prayer_group_member');
    const write = sql.indexOf('INSERT INTO public.prayer_group_members');
    expect(drop).toBeGreaterThan(-1);
    expect(create).toBeGreaterThan(drop);
    expect(write).toBeGreaterThan(create);
    expect(sql).toContain("p_group_id, v_email, 'member'");
    expect(sql).not.toContain('p_role');
    expect(sql).not.toMatch(/EXECUTE\s+format/i);
    expect(sql).not.toMatch(/EXECUTE\s+\$/);
    expect(sql).not.toMatch(/EXECUTE\s+'/);
  });
});
