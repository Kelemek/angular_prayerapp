import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 20260710120000_email_templates_outlook_desktop_safe.sql still contains the
 * historical "Cross Point" heading in its INSERT/UPDATE DDL; do not edit applied
 * migrations. This migration corrects live rows; enforced here.
 */
describe('migration 20261119150000_subscriber_welcome_heading_typo.sql', () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20261119150000_subscriber_welcome_heading_typo.sql',
    ),
    'utf8',
  );

  it('fixes subscriber_welcome heading typo idempotently', () => {
    expect(sql).toContain("'subscriber_welcome'");
    expect(sql).toContain(
      "replace(html_body, 'Cross Point Prayer Community', 'Cross Pointe Prayer Community')",
    );
    expect(sql).toContain("%Cross Point Prayer Community%");
  });
});