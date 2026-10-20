import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 20261020000100_invite_enables_prayer_groups.sql', () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20261020000100_invite_enables_prayer_groups.sql',
    ),
    'utf8',
  );

  it('sets prayer_groups_enabled on new group-only subscribers from invite', () => {
    const invite = sql.slice(
      sql.indexOf('FUNCTION public.invite_prayer_group_member'),
      sql.indexOf('-- Existing members invited'),
    );
    expect(invite).toContain('prayer_groups_enabled');
    expect(invite).toContain('false, true');
  });

  it('enables prayer_groups_enabled for existing subscribers on invite', () => {
    const invite = sql.slice(
      sql.indexOf('FUNCTION public.invite_prayer_group_member'),
      sql.indexOf('-- Existing members invited'),
    );
    expect(invite).toContain('SET prayer_groups_enabled = true');
  });

  it('backfills prayer_groups_enabled for active group members', () => {
    expect(sql).toContain('UPDATE public.email_subscribers es');
    expect(sql).toContain('FROM public.prayer_group_members m');
  });
});
