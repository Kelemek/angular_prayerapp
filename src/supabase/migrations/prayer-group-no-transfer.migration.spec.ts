import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('migration 20261105030000_prayer_group_no_transfer.sql', () => {
  const sql = readFileSync(
    join(process.cwd(), 'supabase/migrations/20261105030000_prayer_group_no_transfer.sql'),
    'utf8',
  );

  it('refuses the last owner leave before it deletes the membership', () => {
    const leave = sql.slice(
      sql.indexOf('FUNCTION public.leave_prayer_group'),
      sql.indexOf('FUNCTION public.set_prayer_group_member_role'),
    );
    const guard = leave.indexOf('Make another member an owner before you leave this group');
    const deletion = leave.indexOf('DELETE FROM public.prayer_group_members');
    expect(guard).toBeGreaterThan(-1);
    expect(deletion).toBeGreaterThan(guard);
    expect(leave).toContain('prayer_group_active_owner_count(p_group_id) <= 1');
  });

  it('does not let transfer demote an owner', () => {
    const transfer = sql.slice(
      sql.indexOf('FUNCTION public.transfer_prayer_group_ownership'),
      sql.indexOf('FUNCTION public.leave_prayer_group'),
    );
    expect(transfer).toContain('Make another member an owner before you leave this group');
    expect(transfer).not.toContain('UPDATE public.prayer_group_members');
    expect(transfer).not.toContain('UPDATE public.prayer_groups');
    expect(sql).not.toMatch(/EXECUTE\s+format/i);
    expect(sql).not.toMatch(/EXECUTE\s+\$/);
    expect(sql).not.toMatch(/EXECUTE\s+'/);
  });
});
