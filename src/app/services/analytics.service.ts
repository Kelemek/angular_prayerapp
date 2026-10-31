import { Injectable } from '@angular/core';
import {
  ADMIN_SITE_ANALYTICS_TILES,
  emptyAdminAnalyticsStats,
  type AdminAnalyticsStatKey,
  type AnalyticsStats,
} from '../lib/admin-analytics-tiles';
import { SupabaseService } from './supabase.service';
import { UserSessionService } from './user-session.service';

/** Presets for Site Analytics activity chart (maps to window + RPC bucket). */
export type PageViewTimeSeriesPreset =
  | '12h'
  | '24h'
  | '48h'
  | '7d'
  | '30d'
  | '90d'
  | '180d'
  | '365d';

export interface PageViewTimeSeriesPoint {
  bucketStart: string;
  /** Logged-in activity samples (page_view) for this bucket. */
  count: number;
  /** Approved prayers + updates in this bucket (subscriber bulk send at approval). */
  approvalCount: number;
  /** First 8 titles, newline-separated; "+ N more" if count > 8. */
  approvalLabels: string;
}

const PAGE_VIEW_PRESET_MS: Record<PageViewTimeSeriesPreset, number> = {
  '12h': 12 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '48h': 48 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
  '180d': 180 * 24 * 60 * 60 * 1000,
  '365d': 365 * 24 * 60 * 60 * 1000
};

const PAGE_VIEW_PRESET_BUCKET: Record<PageViewTimeSeriesPreset, 'hour' | 'day'> = {
  '12h': 'hour',
  '24h': 'hour',
  '48h': 'hour',
  '7d': 'day',
  '30d': 'day',
  '90d': 'day',
  '180d': 'day',
  '365d': 'day'
};

/**
 * UTC bucket starts matching Postgres `date_trunc('hour'|'day', created_at)` with UTC session TZ.
 */
