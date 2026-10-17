import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// 20261017190000 grants anon execute back on the two login approval functions.
describe('migration 20261017170000_rls_phase3_function_execute.sql', () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20261017170000_rls_phase3_function_execute.sql'
    ),
    'utf8'
  );
  const executable = sql.split('-- ROLLBACK')[0];

  it('revokes anon and public execute and keeps the approval overload distinct', () => {
    expect(executable).toContain('public.has_pending_account_approval(text)');
    expect(executable).toMatch(/REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon/);
    expect(executable).toContain('public.get_user_prayer_hour_reminders_due_now()');
    expect(executable).toMatch(/GRANT EXECUTE ON FUNCTION %s TO service_role/);
    expect(executable).toContain("'public.create_account_approval_request(text, text, text)'");
    expect(executable).toContain("'public.create_account_approval_request(text, text, text, text)'");
    expect(executable).toMatch(/REVOKE EXECUTE ON FUNCTIONS FROM anon, PUBLIC/);
    expect(executable).toMatch(/REVOKE ALL ON TABLES FROM anon/);
    expect(executable).toMatch(/is_admin policy still applies to anon or public/);
    expect(executable).not.toMatch(/GRANT EXECUTE ON FUNCTION %s TO anon/);
    expect(executable).not.toMatch(/TO anon,/);
  });
});
