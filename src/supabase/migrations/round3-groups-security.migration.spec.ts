import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('migration 20261021290000_membership_helpers_no_jwt.sql', () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20261021290000_membership_helpers_no_jwt.sql',
    ),
    'utf8',
  );
  const executable = sql.split('-- ROLLBACK')[0];

  it('keeps row lookups un-granted and wrappers fail closed', () => {
    expect(executable).toContain(
      'REVOKE ALL ON FUNCTION public.is_church_member_row(text) FROM PUBLIC, anon, authenticated',
    );
    expect(executable).toContain(
      'REVOKE ALL ON FUNCTION public.is_prayer_group_member_row(uuid, text) FROM PUBLIC, anon, authenticated',
    );
    expect(executable).toContain(
      "coalesce(auth.role(), auth.jwt() ->> 'role', '')",
    );
    expect(executable).toContain('public.is_church_member_row(v_email)');
    expect(executable).toContain('public.is_prayer_group_member_row(p_group_id, v_email)');
    expect(executable).not.toContain(
      'GRANT EXECUTE ON FUNCTION public.is_church_member_row(text) TO authenticated',
    );
    expect(executable).not.toContain(
      'GRANT EXECUTE ON FUNCTION public.is_prayer_group_member_row(uuid, text) TO authenticated',
    );
  });
});

describe('migration 20261021310000_owner_any_member_caller_guard.sql', () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20261021310000_owner_any_member_caller_guard.sql',
    ),
    'utf8',
  );
  const executable = sql.split('-- ROLLBACK')[0];

  it('fails closed for another email unless service_role or admin', () => {
    expect(executable).toContain("coalesce(auth.role(), auth.jwt() ->> 'role', '')");
    expect(executable).toContain('v_target IS DISTINCT FROM v_jwt');
    expect(executable).toContain('RETURN false');
    expect(executable).toContain('public.is_prayer_group_member_row');
  });
});

describe('migration 20261021320000_downgrade_cancel_pending_church_mail.sql', () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20261021320000_downgrade_cancel_pending_church_mail.sql',
    ),
    'utf8',
  );
  const executable = sql.split('-- ROLLBACK')[0];

  it('deletes pending church queue rows and keeps group templates', () => {
    expect(executable).toContain('DELETE FROM public.email_queue q');
    expect(executable).toContain("q.status = 'pending'");
    expect(executable).toContain('coalesce(t.is_group, false) = true');
    expect(executable).toContain("prayer_kind IN ('community', 'pc_member', 'prompt')");
  });
});

describe('migration 20261021300000_edge_rate_limits.sql', () => {
  const sql = readFileSync(
    join(process.cwd(), 'supabase/migrations/20261021300000_edge_rate_limits.sql'),
    'utf8',
  );
  const executable = sql.split('-- ROLLBACK')[0];
  const lookup = readFileSync(
    join(process.cwd(), 'supabase/functions/planning-center-lookup/index.ts'),
    'utf8',
  );
  const notify = readFileSync(
    join(process.cwd(), 'supabase/functions/notify-group-activity/index.ts'),
    'utf8',
  );

  it('exposes consume, invite assert, and notify claim to service_role only', () => {
    expect(executable).toContain('public.consume_rate_limit');
    expect(executable).toContain('public.assert_group_invite_sendable');
    expect(executable).toContain('ON CONFLICT DO NOTHING');
    expect(executable).toContain(
      'REVOKE ALL ON FUNCTION public.consume_rate_limit(text, text, int, interval)',
    );
    expect(executable).toContain('TO service_role');
    expect(executable).not.toContain('TO anon');
    expect(lookup).not.toContain('createLoginLookupRateLimiter');
    expect(lookup).toContain('consumeRateLimit');
    expect(notify).toContain('claimNotifyRecipients');
    expect(notify).toContain('claimedDelivery(pushRecipients, claimed)');
    expect(notify).toContain("consumeRateLimit(admin, 'group_notify_actor'");
  });
});
