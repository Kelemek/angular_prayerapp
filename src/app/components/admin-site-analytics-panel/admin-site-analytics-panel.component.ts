import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import type { AnalyticsStats } from '../../services/analytics.service';
import { buildAdminAnalyticsTileViews } from '../../lib/admin-analytics-tiles';
import { AdminAnalyticsStatTileComponent } from '../admin-analytics-stat-tile/admin-analytics-stat-tile.component';
import { SiteAnalyticsActivityChartComponent } from '../site-analytics-activity-chart/site-analytics-activity-chart.component';

@Component({
  selector: 'app-admin-site-analytics-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AdminAnalyticsStatTileComponent, SiteAnalyticsActivityChartComponent],
  template: `
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <div class="flex items-center gap-2 mb-4">
        <svg
          class="text-blue-600 dark:text-blue-400"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
          <polyline points="17 6 23 6 23 12"></polyline>
        </svg>
        <h3 class="text-lg font-medium text-gray-800 dark:text-gray-100">Site Analytics</h3>
      </div>

      @if (stats.loading) {
        <div class="text-center py-4">
          <div
            class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"
            role="status"
            aria-label="Loading analytics"
          ></div>
        </div>
      } @else {
        <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-2">
          @for (tile of tileViews; track tile.statKey) {
            <app-admin-analytics-stat-tile
              [label]="tile.label"
              [value]="tile.value"
              [subtitle]="tile.subtitle"
              [accent]="tile.accent"
              [icon]="tile.icon"
            ></app-admin-analytics-stat-tile>
          }
        </div>
        <app-site-analytics-activity-chart></app-site-analytics-activity-chart>
      }
    </div>
  `,
})
export class AdminSiteAnalyticsPanelComponent {
  @Input({ required: true }) stats!: AnalyticsStats;

  get tileViews() {
    return buildAdminAnalyticsTileViews(this.stats);
  }
}
