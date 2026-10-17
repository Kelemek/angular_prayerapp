import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 20261017200000_rls_phase3_default_function_privileges.sql', () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20261017200000_rls_phase3_default_function_privileges.sql'
    ),
    'utf8'
  );
  const executable = sql.split('-- ROLLBACK')[0];

  it('revokes the built-in public execute default and the schema anon grant', () => {
    expect(executable).toMatch(
      /ALTER DEFAULT PRIVILEGES FOR ROLE postgres\s+REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC/
    );
    expect(executable).toMatch(
      /ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public\s+REVOKE EXECUTE ON FUNCTIONS FROM anon/
    );
    expect(executable).not.toMatch(
      /ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public\s+REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC/
    );
  });
});
