import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 20261018200000_prayer_groups.sql', () => {
  const sql = readFileSync(
    join(process.cwd(), 'supabase/migrations/20261018200000_prayer_groups.sql'),
    'utf8',
  );
  const executable = sql.split('-- ROLLBACK')[0];

  it('lets only a church member create a group and only the owner invite', () => {
    const create = executable.slice(
      executable.indexOf('FUNCTION public.create_prayer_group'),
      executable.indexOf('FUNCTION public.invite_prayer_group_member'),
    );
    expect(create).toContain('IF NOT public.is_church_member(v_email)');
    const invite = executable.slice(
      executable.indexOf('FUNCTION public.invite_prayer_group_member'),
      executable.indexOf('FUNCTION public.rename_prayer_group'),
    );
    expect(invite).toContain('Only the group owner can invite');
    expect(invite).toContain('is_church_member');
    expect(invite).toContain('false');
  });

  it('does not let a member update their own role', () => {
    expect(executable).toContain(
      'REVOKE UPDATE ON TABLE public.prayer_group_members FROM authenticated',
    );
    expect(executable).not.toContain('prayer_group_members_update');
  });

  it('deletes a group-only account that leaves its last group', () => {
    expect(executable).toContain('FUNCTION public.delete_group_only_account_if_last');
    expect(executable).toContain('PERFORM public.delete_subscriber_account');
    const leave = executable.slice(executable.indexOf('FUNCTION public.leave_prayer_group'));
    expect(leave).toContain('DELETE FROM public.prayer_groups WHERE id = p_group_id');
  });

  it('refuses downgrading an owner or an admin', () => {
    const downgrade = executable.slice(
      executable.indexOf('FUNCTION public.admin_downgrade_to_group_only'),
    );
    expect(downgrade).toContain('Transfer admin access before downgrading');
    expect(downgrade).toContain('Transfer group ownership before downgrading');
  });
});