function enumerateUtcBucketStarts(
  rangeStart: Date,
  rangeEnd: Date,
  bucket: 'hour' | 'day'
): string[] {
  const keys: string[] = [];
  if (bucket === 'hour') {
    const cur = new Date(rangeStart);
    cur.setUTCMinutes(0, 0, 0);
    while (cur.getTime() < rangeEnd.getTime()) {
      keys.push(cur.toISOString());
      cur.setTime(cur.getTime() + 60 * 60 * 1000);
    }
  } else {
    const cur = new Date(
      Date.UTC(rangeStart.getUTCFullYear(), rangeStart.getUTCMonth(), rangeStart.getUTCDate())
    );
    while (cur.getTime() < rangeEnd.getTime()) {
      keys.push(cur.toISOString());
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  }
  return keys;
}

export interface AnalyticsWindowStarts {
  today: Date;
  week: Date;
  month: Date;
  year: Date;
}

export function analyticsWindowStarts(now: Date): AnalyticsWindowStarts {
  const today = new Date(now.getTime());
  today.setHours(0, 0, 0, 0);

  const week = new Date(now.getTime());
  week.setDate(week.getDate() - week.getDay());
  week.setHours(0, 0, 0, 0);

  const month = new Date(now.getTime());
  month.setDate(1);
  month.setHours(0, 0, 0, 0);

  const year = new Date(now.getTime());
  year.setMonth(0, 1);
  year.setHours(0, 0, 0, 0);

  return { today, week, month, year };
}

function finiteStat(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function countsFromAnalyticsPayload(payload: unknown): Record<AdminAnalyticsStatKey, number> {
  const body =
    payload !== null && typeof payload === 'object' && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : null;
  const counts = {} as Record<AdminAnalyticsStatKey, number>;
  for (const tile of ADMIN_SITE_ANALYTICS_TILES) {
    counts[tile.statKey] = finiteStat(body?.[tile.statKey]);
  }
  return counts;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  constructor(
    private supabase: SupabaseService,
    private userSession: UserSessionService
  ) {}

  /**
   * Track a page view and update user's last activity date
   * Only tracks logged-in users to prevent admin page views from skewing analytics
   * Inserts a record into the analytics table and updates email_subscribers last_activity_date
   * Both operations are throttled to every 5 minutes to reduce database writes
   * Should be called from main site pages only, not from admin routes
   */
  async trackPageView(): Promise<void> {
    try {
      // Only track logged-in users
      const session = this.userSession.getCurrentSession();
      const userEmail = session?.email || null;

      if (!userEmail) {
        return; // Don't track non-logged-in users or admin pages
      }

      // Check if we've already updated within the last 5 minutes
      const lastUpdateKey = `last_activity_update_${userEmail}`;
      const lastUpdateTime = localStorage.getItem(lastUpdateKey);
      const now = Date.now();
      const fiveMinutesMs = 5 * 60 * 1000;

      // Only update if no previous update or if 5+ minutes have passed
      if (lastUpdateTime && now - parseInt(lastUpdateTime) < fiveMinutesMs) {
        return; // Skip both operations - too recent
      }

      // Track the page view in analytics table
      await (await this.supabase.db())
        .from('analytics')
        .insert({
          event_type: 'page_view',
          event_data: {
            timestamp: new Date().toISOString(),
            url: typeof window !== 'undefined' ? window.location.pathname : null
          }
        });

      // Update the user's last activity date in email_subscribers
      await (await this.supabase.db())
        .from('email_subscribers')
        .update({ last_activity_date: new Date().toISOString() })
        .eq('email', userEmail);

      // Record the update time in localStorage
      localStorage.setItem(lastUpdateKey, String(now));
    } catch (error) {
      console.error('[Analytics] Failed to track page view:', error);
    }
  }

  async getStats(): Promise<AnalyticsStats> {
    const stats = emptyAdminAnalyticsStats(true);
    try {
      const bounds = analyticsWindowStarts(new Date());
      const { data, error } = await (await this.supabase.db()).rpc('admin_site_analytics_stats', {
        p_today: bounds.today.toISOString(),
        p_week: bounds.week.toISOString(),
        p_month: bounds.month.toISOString(),
        p_year: bounds.year.toISOString(),
      });
      if (error) {
        console.error('Error fetching analytics stats:', error);
      } else {
        Object.assign(stats, countsFromAnalyticsPayload(data));
      }
    } catch (error) {
      console.error('Error fetching analytics stats:', error);
    } finally {
      stats.loading = false;
    }
    return stats;
  }

  /**
   * Activity samples and approval events per time bucket for the Site Analytics chart.
   */
  async getPageViewTimeSeries(preset: PageViewTimeSeriesPreset): Promise<PageViewTimeSeriesPoint[]> {
    const rangeEnd = new Date();
    const rangeStart = new Date(rangeEnd.getTime() - PAGE_VIEW_PRESET_MS[preset]);
    const bucket = PAGE_VIEW_PRESET_BUCKET[preset];
    const bucketKeys = enumerateUtcBucketStarts(rangeStart, rangeEnd, bucket);
    const pStart = rangeStart.toISOString();
    const pEnd = rangeEnd.toISOString();

    const [pvResult, apResult] = await Promise.all([
      (await this.supabase.db()).rpc('analytics_page_view_buckets', {
        p_start: pStart,
        p_end: pEnd,
        p_bucket: bucket
      }),
      (await this.supabase.db()).rpc('analytics_approval_buckets', {
        p_start: pStart,
        p_end: pEnd,
        p_bucket: bucket
      })
    ]);

    if (pvResult.error) {
      console.error('[Analytics] getPageViewTimeSeries page views:', pvResult.error);
    }
    if (apResult.error) {
      console.error('[Analytics] getPageViewTimeSeries approvals:', apResult.error);
    }

    const counts = new Map<string, number>();
    for (const row of pvResult.data ?? []) {
      const key = new Date(row.bucket_start as string).toISOString();
      counts.set(key, Number(row.event_count));
    }

    const approvals = new Map<string, { count: number; labels: string }>();
    for (const row of apResult.data ?? []) {
      const key = new Date(row.bucket_start as string).toISOString();
      approvals.set(key, {
        count: Number(row.approval_count),
        labels: String(row.approval_labels ?? '')
      });
    }

    return bucketKeys.map((bucketStart) => {
      const ap = approvals.get(bucketStart);
      return {
        bucketStart,
        count: pvResult.error ? 0 : (counts.get(bucketStart) ?? 0),
        approvalCount: apResult.error ? 0 : (ap?.count ?? 0),
        approvalLabels: apResult.error ? '' : (ap?.labels ?? '')
      };
    });
  }
}
