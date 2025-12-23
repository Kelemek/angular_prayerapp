import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface AnalyticsStats {
  todayPageViews: number;
  weekPageViews: number;
  monthPageViews: number;
  yearPageViews: number;
  totalPageViews: number;
  totalPrayers: number;
  currentPrayers: number;
  answeredPrayers: number;
  archivedPrayers: number;
  totalSubscribers: number;
  activeEmailSubscribers: number;
  loading: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  constructor(private supabase: SupabaseService) {}

  /**
   * Track a page view by recording it to the analytics table
   * Should be called from main site pages only, not from admin routes
   */
  async trackPageView(): Promise<void> {
    try {
      const insertData = {
        event_type: 'page_view',
        event_data: {
          timestamp: new Date().toISOString(),
          path: window.location.pathname,
          hash: window.location.hash
        }
      };
      
      const result = await this.supabase.client.from('analytics').insert(insertData);
      
      if (result.error) {
        console.error('[Analytics] Insert error:', result.error);
      }
    } catch (error) {
      console.error('[Analytics] Tracking failed:', error);
    }
  }

  async getStats(): Promise<AnalyticsStats> {
    const stats: AnalyticsStats = {
      todayPageViews: 0,
      weekPageViews: 0,
      monthPageViews: 0,
      yearPageViews: 0,
      totalPageViews: 0,
      totalPrayers: 0,
      currentPrayers: 0,
      answeredPrayers: 0,
      archivedPrayers: 0,
      totalSubscribers: 0,
      activeEmailSubscribers: 0,
      loading: true
    };

    try {
      const now = new Date();
      
      // Today: from 12 AM to 12 AM (00:00:00 to 23:59:59.999) local time
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      // Week: Sunday 12 AM to current time (current calendar week)
      const weekStart = new Date();
      const dayOfWeek = weekStart.getDay(); // 0 = Sunday
      weekStart.setDate(weekStart.getDate() - dayOfWeek);
      weekStart.setHours(0, 0, 0, 0);
      
      // Month: 1st of current month 12 AM to current time
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      // Year: Jan 1 of current year 12 AM to current time
      const yearStart = new Date();
      yearStart.setMonth(0); // January
      yearStart.setDate(1);
      yearStart.setHours(0, 0, 0, 0);

      // Convert local times to ISO strings for database queries
      // The database stores created_at in UTC, but we need to query based on local time
      const todayStartISO = todayStart.toISOString();
      const weekStartISO = weekStart.toISOString();
      const monthStartISO = monthStart.toISOString();
      const yearStartISO = yearStart.toISOString();

      // Execute all queries in parallel for better performance
      const [
        totalResult,
        todayResult,
        weekResult,
        monthResult,
        yearResult,
        prayersResult,
        currentPrayersResult,
        answeredPrayersResult,
        archivedPrayersResult,
        subscribersResult,
        activeSubscribersResult
      ] = await Promise.all([
        // Total page views
        this.supabase.client
          .from('analytics')
          .select('*', { count: 'exact', head: true })
          .eq('event_type', 'page_view'),

        // Today's page views
        this.supabase.client
          .from('analytics')
          .select('*', { count: 'exact', head: true })
          .eq('event_type', 'page_view')
          .gte('created_at', todayStartISO),

        // Week's page views (current calendar week - Sunday to now)
        this.supabase.client
          .from('analytics')
          .select('*', { count: 'exact', head: true })
          .eq('event_type', 'page_view')
          .gte('created_at', weekStartISO),

        // Month's page views (current calendar month - 1st to now)
        this.supabase.client
          .from('analytics')
          .select('*', { count: 'exact', head: true })
          .eq('event_type', 'page_view')
          .gte('created_at', monthStartISO),

        // Year's page views (current year - Jan 1 to now)
        this.supabase.client
          .from('analytics')
          .select('*', { count: 'exact', head: true })
          .eq('event_type', 'page_view')
          .gte('created_at', yearStartISO),

        // Total prayers count
        this.supabase.client
          .from('prayers')
          .select('*', { count: 'exact', head: true }),

        // Current prayers (status = 'current')
        this.supabase.client
          .from('prayers')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'current'),

        // Answered prayers (status = 'answered')
        this.supabase.client
          .from('prayers')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'answered'),

        // Archived prayers (status = 'archived')
        this.supabase.client
          .from('prayers')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'archived'),

        // Total subscribers
        this.supabase.client
          .from('email_subscribers')
          .select('*', { count: 'exact', head: true }),

        // Active email subscribers (is_active = true)
        this.supabase.client
          .from('email_subscribers')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true)
      ]);

      // Process results
      if (totalResult.error) {
        console.error('Error fetching total page views:', totalResult.error);
      } else {
        stats.totalPageViews = totalResult.count || 0;
      }

      if (todayResult.error) {
        console.error('Error fetching today page views:', todayResult.error);
      } else {
        stats.todayPageViews = todayResult.count || 0;
      }

      if (weekResult.error) {
        console.error('Error fetching week page views:', weekResult.error);
      } else {
        stats.weekPageViews = weekResult.count || 0;
      }

      if (monthResult.error) {
        console.error('Error fetching month page views:', monthResult.error);
      } else {
        stats.monthPageViews = monthResult.count || 0;
      }

      if (yearResult.error) {
        console.error('Error fetching year page views:', yearResult.error);
      } else {
        stats.yearPageViews = yearResult.count || 0;
      }

      if (prayersResult.error) {
        console.error('Error fetching prayers count:', prayersResult.error);
      } else {
        stats.totalPrayers = prayersResult.count || 0;
      }

      if (currentPrayersResult.error) {
        console.error('Error fetching current prayers count:', currentPrayersResult.error);
      } else {
        stats.currentPrayers = currentPrayersResult.count || 0;
      }

      if (answeredPrayersResult.error) {
        console.error('Error fetching answered prayers count:', answeredPrayersResult.error);
      } else {
        stats.answeredPrayers = answeredPrayersResult.count || 0;
      }

      if (archivedPrayersResult.error) {
        console.error('Error fetching archived prayers count:', archivedPrayersResult.error);
      } else {
        stats.archivedPrayers = archivedPrayersResult.count || 0;
      }

      if (subscribersResult.error) {
        console.error('Error fetching subscribers count:', subscribersResult.error);
      } else {
        stats.totalSubscribers = subscribersResult.count || 0;
      }

      if (activeSubscribersResult.error) {
        console.error('Error fetching active subscribers count:', activeSubscribersResult.error);
      } else {
        stats.activeEmailSubscribers = activeSubscribersResult.count || 0;
      }

    } catch (error) {
      console.error('Error fetching analytics stats:', error);
    } finally {
      stats.loading = false;
    }

    return stats;
  }
}
