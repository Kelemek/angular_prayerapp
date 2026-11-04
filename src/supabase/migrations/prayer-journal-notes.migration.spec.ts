import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('migration 20261104180000_prayer_journal_notes.sql', () => {
  const sql = readFileSync(
    join(process.cwd(), 'supabase/migrations/20261104180000_prayer_journal_notes.sql'),
    'utf8'
  );

  it('limits rows to the signed-in user and does not grant anon', () => {
    const ownerChecks = sql.match(/user_id = auth\.uid\(\)/g) ?? [];
    expect(ownerChecks.length).toBeGreaterThanOrEqual(4);
    expect(sql).toContain('TO authenticated');
    expect(sql).not.toMatch(/GRANT[^;]*\bTO anon\b/i);
    expect(sql).toContain('REVOKE ALL ON TABLE public.prayer_journal_notes FROM anon');
  });

  it('does not build SQL from note text', () => {
    expect(sql).not.toMatch(/\|\|/);
    expect(sql).not.toMatch(/format\s*\(/i);
    expect(sql).not.toMatch(/EXECUTE\s+['"`]/i);
    expect(sql).toContain('EXECUTE FUNCTION public.prayer_journal_notes_set_updated_at()');
    expect(sql).not.toContain('content ||');
  });
});
