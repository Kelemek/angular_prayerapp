import { describe, it, expect } from 'vitest';
import {
  buildAdminAnalyticsTileViews,
  ADMIN_SITE_ANALYTICS_TILES,
} from './admin-analytics-tiles';
import type { AnalyticsStats } from '../services/analytics.service';

const stubStats = (): AnalyticsStats => ({
  todayPageViews: 1,
  weekPageViews: 2,
  monthPageViews: 3,
  yearPageViews: 4,
  totalPageViews: 5,
  totalPrayers: 6,
  currentPrayers: 7,
  answeredPrayers: 8,
  archivedPrayers: 9,
  totalSubscribers: 10,
  memorizationTotal: 11,
  memorizationLearning: 12,
  memorizationPracticing: 13,
  memorizationMastered: 14,
  loading: false,
});

describe('admin-analytics-tiles', () => {
  it('maps every catalog tile to a numeric value', () => {
    const views = buildAdminAnalyticsTileViews(stubStats());
    expect(views.length).toBe(ADMIN_SITE_ANALYTICS_TILES.length);
    expect(views[0]).toMatchObject({ label: 'Today', value: 1 });
    expect(views.at(-1)?.value).toBe(14);
  });
});
