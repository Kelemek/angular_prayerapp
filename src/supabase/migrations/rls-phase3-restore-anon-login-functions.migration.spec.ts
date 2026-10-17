import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 20261017190000_rls_phase3_restore_anon_login_functions.sql', () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20261017190000_rls_phase3_restore_anon_login_functions.sql'
    ),
    'utf8'
  );
  const executable = sql.split('-- ROLLBACK')[0];

  it('grants anon execute only on the two login approval functions', () => {
    expect(executable).toContain(
      'GRANT EXECUTE ON FUNCTION public.has_pending_account_approval(text) TO anon'
    );
    expect(executable).toContain(
      'GRANT EXECUTE ON FUNCTION public.create_account_approval_request(text, text, text, text) TO anon'
    );
    expect(executable).not.toContain(
      'create_account_approval_request(text, text, text) TO anon'
    );
    expect(executable).not.toMatch(/TO PUBLIC/);
  });
});
