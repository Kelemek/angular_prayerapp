import type { AnalyticsStats } from '../services/analytics.service';

export type AdminAnalyticsAccent = 'blue' | 'green' | 'gold' | 'memorize';

export type AdminAnalyticsStatKey = keyof Omit<AnalyticsStats, 'loading'>;

export type AdminAnalyticsTileIcon =
  | 'eye'
  | 'calendar-week'
  | 'trending'
  | 'clock-year'
  | 'users-all'
  | 'heart'
  | 'check-circle'
  | 'check'
  | 'archive'
  | 'subscribers'
  | 'book'
  | 'book-open'
  | 'practice-clock'
  | 'mastered';

export interface AdminAnalyticsTileDef {
  statKey: AdminAnalyticsStatKey;
  label: string;
  subtitle: string;
  accent: AdminAnalyticsAccent;
  icon: AdminAnalyticsTileIcon;
}

export interface AdminAnalyticsTileView extends AdminAnalyticsTileDef {
  value: number;
}

export const ADMIN_SITE_ANALYTICS_TILES: readonly AdminAnalyticsTileDef[] = [
  { statKey: 'todayPageViews', label: 'Today', subtitle: 'page views', accent: 'blue', icon: 'eye' },
  { statKey: 'weekPageViews', label: 'This Week', subtitle: 'page views', accent: 'blue', icon: 'calendar-week' },
  { statKey: 'monthPageViews', label: 'This Month', subtitle: 'page views', accent: 'blue', icon: 'trending' },
  { statKey: 'yearPageViews', label: 'This Year', subtitle: 'page views', accent: 'blue', icon: 'clock-year' },
  {
    statKey: 'totalPageViews',
    label: 'All Time',
    subtitle: 'total page views',
    accent: 'blue',
    icon: 'users-all',
  },
  { statKey: 'totalPrayers', label: 'Total Prayers', subtitle: 'in database', accent: 'green', icon: 'heart' },
  { statKey: 'currentPrayers', label: 'Current', subtitle: 'active prayers', accent: 'green', icon: 'check-circle' },
  { statKey: 'answeredPrayers', label: 'Answered', subtitle: 'answered prayers', accent: 'green', icon: 'check' },
  { statKey: 'archivedPrayers', label: 'Archived', subtitle: 'archived prayers', accent: 'green', icon: 'archive' },
  {
    statKey: 'totalSubscribers',
    label: 'Subscribers',
    subtitle: 'total subscribers',
    accent: 'gold',
    icon: 'subscribers',
  },
  {
    statKey: 'memorizationTotal',
    label: 'Total',
    subtitle: 'memorized verses',
    accent: 'memorize',
    icon: 'book',
  },
  {
    statKey: 'memorizationLearning',
    label: 'Learning',
    subtitle: 'memorized verses',
    accent: 'memorize',
    icon: 'book-open',
  },
  {
    statKey: 'memorizationPracticing',
    label: 'Practicing',
    subtitle: 'memorized verses',
    accent: 'memorize',
    icon: 'practice-clock',
  },
  {
    statKey: 'memorizationMastered',
    label: 'Mastered',
    subtitle: 'memorized verses',
    accent: 'memorize',
    icon: 'mastered',
  },
];

export const ADMIN_ANALYTICS_ACCENT_CLASSES: Record<
  AdminAnalyticsAccent,
  { border: string; icon: string; value: string }
> = {
  blue: {
    border: 'border-l-[#0047AB]',
    icon: 'text-[#0047AB] dark:text-[#7BA3D9]',
    value: 'text-[#0047AB] dark:text-[#7BA3D9]',
  },
  green: {
    border: 'border-l-[#2F5F54]',
    icon: 'text-[#2F5F54] dark:text-[#8FB9A8]',
    value: 'text-[#2F5F54] dark:text-[#8FB9A8]',
  },
  gold: {
    border: 'border-l-[#C9A961]',
    icon: 'text-[#6B6256] dark:text-[#D4AF85]',
    value: 'text-[#6B6256] dark:text-[#D4AF85]',
  },
  memorize: {
    border: 'border-l-[#3E5266]',
    icon: 'text-[#3E5266] dark:text-[#A8B8C8]',
    value: 'text-[#3E5266] dark:text-[#A8B8C8]',
  },
};

export function buildAdminAnalyticsTileViews(stats: AnalyticsStats): AdminAnalyticsTileView[] {
  return ADMIN_SITE_ANALYTICS_TILES.map((def) => ({
    ...def,
    value: stats[def.statKey],
  }));
}
