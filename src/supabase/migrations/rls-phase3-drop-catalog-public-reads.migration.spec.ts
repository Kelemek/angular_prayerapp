import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('migration 20261017140000_rls_phase3_drop_catalog_public_reads.sql', () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      'supabase/migrations/20261017140000_rls_phase3_drop_catalog_public_reads.sql'
    ),
    'utf8'
  );
  const executable = sql.split('-- ROLLBACK')[0];

  it('drops the three public read policies only after their signed-in replacements exist', () => {
    expect(executable).toMatch(/DROP POLICY IF EXISTS %I ON public\.%I/);
    expect(executable).toContain('Allow public reads on memorization_recommendations');
    expect(executable).toContain('Allow public reads on memorization_recommendation_categories');
    expect(executable).toContain('Allow public reads on booklet_insert_pages');
    expect(executable).toContain('memorization_recommendations_select_authenticated');
    expect(executable).toContain('memorization_recommendation_categories_select_authenticated');
    expect(executable).toContain('booklet_insert_pages_authenticated_read');
    expect(executable).toMatch(/RAISE EXCEPTION 'missing replacement policy/);
    expect(executable).not.toMatch(
      /DROP POLICY[^;\n]*memorization_recommendations_select_authenticated/
    );
    expect(executable).not.toMatch(
      /DROP POLICY[^;\n]*memorization_recommendation_categories_select_authenticated/
    );
    expect(executable).not.toMatch(
      /DROP POLICY[^;\n]*booklet_insert_pages_authenticated_read/
    );
  });

  it('comments a rollback that restores anon and authenticated select', () => {
    const rollback = sql.split('-- ROLLBACK')[1] ?? '';
    expect(rollback).toMatch(
      /CREATE POLICY "Allow public reads on memorization_recommendations"[\s\S]*TO anon, authenticated/
    );
    expect(rollback).toMatch(
      /CREATE POLICY "Allow public reads on memorization_recommendation_categories"[\s\S]*TO anon, authenticated/
    );
    expect(rollback).toMatch(
      /CREATE POLICY "Allow public reads on booklet_insert_pages"[\s\S]*TO anon, authenticated/
    );
  });
});
