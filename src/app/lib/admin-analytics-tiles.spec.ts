import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ADMIN_ANALYTICS_ACCENT_CLASSES,
  ADMIN_SITE_ANALYTICS_TILES,
  adminAnalyticsStatKeyLeavesLoadingFree,
  adminAnalyticsTileIconsCovered,
  buildAdminAnalyticsTileViews,
  emptyAdminAnalyticsStats,
} from './admin-analytics-tiles';
import {
  LEARNING_COMPLETED_BELOW,
  PRACTICING_COMPLETED_BELOW,
} from './memorization/memorization-mastery';

const GROUP_THEN_MEMORIZATION = [
  'totalSubscribers',
  'prayerGroups',
  'currentGroupPrayers',
  'answeredGroupPrayers',
  'totalGroupPrayers',
  'groupMembers',
  'groupNonMembers',
  'memorizationTotal',
  'memorizationLearning',
  'memorizationPracticing',
  'memorizationMastered',
] as const;

describe('admin-analytics-tiles', () => {
  it('places group tiles after Subscribers and memorization tiles after those', () => {
    const keys = ADMIN_SITE_ANALYTICS_TILES.map((tile) => tile.statKey);
    const subscribers = keys.indexOf('totalSubscribers');
    expect(keys.slice(subscribers, subscribers + GROUP_THEN_MEMORIZATION.length)).toEqual([
      ...GROUP_THEN_MEMORIZATION,
    ]);
    expect(keys.at(-1)).toBe('memorizationMastered');
    expect(new Set(keys).size).toBe(keys.length);
    expect(adminAnalyticsTileIconsCovered).toBe(true);
    expect(adminAnalyticsStatKeyLeavesLoadingFree).toBe(true);
  });

  it('labels the six group tiles', () => {
    const byKey = new Map(ADMIN_SITE_ANALYTICS_TILES.map((tile) => [tile.statKey, tile]));
    expect(byKey.get('prayerGroups')).toMatchObject({
      label: 'Groups',
      subtitle: 'prayer groups',
      icon: 'groups',
      accent: 'group',
    });
    expect(byKey.get('currentGroupPrayers')).toMatchObject({
      label: 'Current',
      subtitle: 'group prayers',
      icon: 'check-circle',
      accent: 'group',
    });
    expect(byKey.get('answeredGroupPrayers')).toMatchObject({
      label: 'Answered',
      subtitle: 'group prayers',
      icon: 'check',
      accent: 'group',
    });
    expect(byKey.get('totalGroupPrayers')).toMatchObject({
      label: 'Total',
      subtitle: 'group prayers',
      icon: 'heart',
      accent: 'group',
    });
    expect(byKey.get('groupMembers')).toMatchObject({
      label: 'Members',
      subtitle: 'church members',
      icon: 'users',
      accent: 'group',
    });
    expect(byKey.get('groupNonMembers')).toMatchObject({
      label: 'Non-members',
      subtitle: 'group-only people',
      icon: 'user-x',
      accent: 'group',
    });
    expect(ADMIN_ANALYTICS_ACCENT_CLASSES.group).toEqual({
      border: 'border-l-[#5C4B70]',
      icon: 'text-[#5C4B70] dark:text-[#C4B6D4]',
      value: 'text-[#5C4B70] dark:text-[#C4B6D4]',
    });
  });

  it('maps every catalog tile to its value', () => {
    const stats = emptyAdminAnalyticsStats(false);
    ADMIN_SITE_ANALYTICS_TILES.forEach((tile, index) => {
      stats[tile.statKey] = index + 1;
    });
    const views = buildAdminAnalyticsTileViews(stats);
    expect(views.map((view) => view.value)).toEqual(
      ADMIN_SITE_ANALYTICS_TILES.map((_, index) => index + 1),
    );
    expect(views[0]?.value).toBe(1);
    expect(views.at(-1)?.value).toBe(ADMIN_SITE_ANALYTICS_TILES.length);
  });

  it('starts every card at 0', () => {
    const loading = emptyAdminAnalyticsStats(true);
    expect(loading.loading).toBe(true);
    for (const tile of ADMIN_SITE_ANALYTICS_TILES) {
      expect(loading[tile.statKey]).toBe(0);
    }
    expect(emptyAdminAnalyticsStats(false).loading).toBe(false);
  });

  it('matches migration jsonb keys and mastery bounds to the catalog', () => {
    const sql = readFileSync(
      join(process.cwd(), 'supabase/migrations/20261031180000_admin_site_analytics_stats.sql'),
      'utf8',
    ).split('-- ROLLBACK')[0] ?? '';
    const keys: string[] = [];
    for (const call of sql.matchAll(/jsonb_build_object\(([^)]*)\)/g)) {
      for (const key of (call[1] ?? '').matchAll(/'([^']+)'/g)) {
        keys.push(key[1] ?? '');
      }
    }
    const catalog = ADMIN_SITE_ANALYTICS_TILES.map((tile) => tile.statKey);
    expect(new Set(keys)).toEqual(new Set(catalog));
    expect(keys).toHaveLength(catalog.length);
    expect(sql).toContain(`completed_count < ${LEARNING_COMPLETED_BELOW}`);
    expect(sql).toContain(`completed_count < ${PRACTICING_COMPLETED_BELOW}`);
  });
});
