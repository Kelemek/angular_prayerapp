import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('migration 20261020120000_prayer_group_color.sql', () => {
  const sql = readFileSync(
    join(process.cwd(), 'supabase/migrations/20261020120000_prayer_group_color.sql'),
    'utf8',
  );

  it('adds prayer_groups.color with hex check', () => {
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS color text NOT NULL DEFAULT');
    expect(sql).toContain('prayer_groups_color_check');
    expect(sql).toContain("color ~ '^#[0-9A-Fa-f]{6}$'");
  });

  it('extends create and rename RPCs for color', () => {
    expect(sql).toContain('normalize_prayer_group_hex_color');
    expect(sql).toContain('create_prayer_group(p_name text, p_color text');
    expect(sql).toContain('INSERT INTO public.prayer_groups (name, created_by_email, color)');
    expect(sql).toContain('rename_prayer_group(');
    expect(sql).toContain('p_color text DEFAULT NULL');
    expect(sql).toContain('update_prayer_group_color(');
  });
});
