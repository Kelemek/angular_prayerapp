import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 20261017210000_lookup_auth_user_id_by_email.sql', () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20261017210000_lookup_auth_user_id_by_email.sql',
    ),
    'utf8',
  );
  const executable = sql.split('-- ROLLBACK')[0];

  it('looks up auth.users by email for the service role only', () => {
    expect(executable).toContain(
      'CREATE OR REPLACE FUNCTION public.lookup_auth_user_id_by_email(p_email text)',
    );
    expect(executable).toContain('SET search_path = auth, pg_temp');
    expect(executable).toContain(
      'REVOKE ALL ON FUNCTION public.lookup_auth_user_id_by_email(text) FROM PUBLIC, anon, authenticated',
    );
    expect(executable).toContain(
      'GRANT EXECUTE ON FUNCTION public.lookup_auth_user_id_by_email(text) TO service_role',
    );
    expect(executable).not.toContain('GRANT EXECUTE ON FUNCTION public.lookup_auth_user_id_by_email(text) TO anon');
    expect(executable).not.toContain(
      'GRANT EXECUTE ON FUNCTION public.lookup_auth_user_id_by_email(text) TO authenticated',
    );
  });
});
