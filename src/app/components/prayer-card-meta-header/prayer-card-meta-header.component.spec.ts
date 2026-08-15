import { describe, it, expect } from 'vitest';
import { PrayerCardMetaHeaderComponent } from './prayer-card-meta-header.component';

describe('PrayerCardMetaHeaderComponent overflow items', () => {
  it('includes reminder, answered, edit, and delete for a personal card', () => {
    const component = new PrayerCardMetaHeaderComponent();
    component.prayerCreatedAt = '2026-01-01T00:00:00Z';
    component.isPersonal = true;
    component.showReminder = true;
    component.hasReminder = false;
    component.showDelete = true;
    component.category = 'Health';
    component.reminderBellTourId = 'tour-prayer-reminder-bell';
    component.personalAnsweredTourId = 'tour-walkthrough-personal-answered';
    component.personalEditTourId = 'tour-walkthrough-personal-edit';
    component.personalDeleteTourId = 'tour-walkthrough-personal-delete';

    expect(component.overflowItems.map((item) => item.id)).toEqual([
      'reminder',
      'answered',
      'edit',
      'delete',
    ]);
    expect(component.overflowItems[0]?.tourAnchorId).toBe(
      'tour-prayer-reminder-bell'
    );
    expect(component.overflowItems[1]?.tourAnchorId).toBe(
      'tour-walkthrough-personal-answered'
    );
    expect(component.overflowItems[2]?.tourAnchorId).toBe(
      'tour-walkthrough-personal-edit'
    );
    expect(component.overflowItems[3]?.tourAnchorId).toBe(
      'tour-walkthrough-personal-delete'
    );
  });

  it('runs the matching action from overflow item onSelect', () => {
    const component = new PrayerCardMetaHeaderComponent();
    const emitted: string[] = [];
    component.edit.subscribe(() => emitted.push('edit'));
    component.delete.subscribe(() => emitted.push('delete'));
    component.reminder.subscribe(() => emitted.push('reminder'));
    component.toggleAnswered.subscribe(() => emitted.push('answered'));
    component.isPersonal = true;
    component.showReminder = true;
    component.showDelete = true;
    component.prayerCreatedAt = '2026-01-01T00:00:00Z';

    for (const item of component.overflowItems) {
      item.onSelect();
    }
    expect(emitted).toEqual(['reminder', 'answered', 'edit', 'delete']);
  });
});
