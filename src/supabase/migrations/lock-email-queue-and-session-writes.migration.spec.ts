import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 20261016200000_lock_email_queue_and_session_writes.sql', () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20261016200000_lock_email_queue_and_session_writes.sql'
    ),
    'utf8'
  );

  it('limits email queue inserts to a signed-in admin', () => {
    expect(sql).toMatch(/DROP POLICY IF EXISTS "Anyone can enqueue emails"/);
    expect(sql).toMatch(/CREATE POLICY email_queue_admin_insert/);
    expect(sql).toMatch(/public\.is_admin\(\(auth\.jwt\(\) ->> 'email'\)\)/);
    expect(sql).toMatch(
      /REVOKE ALL ON TABLE public\.email_queue FROM PUBLIC, anon/
    );
  });

  it('queues account approval mail without returning admin addresses', () => {
    expect(sql).toMatch(
      /CREATE OR REPLACE FUNCTION public\.enqueue_account_approval_admin_emails/
    );
    expect(sql).toMatch(/RETURNS integer/);
    expect(sql).toMatch(/GRANT EXECUTE ON FUNCTION public\.enqueue_account_approval_admin_emails/);
    expect(sql).toMatch(/TO anon, authenticated/);
  });

  it('requires the session email for personal prayer and badge writes', () => {
    expect(sql).toMatch(/public\.require_session_email\(p_user_email\)/);
    expect(sql).toMatch(/reorder_personal_prayers_unchecked/);
    expect(sql).toMatch(/reorder_personal_prayer_categories_unchecked/);
    expect(sql).toMatch(/swap_personal_prayer_categories_unchecked/);
    expect(sql).toMatch(/upsert_user_badge_read_state_unchecked/);
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\.reorder_personal_prayers\(text, text\[\], text\) FROM PUBLIC, anon/
    );
  });

  it('hides admin emails, templates, and analytics from anonymous callers', () => {
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\.admin_notification_recipients\(\) FROM PUBLIC, anon/
    );
    expect(sql).toMatch(
      /REVOKE SELECT ON TABLE public\.email_templates FROM PUBLIC, anon/
    );
    expect(sql).toMatch(/CREATE POLICY analytics_select_admin/);
    expect(sql).toMatch(/REVOKE ALL ON TABLE public\.analytics FROM PUBLIC, anon/);
  });
});
