import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 20261017180000_rls_phase3_function_search_path.sql', () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20261017180000_rls_phase3_function_search_path.sql'
    ),
    'utf8'
  );
  const executable = sql.split('-- ROLLBACK')[0];
  const names = [
    'reorder_personal_prayers_unchecked(text, text[], text)',
    'reorder_personal_prayer_categories_unchecked(text, text[])',
    'swap_personal_prayer_categories_unchecked(text, text, text)',
    'jsonb_union_string_arrays(jsonb, jsonb)',
    'merge_badge_read_prayers_data(jsonb, jsonb)',
    'merge_badge_read_prompts_data(jsonb, jsonb)',
    'touch_memorized_items_updated_at()',
    'update_branding_last_modified()',
    'update_member_prayer_updates_timestamp()',
  ];

  it('pins search_path on the nine functions', () => {
    expect(executable).toContain('SET search_path = public, pg_temp');
    for (const name of names) {
      expect(executable).toContain(name);
    }
    expect(executable).not.toMatch(/RESET search_path/);
  });
});
