import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 20261016180000_test_account_login_codes.sql', () => {
  const sql = readFileSync(
    join(process.cwd(), 'supabase/migrations/20261016180000_test_account_login_codes.sql'),
    'utf8'
  );

  it('hides the tester codes from table select and returns them only to an admin or the tester', () => {
    expect(sql).toMatch(/REVOKE SELECT ON TABLE public\.admin_settings FROM PUBLIC, anon, authenticated/);
    const grant = sql.slice(sql.indexOf('GRANT SELECT ('), sql.indexOf(') ON TABLE'));
    expect(grant).not.toContain('test_account_code_4');
    expect(grant).not.toContain('test_account_code_6');
    expect(grant).not.toContain('test_account_code_8');
    expect(sql).toMatch(/IF NOT public\.is_admin\(v_jwt_email\)/);
    expect(sql).toMatch(/v_jwt_email <> v_tester_email/);
    expect(sql).toMatch(/RAISE EXCEPTION 'Not authenticated'/);
    expect(sql).toMatch(/RAISE EXCEPTION 'Not authorized'/);
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\.get_test_account_login_codes\(\) FROM anon/
    );
    expect(sql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.get_test_account_login_codes\(\) TO authenticated/
    );
  });
});
