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
});
