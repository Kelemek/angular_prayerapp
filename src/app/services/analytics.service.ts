import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface AnalyticsStats {
  todayPageViews: number;
  weekPageViews: number;
  monthPageViews: number;
  totalPageViews: number;
  totalPrayers: number;
  totalSubscribers: number;
  loading: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  constructor(private supabase: SupabaseService) {}

  async getStats(): Promise<AnalyticsStats> {
    const stats: AnalyticsStats = {
      todayPageViews: 0,
      weekPageViews: 0,
      monthPageViews: 0,
      totalPageViews: 0,
      totalPrayers: 0,
      totalSubscribers: 0,
      loading: false
    };

    try {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Total page views
      const { count: total, error: totalError } = await this.supabase.client
        .from('analytics')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'page_view');

      if (totalError) {
        console.error('Error fetching total page views:', totalError);
      } else {
        stats.totalPageViews = total || 0;
      }

      // Today's page views
      const { count: today, error: todayError } = await this.supabase.client
        .from('analytics')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'page_view')
        .gte('created_at', todayStart.toISOString());

      if (todayError) {
        console.error('Error fetching today page views:', todayError);
      } else {
        stats.todayPageViews = today || 0;
      }

      // Week's page views
      const { count: week, error: weekError } = await this.supabase.client
        .from('analytics')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'page_view')
        .gte('created_at', weekStart.toISOString());

      if (weekError) {
        console.error('Error fetching week page views:', weekError);
      } else {
        stats.weekPageViews = week || 0;
      }

      // Month's page views
      const { count: month, error: monthError } = await this.supabase.client
        .from('analytics')
        .select('*', { count: 'exact', head: true })
        .eq('event_type', 'page_view')
        .gte('created_at', monthStart.toISOString());

      if (monthError) {
        console.error('Error fetching month page views:', monthError);
      } else {
        stats.monthPageViews = month || 0;
      }

      // Get total prayers count
      const { count: prayersCount, error: prayersError } = await this.supabase.client
        .from('prayers')
        .select('*', { count: 'exact', head: true });

      if (prayersError) {
        console.error('Error fetching prayers count:', prayersError);
      } else {
        stats.totalPrayers = prayersCount || 0;
      }

      // Get total subscribers (both active and inactive)
      const { count: subscribersCount, error: subscribersError } = await this.supabase.client
        .from('email_subscribers')
        .select('*', { count: 'exact', head: true });

      if (subscribersError) {
        console.error('Error fetching subscribers count:', subscribersError);
      } else {
        stats.totalSubscribers = subscribersCount || 0;
      }

    } catch (error) {
      console.error('Error fetching analytics stats:', error);
    }

    return stats;
  }
}
