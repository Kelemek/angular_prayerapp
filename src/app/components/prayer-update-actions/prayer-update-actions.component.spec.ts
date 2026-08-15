import { describe, it, expect } from 'vitest';
import { PrayerUpdateActionsComponent } from './prayer-update-actions.component';

describe('PrayerUpdateActionsComponent', () => {
  it('builds personal edit and delete overflow items', () => {
    const component = new PrayerUpdateActionsComponent();
    component.bandSize = 'sm';
    component.mode = 'personal';
    component.showDelete = true;
    component.update = {
      id: 'u1',
      content: 'Test',
      created_at: '2024-01-01T00:00:00Z',
    };

    expect(component.overflowItems.map((item) => item.id)).toEqual([
      'edit',
      'delete',
    ]);
  });

  it('includes answered and edit for member updates', () => {
    const component = new PrayerUpdateActionsComponent();
    component.mode = 'member';
    component.update = {
      id: 'u1',
      content: 'Test',
      created_at: '2024-01-01T00:00:00Z',
      is_answered: false,
    };

    expect(component.overflowItems.map((item) => item.id)).toEqual([
      'answered',
      'edit',
    ]);
  });

  it('hides actions when readonly with no delete', () => {
    const component = new PrayerUpdateActionsComponent();
    component.mode = 'readonly';
    component.showDelete = false;
    component.update = {
      id: 'u1',
      content: 'Test',
      created_at: '2024-01-01T00:00:00Z',
    };

    expect(component.overflowItems).toEqual([]);
  });

  it('runs the matching action from overflow item onSelect', () => {
    const component = new PrayerUpdateActionsComponent();
    const emitted: string[] = [];
    component.edit.subscribe(() => emitted.push('edit'));
    component.delete.subscribe(() => emitted.push('delete'));
    component.toggleAnswered.subscribe(() => emitted.push('answered'));
    component.mode = 'member';
    component.showDelete = true;
    component.update = {
      id: 'u1',
      content: 'Test',
      created_at: '2024-01-01T00:00:00Z',
      is_answered: false,
    };

    for (const item of component.overflowItems) {
      item.onSelect();
    }
    expect(emitted).toEqual(['answered', 'edit', 'delete']);
  });
});
