import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 20261021130000_welcome_emails_memorize_line.sql', () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20261021130000_welcome_emails_memorize_line.sql',
    ),
    'utf8',
  );

  it('adds Memorize bullets to subscriber_welcome and group_welcome', () => {
    expect(sql).toContain("'subscriber_welcome'");
    expect(sql).toContain("'group_welcome'");
    expect(sql).toContain('Memorize Scripture');
    expect(sql).toContain('Memorize tab');
  });
});
