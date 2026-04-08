import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart } from 'chart.js/auto';
import {
  AnalyticsService,
  PageViewTimeSeriesPoint,
  PageViewTimeSeriesPreset
} from '../../services/analytics.service';

type ChartDisplayMode = 'bar' | 'line';

@Component({
  selector: 'app-site-analytics-activity-chart',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6"
      role="region"
      aria-label="Site activity over time"
    >
      <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-4">
        <div>
          <h4 class="text-base font-medium text-gray-800 dark:text-gray-100">
            Activity over time
          </h4>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xl">
            Logged-in usage only; each point is sampled about once every 5 minutes per user, not every
            page view.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-gray-500 dark:text-gray-400 sr-only sm:not-sr-only sm:mr-1"
            >Range</span
          >
          <div class="flex flex-wrap gap-1" role="group" aria-label="Time range">
            @for (p of presets; track p.value) {
              <button
                type="button"
                (click)="onPresetChange(p.value)"
                [class]="presetButtonClass(p.value)"
                [attr.aria-pressed]="preset === p.value"
              >
                {{ p.label }}
              </button>
            }
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2 mb-4">
        <span class="text-xs text-gray-500 dark:text-gray-400">Chart</span>
        <div class="flex rounded-lg border border-gray-200 dark:border-gray-600 overflow-hidden">
          <button
            type="button"
            (click)="onDisplayModeChange('bar')"
            [class]="displayModeButtonClass('bar')"
            aria-label="Bar chart"
          >
            Bar
          </button>
          <button
            type="button"
            (click)="onDisplayModeChange('line')"
            [class]="displayModeButtonClass('line')"
            aria-label="Line chart"
          >
            Line
          </button>
        </div>
      </div>

      @if (loading) {
        <div class="flex justify-center py-12">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }

      @if (!loading && series.length > 0) {
        <div class="relative w-full h-64 min-h-[240px]">
          <canvas #chartCanvas class="max-w-full"></canvas>
        </div>
      }
    </div>
  `
})
export class SiteAnalyticsActivityChartComponent implements AfterViewInit, OnDestroy {
  @ViewChild('chartCanvas') private chartCanvas?: ElementRef<HTMLCanvasElement>;

  readonly presets: { value: PageViewTimeSeriesPreset; label: string }[] = [
    { value: '12h', label: '12h' },
    { value: '24h', label: '24h' },
    { value: '48h', label: '2d' },
    { value: '7d', label: '7d' },
    { value: '30d', label: '30d' },
    { value: '90d', label: '90d' },
    { value: '180d', label: '180d' },
    { value: '365d', label: '365d' }
  ];

  preset: PageViewTimeSeriesPreset = '24h';
  displayMode: ChartDisplayMode = 'bar';
  loading = true;
  series: PageViewTimeSeriesPoint[] = [];

  private chart: Chart | null = null;

  private readonly analytics = inject(AnalyticsService);
  private readonly cdr = inject(ChangeDetectorRef);

  ngAfterViewInit(): void {
    void this.load();
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  presetButtonClass(value: PageViewTimeSeriesPreset): string {
    const base =
      'px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer border';
    if (this.preset === value) {
      return `${base} bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500`;
    }
    return `${base} bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700`;
  }

  displayModeButtonClass(mode: ChartDisplayMode): string {
    const base = 'px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer';
    if (this.displayMode === mode) {
      return `${base} bg-blue-600 text-white dark:bg-blue-500`;
    }
    return `${base} bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700`;
  }

  onPresetChange(value: PageViewTimeSeriesPreset): void {
    if (this.preset === value) return;
    this.preset = value;
    void this.load();
  }

  onDisplayModeChange(mode: ChartDisplayMode): void {
    if (this.displayMode === mode) return;
    this.displayMode = mode;
    if (this.series.length > 0) {
      this.renderChart();
    }
  }

  private async load(): Promise<void> {
    this.loading = true;
    this.destroyChart();
    this.cdr.markForCheck();

    try {
      this.series = await this.analytics.getPageViewTimeSeries(this.preset);
    } finally {
      this.loading = false;
      this.cdr.detectChanges();
      this.renderChart();
    }
  }

  private destroyChart(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  private isHourlyPreset(): boolean {
    return this.preset === '12h' || this.preset === '24h' || this.preset === '48h';
  }

  /** Day-based presets spanning months or years — include year on axis labels. */
  private isLongDayRangePreset(): boolean {
    return this.preset === '90d' || this.preset === '180d' || this.preset === '365d';
  }

  private formatLabel(iso: string): string {
    const d = new Date(iso);
    if (this.isHourlyPreset()) {
      return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric' });
    }
    if (this.isLongDayRangePreset()) {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  private chartColors() {
    const root = document.documentElement;
    const dark = root.classList.contains('dark');
    return {
      grid: dark ? 'rgba(148, 163, 184, 0.25)' : 'rgba(148, 163, 184, 0.4)',
      ticks: dark ? '#94a3b8' : '#64748b',
      fill: dark ? 'rgba(59, 130, 246, 0.35)' : 'rgba(37, 99, 235, 0.25)',
      stroke: dark ? '#60a5fa' : '#2563eb'
    };
  }

  private renderChart(): void {
    if (this.loading || this.series.length === 0) return;
    const canvas = this.chartCanvas?.nativeElement;
    if (!canvas) return;

    this.destroyChart();
    const colors = this.chartColors();
    const labels = this.series.map((p) => this.formatLabel(p.bucketStart));
    const values = this.series.map((p) => p.count);

    const datasets =
      this.displayMode === 'bar'
        ? [
            {
              label: 'Activity',
              data: values,
              backgroundColor: colors.fill,
              borderColor: colors.stroke,
              borderWidth: 1
            }
          ]
        : [
            {
              label: 'Activity',
              data: values,
              borderColor: colors.stroke,
              backgroundColor: colors.fill,
              fill: true,
              tension: 0.25,
              pointRadius: 2,
              pointHoverRadius: 4
            }
          ];

    this.chart = new Chart(canvas, {
      type: this.displayMode,
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => {
                const i = items[0]?.dataIndex ?? 0;
                const pt = this.series[i];
                return pt ? new Date(pt.bucketStart).toLocaleString() : '';
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: colors.grid },
            ticks: {
              color: colors.ticks,
              maxRotation: 45,
              autoSkip: true,
              maxTicksLimit: this.isHourlyPreset() ? 12 : this.isLongDayRangePreset() ? 16 : 10
            }
          },
          y: {
            beginAtZero: true,
            grid: { color: colors.grid },
            ticks: {
              color: colors.ticks,
              precision: 0
            }
          }
        }
      }
    });
    this.cdr.markForCheck();
  }
}
