import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('migration 20261021260000_function_search_path_pg_temp.sql', () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20261021260000_function_search_path_pg_temp.sql',
    ),
    'utf8',
  );
  const executable = sql.split('-- ROLLBACK')[0];
  const names = [
    'public.update_email_subscribers_updated_at()',
    'public.update_prayers_updated_at_skip_prayed_for()',
    'public.link_email_subscriber_auth()',
    'public.trg_purge_item_reminders_on_prayer_delete()',
    'public.trg_purge_item_reminders_on_prayer_status()',
    'public.trg_purge_item_reminders_on_personal_delete()',
    'public.trg_purge_item_reminders_on_personal_answered()',
    'public.trg_purge_item_reminders_on_prompt_delete()',
    'public.trg_purge_item_reminders_on_group_prayer_delete()',
    'public.trg_purge_item_reminders_on_group_prayer_answered()',
    'public.purge_user_prayer_item_reminders(text, text)',
  ];

  it('pins search_path to public, pg_temp', () => {
    expect(executable).toContain('SET search_path = public, pg_temp');
    for (const name of names) {
      expect(executable).toContain(name);
    }
    expect(executable).not.toMatch(/RESET search_path/);
  });
});
