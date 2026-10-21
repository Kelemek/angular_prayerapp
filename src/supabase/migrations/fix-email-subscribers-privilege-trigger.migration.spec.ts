import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 20261021200000_fix_email_subscribers_privilege_trigger.sql', () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20261021200000_fix_email_subscribers_privilege_trigger.sql'
    ),
    'utf8'
  );
  const executable = sql.split('-- ROLLBACK')[0];

  it('uses is_admin(text) and service_role JWT role bypass', () => {
    expect(executable).toContain('SECURITY DEFINER');
    expect(executable).toContain("public.is_admin(v_actor)");
    expect(executable).not.toContain('public.is_admin()');
    expect(executable).toContain("v_role = 'service_role'");
  });
});
