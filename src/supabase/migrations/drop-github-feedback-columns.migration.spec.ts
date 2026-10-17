import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 20261016160000_drop_github_feedback_columns.sql', () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20261016160000_drop_github_feedback_columns.sql'
    ),
    'utf8'
  );

  it('drops the legacy GitHub feedback columns from admin_settings', () => {
    expect(sql).toMatch(/ALTER\s+TABLE\s+public\.admin_settings/i);
    expect(sql).toMatch(/DROP\s+COLUMN\s+IF\s+EXISTS\s+github_token/i);
    expect(sql).toMatch(/DROP\s+COLUMN\s+IF\s+EXISTS\s+github_repo_owner/i);
    expect(sql).toMatch(/DROP\s+COLUMN\s+IF\s+EXISTS\s+github_repo_name/i);
    expect(sql).toMatch(/DROP\s+COLUMN\s+IF\s+EXISTS\s+enabled/i);
  });
});
