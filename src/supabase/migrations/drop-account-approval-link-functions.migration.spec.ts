import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 20261016190000_drop_account_approval_link_functions.sql', () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20261016190000_drop_account_approval_link_functions.sql'
    ),
    'utf8'
  );

  it('drops the logged-out account approval functions', () => {
    expect(sql).toMatch(
      /DROP FUNCTION IF EXISTS public\.complete_account_approval_from_link\(text, text, text, boolean, timestamptz\)/
    );
    expect(sql).toMatch(
      /DROP FUNCTION IF EXISTS public\.deny_account_approval_from_link\(text\)/
    );
    expect(sql).toMatch(
      /DROP FUNCTION IF EXISTS public\.account_approval_request_for_link\(text\)/
    );
    expect(sql).not.toMatch(/has_pending_account_approval/);
  });
});
