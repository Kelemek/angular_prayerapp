import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 20261028193000_icon_badge_push.sql', () => {
  const sql = readFileSync(
    join(process.cwd(), 'supabase/migrations/20261028193000_icon_badge_push.sql'),
    'utf8',
  );
  const executable = sql.split('-- ROLLBACK')[0];

  it('adds the icon report columns on user_badge_read_state', () => {
    expect(executable).toContain('ADD COLUMN IF NOT EXISTS icon_unread integer');
    expect(executable).toContain('ADD COLUMN IF NOT EXISTS icon_badges_enabled boolean');
    expect(executable).toContain('ADD COLUMN IF NOT EXISTS icon_reported_at timestamptz');
  });

  it('gates report_icon_badge_unread with require_session_email before the write', () => {
    const start = executable.indexOf('FUNCTION public.report_icon_badge_unread');
    expect(start).toBeGreaterThan(-1);
    const body = executable.slice(start, start + 900);
    expect(body).toMatch(/BEGIN\s+PERFORM public\.require_session_email\(p_user_email\);/);
    expect(body).toContain('ON CONFLICT (user_email) DO UPDATE SET');
    expect(body).not.toContain('prayers_data');
    expect(body).not.toContain('prompts_data');
    expect(body).toContain('greatest(coalesce(p_unread, 0), 0)');
  });

  it('adds no church items for a group-only recipient', () => {
    const start = executable.indexOf('FUNCTION public.icon_badge_new_since');
    const body = executable.slice(start, executable.indexOf('REVOKE ALL ON FUNCTION public.icon_badge_new_since'));
    expect(body).toMatch(/CASE WHEN NOT public\.is_church_member_row\(.*p_email.*\)\) THEN 0 ELSE/);
  });

  it('grants the report to signed-in callers and the counts to service_role only', () => {
    expect(executable).toContain(
      'REVOKE ALL ON FUNCTION public.report_icon_badge_unread(text, integer, boolean) FROM PUBLIC, anon',
    );
    expect(executable).toContain(
      'GRANT EXECUTE ON FUNCTION public.report_icon_badge_unread(text, integer, boolean) TO authenticated, service_role',
    );
    expect(executable).toContain(
      'REVOKE ALL ON FUNCTION public.icon_badge_new_since(text, timestamptz) FROM PUBLIC, anon, authenticated',
    );
    expect(executable).toContain(
      'GRANT EXECUTE ON FUNCTION public.icon_badge_new_since(text, timestamptz) TO service_role',
    );
    expect(executable).toContain(
      'REVOKE ALL ON FUNCTION public.admin_pending_item_total() FROM PUBLIC, anon, authenticated',
    );
    expect(executable).toContain(
      'GRANT EXECUTE ON FUNCTION public.admin_pending_item_total() TO service_role',
    );
    expect(executable).not.toMatch(
      /GRANT EXECUTE ON FUNCTION public\.icon_badge_new_since\(text, timestamptz\) TO authenticated/,
    );
    expect(executable).not.toMatch(
      /GRANT EXECUTE ON FUNCTION public\.admin_pending_item_total\(\) TO authenticated/,
    );
    expect(executable).not.toMatch(
      /GRANT EXECUTE ON FUNCTION public\.report_icon_badge_unread\(text, integer, boolean\) TO anon/,
    );
  });
});
