import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('migration 20261104223000_prayer_group_multiple_owners.sql', () => {
  const sql = readFileSync(
    join(process.cwd(), 'supabase/migrations/20261104223000_prayer_group_multiple_owners.sql'),
    'utf8',
  );
  const executable = sql.split('-- ROLLBACK')[0];

  it('rejects a non-owner before it changes a role', () => {
    const setRole = executable.slice(
      executable.indexOf('FUNCTION public.set_prayer_group_member_role'),
      executable.indexOf('FUNCTION public.remove_prayer_group_member'),
    );
    const guard = setRole.indexOf('Only a group owner can change roles');
    const write = setRole.indexOf('UPDATE public.prayer_group_members');
    expect(guard).toBeGreaterThan(-1);
    expect(write).toBeGreaterThan(guard);
    expect(setRole).toContain('is_prayer_group_owner');
  });

  it('keeps the last owner in place until transfer', () => {
    const remove = executable.slice(
      executable.indexOf('FUNCTION public.remove_prayer_group_member'),
      executable.indexOf('FUNCTION public.leave_prayer_group'),
    );
    const guard = remove.indexOf('Transfer ownership before removing an owner');
    const deletion = remove.indexOf('DELETE FROM public.prayer_group_members');
    expect(guard).toBeGreaterThan(-1);
    expect(deletion).toBeGreaterThan(guard);
    expect(remove).toContain('prayer_group_active_owner_count');

    const leave = executable.slice(executable.indexOf('FUNCTION public.leave_prayer_group'));
    expect(leave).toContain('Transfer ownership before leaving this group');
    expect(leave).not.toContain('DELETE FROM public.prayer_groups');
  });

  it('adds an owner through the existing invite function', () => {
    const invite = executable.slice(
      executable.indexOf('FUNCTION public.invite_prayer_group_member'),
      executable.indexOf('FUNCTION public.set_prayer_group_member_role'),
    );
    expect(invite).toContain('p_role text DEFAULT \'member\'');
    expect(invite).toContain('Only a group owner can invite');
    expect(invite).toContain('created_subscriber');
    expect(invite).toContain('WHEN v_role = \'owner\' THEN \'owner\'');
    expect(executable).not.toMatch(/EXECUTE\s+format/i);
    expect(executable).not.toMatch(/EXECUTE\s+\$/);
    expect(executable).not.toMatch(/EXECUTE\s+'/);
  });

  it('binds emails as parameters', () => {
    expect(executable).toContain('lower(trim(coalesce(p_email');
    expect(executable).not.toMatch(/\|\|/);
  });
});
