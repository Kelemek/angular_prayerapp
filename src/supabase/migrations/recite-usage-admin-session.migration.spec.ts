import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 20261016170000_recite_usage_admin_session.sql', () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20261016170000_recite_usage_admin_session.sql'
    ),
    'utf8'
  );

  it('requires a signed-in admin and does not trust a bare email', () => {
    expect(sql).toMatch(/IF v_jwt_email IS NULL THEN/);
    expect(sql).toMatch(/RAISE EXCEPTION 'Not authenticated'/);
    expect(sql).toMatch(/IF NOT public\.is_admin\(v_jwt_email\)/);
    expect(sql).not.toMatch(/v_email := v_p_email/);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.get_memorization_recite_usage_summary[\s\S]*FROM anon/);
    expect(sql).toMatch(/REVOKE SELECT ON TABLE public\.memorization_recite_usage FROM anon/);
  });
});
