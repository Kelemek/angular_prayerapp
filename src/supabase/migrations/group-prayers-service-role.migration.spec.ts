import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 20261020180000_group_prayers_service_role_grants.sql', () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20261020180000_group_prayers_service_role_grants.sql',
    ),
    'utf8',
  );

  it('grants service_role read access for notify-group-activity prayer loads', () => {
    expect(sql).toContain('GRANT SELECT ON TABLE public.group_prayers TO service_role');
    expect(sql).toContain(
      'GRANT SELECT ON TABLE public.group_prayer_updates TO service_role',
    );
  });
});
