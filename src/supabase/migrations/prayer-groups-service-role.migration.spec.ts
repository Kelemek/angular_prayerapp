import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 20261018210000_prayer_groups_service_role_grants.sql', () => {
  const sql = readFileSync(
    join(process.cwd(), 'supabase/migrations/20261018210000_prayer_groups_service_role_grants.sql'),
    'utf8',
  );

  it('grants service_role read access for notify-group-activity', () => {
    expect(sql).toContain('GRANT SELECT ON TABLE public.prayer_groups TO service_role');
    expect(sql).toContain('GRANT SELECT ON TABLE public.prayer_group_members TO service_role');
  });
});
