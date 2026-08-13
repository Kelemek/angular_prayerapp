import { describe, it, expect } from 'vitest';
import { PrayerUpdateActionsComponent } from './prayer-update-actions.component';
import { PRAYER_CARD_META_HEADER_ICON_SIZE_CLASSES } from '../../lib/prayer-card-layout';

describe('PrayerUpdateActionsComponent', () => {
  it('sm bandSize uses home meta header icon tokens', () => {
    const component = new PrayerUpdateActionsComponent();
    component.bandSize = 'sm';
    component.update = {
      id: 'u1',
      content: 'Test',
      created_at: '2024-01-01T00:00:00Z',
    };

    expect(component.iconSizeClasses).toBe(
      PRAYER_CARD_META_HEADER_ICON_SIZE_CLASSES
    );
    expect(component.hostClasses).toContain('gap-[2px]');
  });
});
