import { describe, expect, it } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ADMIN_ANALYTICS_TILE_ICONS } from '../../lib/admin-analytics-tiles';
import {
  AdminAnalyticsStatTileComponent,
  assertAdminAnalyticsTileIcon,
} from './admin-analytics-stat-tile.component';

describe('AdminAnalyticsStatTileComponent', () => {
  it('draws a path for every tile icon', async () => {
    expect(ADMIN_ANALYTICS_TILE_ICONS.length).toBeGreaterThan(0);
    await TestBed.configureTestingModule({
      imports: [AdminAnalyticsStatTileComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(AdminAnalyticsStatTileComponent);
    fixture.componentRef.setInput('label', 'Today');
    fixture.componentRef.setInput('value', 1);
    fixture.componentRef.setInput('subtitle', 'page views');
    fixture.componentRef.setInput('accent', 'blue');

    for (const icon of ADMIN_ANALYTICS_TILE_ICONS) {
      assertAdminAnalyticsTileIcon(icon);
      fixture.componentRef.setInput('icon', icon);
      fixture.detectChanges();
      const drawn = fixture.nativeElement.querySelector(
        'svg path, svg circle, svg line, svg polyline, svg rect, svg polygon',
      );
      expect({ icon, drawn: drawn !== null }).toEqual({ icon, drawn: true });
    }
  });
});
