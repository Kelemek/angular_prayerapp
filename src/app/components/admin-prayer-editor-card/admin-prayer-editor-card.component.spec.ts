import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminPrayerEditorCardComponent } from './admin-prayer-editor-card.component';
import { EMPTY_PRAYER_EDITOR_NEW_UPDATE } from '../../lib/admin-prayer-editor-types';

describe('AdminPrayerEditorCardComponent', () => {
  let component: AdminPrayerEditorCardComponent;

  beforeEach(() => {
    component = new AdminPrayerEditorCardComponent();
    component.prayer = {
      id: 'p1',
      title: 'Test',
      requester: 'John',
      email: 'john@example.com',
      status: 'current',
      created_at: '2024-01-01',
    };
    component.newUpdate = { ...EMPTY_PRAYER_EDITOR_NEW_UPDATE };
  });

  it('onAddUpdateSubscriberSelected fills newUpdate and emits action', () => {
    const action = vi.fn();
    component.action.subscribe(action);

    component.onAddUpdateSubscriberSelected({
      name: 'Jane Q Public',
      email: 'jane@example.com',
    });

    expect(component.newUpdate.firstName).toBe('Jane');
    expect(component.newUpdate.lastName).toBe('Q Public');
    expect(component.newUpdate.author_email).toBe('jane@example.com');
    expect(action).toHaveBeenCalledWith({
      type: 'addUpdateSubscriberSelected',
      row: { name: 'Jane Q Public', email: 'jane@example.com' },
    });
  });

  describe('template layout', () => {
    it('truncates long Basic Information values instead of overflowing the card', async () => {
      const { readFileSync } = await import('node:fs');
      const { join } = await import('node:path');
      const source = readFileSync(
        join(__dirname, 'admin-prayer-editor-card-view-details.component.html'),
        'utf8',
      );
      const basicInfoBlock = source.slice(
        source.indexOf('<!-- Basic Information -->'),
        source.indexOf('<!-- Status Information -->'),
      );

      expect(basicInfoBlock).toContain('min-w-0 truncate');
      expect(basicInfoBlock).toContain('[title]="card.prayer.email"');
      expect(basicInfoBlock).toContain('overflow-hidden');
    });
  });
});
