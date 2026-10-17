import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("migration 20261016210000_account_approval_notify_one_query.sql", () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/20261016210000_account_approval_notify_one_query.sql"
    ),
    "utf8"
  );

  it("returns push targets from the same admin query and only to the service role", () => {
    expect(sql).toMatch(
      /DROP FUNCTION IF EXISTS public\.enqueue_account_approval_admin_emails/
    );
    expect(sql).toMatch(/RETURNS jsonb/);
    expect(sql).toMatch(/'pushEmails'/);
    expect(sql).toMatch(/send_email/);
    expect(sql).toMatch(/send_push/);
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\.enqueue_account_approval_admin_emails\(text, text, text, text, text, text\) FROM PUBLIC, anon, authenticated/
    );
    expect(sql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.enqueue_account_approval_admin_emails\(text, text, text, text, text, text\) TO service_role/
    );
    expect(sql).not.toMatch(/TO anon, authenticated/);
    expect(sql).toMatch(/'https:\/\/cpprayer\.cp-church\.org\/admin'/);
    expect(sql).toMatch(/'http:\/\/localhost:4200\/admin'/);
    expect(sql).not.toMatch(/\[:space:\]/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS admin_notified_at/);
    expect(sql).toMatch(/r\.admin_notified_at <= now\(\) - interval '1 hour'/);
    expect(sql).not.toMatch(/q\.status IN \('pending', 'processing'\)/);
  });
});
