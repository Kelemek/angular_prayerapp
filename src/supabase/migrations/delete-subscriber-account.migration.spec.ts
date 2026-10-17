import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 20261017220000_delete_subscriber_account.sql', () => {
  const sql = readFileSync(
    join(process.cwd(), 'supabase/migrations/20261017220000_delete_subscriber_account.sql'),
    'utf8',
  );
  const executable = sql.split('-- ROLLBACK')[0];

  it('deletes the subscriber and one matching sign-in in the same function', () => {
    expect(executable).toContain(
      'CREATE OR REPLACE FUNCTION public.delete_subscriber_account(',
    );
    expect(executable).toContain(
      "RAISE EXCEPTION 'sign-in does not match the subscriber'",
    );
    expect(executable).toContain('DELETE FROM auth.users WHERE id = v_auth_id');
    expect(executable).toContain('DELETE FROM public.email_subscribers WHERE id = p_subscriber_id');
    expect(executable).not.toContain('auth.admin');
  });

  it('exposes own-account and admin deletion, and hides the shared function', () => {
    expect(executable).toContain(
      'CREATE OR REPLACE FUNCTION public.delete_own_subscriber_account(p_delete_prayers boolean)',
    );
    expect(executable).toContain(
      'CREATE OR REPLACE FUNCTION public.admin_delete_email_subscriber(p_subscriber_id uuid)',
    );
    expect(executable).toContain(
      'REVOKE ALL ON FUNCTION public.delete_subscriber_account(uuid, boolean, uuid) FROM PUBLIC, anon, authenticated',
    );
    expect(executable).toContain(
      'GRANT EXECUTE ON FUNCTION public.delete_own_subscriber_account(boolean) TO authenticated',
    );
    expect(executable).toContain(
      'GRANT EXECUTE ON FUNCTION public.admin_delete_email_subscriber(uuid) TO authenticated',
    );
    expect(executable).not.toContain(
      'GRANT EXECUTE ON FUNCTION public.delete_subscriber_account(uuid, boolean, uuid)',
    );
    expect(executable).not.toContain('TO anon');
    expect(executable).toContain('DROP FUNCTION IF EXISTS public.lookup_auth_user_id_by_email(text)');
  });
});