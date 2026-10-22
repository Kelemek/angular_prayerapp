import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GROUP_ONLY_SUPPRESSED_REMINDER_KINDS } from './group-only-reminder-kinds';

describe('group-only suppressed reminder kinds', () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20261021270000_membership_rpc_gate_and_prompt_reminders.sql',
    ),
    'utf8',
  );
  const executable = sql.split('-- ROLLBACK')[0];
  const start = executable.indexOf('DELETE FROM public.user_prayer_item_reminders');
  const end = executable.indexOf('UPDATE public.user_badge_read_state', start);
  const deletion = executable.slice(start, end);

  it('matches the downgrade DELETE in 20261021270000', () => {
    expect(start).toBeGreaterThanOrEqual(0);
    for (const kind of GROUP_ONLY_SUPPRESSED_REMINDER_KINDS) {
      expect(deletion).toContain(`'${kind}'`);
    }
    expect(deletion).not.toContain("'personal'");
    expect(deletion).not.toContain("'group'");
  });

  it('keeps the same reminder DELETE in 20261021320000', () => {
    const later = readFileSync(
      join(
        process.cwd(),
        'supabase/migrations/20261021320000_downgrade_cancel_pending_church_mail.sql',
      ),
      'utf8',
    ).split('-- ROLLBACK')[0];
    expect(later).toContain("prayer_kind IN ('community', 'pc_member', 'prompt')");
    expect(later).toContain('DELETE FROM public.email_queue q');
  });
});
