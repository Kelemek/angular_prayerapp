import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 20261021280000_email_queue_skip_ineligible_church_mail.sql', () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20261021280000_email_queue_skip_ineligible_church_mail.sql'
    ),
    'utf8'
  );
  const executable = sql.split('-- ROLLBACK')[0];
  const processor = readFileSync(
    join(process.cwd(), 'scripts/process-email-queue.ts'),
    'utf8'
  );

  it('skips ineligible church mail without raising', () => {
    expect(executable).toContain('RETURN NULL');
    expect(executable).toContain("'approved_prayer'");
    expect(executable).toContain("'prayer_answered'");
    expect(executable).toContain("'verse_memorization_prayer'");
    expect(executable).toContain("'admin_subscriber_manual_broadcast'");
    expect(executable).toContain('Rule 7b');
    expect(executable).not.toContain("RAISE EXCEPTION");
    expect(executable).toContain('SET search_path = public, pg_temp');
    expect(processor).not.toContain('shouldSkipChurchQueueRow');
    expect(processor).not.toContain('loadRecipientChurchFlags');
  });
});
