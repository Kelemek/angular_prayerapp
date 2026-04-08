import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { SiteAnalyticsActivityChartComponent } from './site-analytics-activity-chart.component';
import { AnalyticsService } from '../../services/analytics.service';

const chartMock = vi.hoisted(() => vi.fn());

vi.mock('chart.js/auto', () => ({
  Chart: class MockChart {
    destroy = vi.fn();
    update = vi.fn();
    constructor(..._args: unknown[]) {
      chartMock(..._args);
    }
  }
}));

describe('SiteAnalyticsActivityChartComponent', () => {
  let getPageViewTimeSeries: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    chartMock.mockClear();

    getPageViewTimeSeries = vi.fn().mockResolvedValue(
      Array.from({ length: 3 }, (_, i) => ({
        bucketStart: `2024-01-0${i + 1}T12:00:00.000Z`,
        count: i,
        approvalCount: 0,
        approvalLabels: ''
      }))
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create and load time series', async () => {
    await render(SiteAnalyticsActivityChartComponent, {
      providers: [
        {
          provide: AnalyticsService,
          useValue: { getPageViewTimeSeries }
        }
      ]
    });

    expect(await screen.findByRole('region', { name: /activity over time/i })).toBeTruthy();
    expect(getPageViewTimeSeries).toHaveBeenCalledWith('24h');
    expect(chartMock).toHaveBeenCalled();
  });

  it('should refetch when a different range preset is selected', async () => {
    const user = userEvent.setup();
    await render(SiteAnalyticsActivityChartComponent, {
      providers: [
        {
          provide: AnalyticsService,
          useValue: { getPageViewTimeSeries }
        }
      ]
    });

    await screen.findByRole('region', { name: /activity over time/i });
    const initialCalls = getPageViewTimeSeries.mock.calls.length;

    await user.click(screen.getByRole('button', { name: '7d' }));

    expect(getPageViewTimeSeries.mock.calls.length).toBeGreaterThan(initialCalls);
    expect(getPageViewTimeSeries).toHaveBeenCalledWith('7d');
  });

  it('should render canvas for chart', async () => {
    const { container } = await render(SiteAnalyticsActivityChartComponent, {
      providers: [
        {
          provide: AnalyticsService,
          useValue: { getPageViewTimeSeries }
        }
      ]
    });

    await screen.findByRole('region', { name: /activity over time/i });
    expect(container.querySelector('canvas')).toBeTruthy();
  });
});
